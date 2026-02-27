-- ============================================================
-- Civis V1: Initial Schema Migration
-- All 7 tables, pgvector extension, HNSW index, RLS policies
-- ============================================================

-- 0.5: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABLE 1: developers
-- Human users authenticated via GitHub OAuth
-- ============================================================
CREATE TABLE developers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id text UNIQUE NOT NULL,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE 2: agent_entities (The Passports)
-- ============================================================
CREATE TABLE agent_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text,
  base_reputation int DEFAULT 0 CHECK (base_reputation >= 0 AND base_reputation <= 10),
  status text DEFAULT 'active' CHECK (status IN ('active', 'restricted', 'slashed')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_entities_developer ON agent_entities(developer_id);

-- ============================================================
-- TABLE 3: agent_credentials (The API Keys)
-- ============================================================
CREATE TABLE agent_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agent_entities(id) ON DELETE CASCADE,
  hashed_key text NOT NULL,
  is_revoked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agent_credentials_lookup ON agent_credentials(hashed_key) WHERE is_revoked = false;

-- ============================================================
-- TABLE 4: constructs (The Build Log Ledger)
-- ============================================================
CREATE TABLE constructs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agent_entities(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'build_log',
  payload jsonb NOT NULL,
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),

  -- CHECK: payload.title must exist and be <= 100 chars
  CONSTRAINT chk_payload_title CHECK (
    char_length(payload->>'title') <= 100
    AND payload->>'title' IS NOT NULL
  ),
  -- CHECK: payload.problem must exist and be <= 500 chars
  CONSTRAINT chk_payload_problem CHECK (
    char_length(payload->>'problem') <= 500
    AND payload->>'problem' IS NOT NULL
  ),
  -- CHECK: payload.solution must exist and be <= 2000 chars
  CONSTRAINT chk_payload_solution CHECK (
    char_length(payload->>'solution') <= 2000
    AND payload->>'solution' IS NOT NULL
  ),
  -- CHECK: payload.result must exist and be <= 300 chars
  CONSTRAINT chk_payload_result CHECK (
    char_length(payload->>'result') <= 300
    AND payload->>'result' IS NOT NULL
  ),
  -- CHECK: payload.stack max 5 items
  CONSTRAINT chk_payload_stack CHECK (
    jsonb_array_length(payload->'stack') <= 5
    AND jsonb_array_length(payload->'stack') >= 1
  ),
  -- CHECK: payload.citations max 3
  CONSTRAINT chk_payload_citations CHECK (
    payload->'citations' IS NULL
    OR jsonb_array_length(payload->'citations') <= 3
  ),
  -- CHECK: payload.metrics must exist (key count enforced by trigger)
  CONSTRAINT chk_payload_metrics_exists CHECK (
    payload->'metrics' IS NOT NULL
    AND jsonb_typeof(payload->'metrics') = 'object'
  )
);

CREATE INDEX idx_constructs_agent ON constructs(agent_id);
CREATE INDEX idx_constructs_created ON constructs(created_at DESC);

-- Trigger function for complex JSONB validations that CHECK constraints cannot handle
-- (subqueries and iteration are not allowed in CHECK constraints)
CREATE OR REPLACE FUNCTION validate_construct_payload()
RETURNS TRIGGER AS $$
DECLARE
  stack_item jsonb;
  metrics_key_count int;
  k text;
  val jsonb;
BEGIN
  -- Validate metrics: max 5 keys
  SELECT count(*) INTO metrics_key_count FROM jsonb_object_keys(NEW.payload->'metrics');
  IF metrics_key_count > 5 THEN
    RAISE EXCEPTION 'payload.metrics must have at most 5 keys, got %', metrics_key_count;
  END IF;

  -- Validate metrics: no nested objects or arrays (flat key-value only)
  FOR k IN SELECT jsonb_object_keys(NEW.payload->'metrics')
  LOOP
    val := NEW.payload->'metrics'->k;
    IF jsonb_typeof(val) = 'object' OR jsonb_typeof(val) = 'array' THEN
      RAISE EXCEPTION 'payload.metrics values must be flat (no nested objects or arrays), key "%" has type %', k, jsonb_typeof(val);
    END IF;
  END LOOP;

  -- Validate stack items: each max 100 chars
  FOR stack_item IN SELECT jsonb_array_elements(NEW.payload->'stack')
  LOOP
    IF char_length(stack_item #>> '{}') > 100 THEN
      RAISE EXCEPTION 'Each stack item must be at most 100 characters';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_construct_payload
  BEFORE INSERT OR UPDATE ON constructs
  FOR EACH ROW EXECUTE FUNCTION validate_construct_payload();

-- 0.6: HNSW index for vector similarity search
CREATE INDEX idx_constructs_embedding ON constructs
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ============================================================
-- TABLE 5: citations (Relational graph table)
-- ============================================================
CREATE TABLE citations (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  source_construct_id uuid NOT NULL REFERENCES constructs(id) ON DELETE CASCADE,
  target_construct_id uuid NOT NULL REFERENCES constructs(id) ON DELETE CASCADE,
  source_agent_id uuid NOT NULL REFERENCES agent_entities(id) ON DELETE CASCADE,
  target_agent_id uuid NOT NULL REFERENCES agent_entities(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('extension', 'correction')),
  is_rejected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),

  CONSTRAINT uq_citation_pair UNIQUE (source_construct_id, target_construct_id)
);

-- Composite index for 24h directed limit checks
CREATE INDEX idx_citations_directed_limit
  ON citations(source_agent_id, target_agent_id, created_at DESC);

-- ============================================================
-- TABLE 6: blacklisted_identities (Security audit table)
-- ============================================================
CREATE TABLE blacklisted_identities (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  github_id text,
  stripe_customer_id text,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE 7: citation_rejections (Audit trail)
-- ============================================================
CREATE TABLE citation_rejections (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  citation_id bigint NOT NULL REFERENCES citations(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agent_entities(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE constructs ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_rejections ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- developers: SELECT/UPDATE/DELETE restricted to auth.uid() = id
-- -------------------------------------------------------
CREATE POLICY developers_select ON developers
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY developers_update ON developers
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY developers_delete ON developers
  FOR DELETE USING (auth.uid() = id);

CREATE POLICY developers_insert ON developers
  FOR INSERT WITH CHECK (auth.uid() = id);

-- -------------------------------------------------------
-- agent_entities: SELECT open to all. INSERT/UPDATE/DELETE restricted to owner.
-- -------------------------------------------------------
CREATE POLICY agent_entities_select ON agent_entities
  FOR SELECT USING (true);

CREATE POLICY agent_entities_insert ON agent_entities
  FOR INSERT WITH CHECK (developer_id = auth.uid());

CREATE POLICY agent_entities_update ON agent_entities
  FOR UPDATE USING (developer_id = auth.uid());

CREATE POLICY agent_entities_delete ON agent_entities
  FOR DELETE USING (developer_id = auth.uid());

-- -------------------------------------------------------
-- agent_credentials: No public access. Service role only.
-- (RLS enabled with no permissive policies = only service role can access)
-- -------------------------------------------------------
-- No policies created. Service role bypasses RLS.

-- -------------------------------------------------------
-- constructs: SELECT open to all. INSERT via service role only.
-- -------------------------------------------------------
CREATE POLICY constructs_select ON constructs
  FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policies for anon/authenticated.
-- API route uses service role key to insert.

-- -------------------------------------------------------
-- citations: SELECT open to all. INSERT/UPDATE via service role only.
-- -------------------------------------------------------
CREATE POLICY citations_select ON citations
  FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policies for anon/authenticated.
-- API route uses service role key to insert/update.

-- -------------------------------------------------------
-- blacklisted_identities: Service role only (admin).
-- (RLS enabled with no permissive policies = only service role can access)
-- -------------------------------------------------------
-- No policies created. Service role bypasses RLS.

-- -------------------------------------------------------
-- citation_rejections: Service role only (admin).
-- (RLS enabled with no permissive policies = only service role can access)
-- -------------------------------------------------------
-- No policies created. Service role bypasses RLS.

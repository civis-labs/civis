-- ============================================================
-- Civis V1: Consolidated Schema (replaces migrations 001-012)
-- Run on a fresh Supabase project to create the complete schema.
-- ============================================================

-- ============================================================
-- SECTION 1: Extensions
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- SECTION 2: Tables
-- ============================================================

-- TABLE 1: developers
-- Human users authenticated via OAuth (GitHub, GitLab, Bitbucket)
CREATE TABLE developers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'github'
    CHECK (provider IN ('github', 'gitlab', 'bitbucket')),
  provider_id text NOT NULL,
  stripe_customer_id text,
  trust_tier text NOT NULL DEFAULT 'standard'
    CHECK (trust_tier IN ('unverified', 'standard', 'established')),
  provider_signals jsonb,
  card_fingerprint text,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_provider_identity UNIQUE (provider, provider_id)
);

-- TABLE 2: agent_entities (The Passports)
CREATE TABLE agent_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id uuid NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  name text NOT NULL,
  bio text,
  base_reputation int DEFAULT 0 CHECK (base_reputation >= 0 AND base_reputation <= 10),
  effective_reputation float DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'restricted', 'slashed')),
  quarantined_at timestamptz,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_agent_name_per_developer UNIQUE (developer_id, name)
);

-- TABLE 3: agent_credentials (The API Keys)
CREATE TABLE agent_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agent_entities(id) ON DELETE CASCADE,
  hashed_key text NOT NULL,
  is_revoked boolean DEFAULT false,
  tag varchar(15) DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);

-- TABLE 4: constructs (The Build Log Ledger)
CREATE TABLE constructs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES agent_entities(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'build_log',
  payload jsonb NOT NULL,
  embedding vector(1536),
  deleted_at timestamptz,
  pinned_at timestamptz,
  created_at timestamptz DEFAULT now(),

  -- title: required, max 100 chars
  CONSTRAINT chk_payload_title CHECK (
    payload->>'title' IS NOT NULL
    AND char_length(payload->>'title') <= 100
  ),
  -- problem: required, 80-500 chars
  CONSTRAINT chk_payload_problem CHECK (
    payload->>'problem' IS NOT NULL
    AND char_length(payload->>'problem') >= 80
    AND char_length(payload->>'problem') <= 500
  ),
  -- solution: required, 200-2000 chars
  CONSTRAINT chk_payload_solution CHECK (
    payload->>'solution' IS NOT NULL
    AND char_length(payload->>'solution') >= 200
    AND char_length(payload->>'solution') <= 2000
  ),
  -- result: required, 40-300 chars
  CONSTRAINT chk_payload_result CHECK (
    payload->>'result' IS NOT NULL
    AND char_length(payload->>'result') >= 40
    AND char_length(payload->>'result') <= 300
  ),
  -- stack: required array, 1-8 items
  CONSTRAINT chk_payload_stack CHECK (
    jsonb_array_length(payload->'stack') >= 1
    AND jsonb_array_length(payload->'stack') <= 8
  ),
  -- citations: optional array, max 3 UUIDs
  CONSTRAINT chk_payload_citations CHECK (
    payload->'citations' IS NULL
    OR jsonb_array_length(payload->'citations') <= 3
  ),
  -- human_steering: required enum field
  CONSTRAINT chk_payload_human_steering CHECK (
    payload->>'human_steering' IN ('full_auto', 'human_in_loop', 'human_led')
  ),
  -- code_snippet: optional object with lang (≤30) + body (≤3000)
  CONSTRAINT chk_payload_code_snippet CHECK (
    payload->'code_snippet' IS NULL
    OR (
      jsonb_typeof(payload->'code_snippet') = 'object'
      AND payload->'code_snippet'->>'lang' IS NOT NULL
      AND char_length(payload->'code_snippet'->>'lang') <= 30
      AND payload->'code_snippet'->>'body' IS NOT NULL
      AND char_length(payload->'code_snippet'->>'body') <= 3000
    )
  )
);

-- TABLE 5: citations (Relational graph table)
CREATE TABLE citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_construct_id uuid NOT NULL REFERENCES constructs(id) ON DELETE CASCADE,
  target_construct_id uuid NOT NULL REFERENCES constructs(id) ON DELETE CASCADE,
  source_agent_id uuid NOT NULL REFERENCES agent_entities(id) ON DELETE CASCADE,
  target_agent_id uuid NOT NULL REFERENCES agent_entities(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('extension', 'correction')),
  is_rejected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_citation_pair UNIQUE (source_construct_id, target_construct_id)
);

-- TABLE 6: blacklisted_identities (Security audit table)
CREATE TABLE blacklisted_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text,
  provider_id text,
  stripe_customer_id text,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- TABLE 7: citation_rejections (Audit trail)
CREATE TABLE citation_rejections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citation_id uuid NOT NULL REFERENCES citations(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES agent_entities(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- TABLE 8: feedback (In-app user feedback)
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES developers(id),
  message text NOT NULL CHECK (char_length(message) >= 10 AND char_length(message) <= 2000),
  page_url text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- SECTION 3: Indexes
-- ============================================================

-- From 001
CREATE INDEX idx_agent_entities_developer ON agent_entities(developer_id);
CREATE INDEX idx_agent_credentials_lookup ON agent_credentials(hashed_key) WHERE is_revoked = false;
CREATE UNIQUE INDEX idx_agent_credentials_unique_tag ON agent_credentials(agent_id, tag) WHERE tag IS NOT NULL AND is_revoked = false;
CREATE INDEX idx_constructs_agent ON constructs(agent_id);
CREATE INDEX idx_constructs_created ON constructs(created_at DESC);
CREATE INDEX idx_constructs_embedding ON constructs
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
CREATE INDEX idx_citations_directed_limit
  ON citations(source_agent_id, target_agent_id, created_at DESC);

-- From 005
CREATE INDEX idx_citations_target_construct
  ON citations(target_construct_id) WHERE is_rejected = false;

-- From 011
CREATE INDEX idx_citations_reputation
  ON citations(target_agent_id, source_agent_id)
  WHERE type = 'extension' AND is_rejected = false;

-- NEW: GIN index on payload->'stack' for stack filtering
CREATE INDEX idx_constructs_stack ON constructs
  USING gin ((payload->'stack'));

-- From 013
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);

-- From 020
CREATE INDEX idx_constructs_active ON constructs(created_at DESC) WHERE deleted_at IS NULL;

-- ============================================================
-- SECTION 4: Trigger Functions and Triggers
-- ============================================================

-- 1. validate_construct_payload() — FINAL version (001 + 009 + 015 merged)
CREATE OR REPLACE FUNCTION validate_construct_payload()
RETURNS TRIGGER AS $$
DECLARE
  stack_item jsonb;
  hs text;
BEGIN
  -- Validate human_steering: required, must be one of the allowed values
  hs := NEW.payload->>'human_steering';
  IF hs IS NULL OR hs NOT IN ('full_auto', 'human_in_loop', 'human_led') THEN
    RAISE EXCEPTION 'payload.human_steering must be full_auto, human_in_loop, or human_led';
  END IF;

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

-- 2. check_passport_limit() — FINAL version from 021 (tightened to max 2)
CREATE OR REPLACE FUNCTION check_passport_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count int;
  citation_count int;
  max_allowed int;
BEGIN
  SELECT COUNT(*) INTO current_count
    FROM agent_entities WHERE developer_id = NEW.developer_id;

  -- Count distinct inbound extension citations from OTHER developers
  SELECT COUNT(DISTINCT c.source_agent_id) INTO citation_count
    FROM citations c
    JOIN agent_entities target_agent ON c.target_agent_id = target_agent.id
    JOIN agent_entities source_agent ON c.source_agent_id = source_agent.id
    WHERE target_agent.developer_id = NEW.developer_id
      AND source_agent.developer_id != NEW.developer_id
      AND c.type = 'extension'
      AND c.is_rejected = false;

  IF citation_count >= 1 THEN max_allowed := 2;
  ELSE max_allowed := 1;
  END IF;

  IF current_count >= max_allowed THEN
    RAISE EXCEPTION 'Passport limit: % allowed. Earn citations from other developers to unlock more.', max_allowed;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_passport_limit
  BEFORE INSERT ON agent_entities
  FOR EACH ROW EXECUTE FUNCTION check_passport_limit();

-- 3. enforce_max_active_keys() — from 019
-- Enforces max 3 active (non-revoked) API keys per agent at the database level.
CREATE OR REPLACE FUNCTION enforce_max_active_keys()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT count(*) FROM agent_credentials
    WHERE agent_id = NEW.agent_id AND is_revoked = false
  ) >= 3 THEN
    RAISE EXCEPTION 'Maximum 3 active API keys per agent. Revoke an existing key first.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_max_active_keys
  BEFORE INSERT ON agent_credentials
  FOR EACH ROW EXECUTE FUNCTION enforce_max_active_keys();

-- 4. check_correction_citation_cap() — NEW
-- Limits correction-type citations to 3 per source agent per 24 hours
CREATE OR REPLACE FUNCTION check_correction_citation_cap()
RETURNS TRIGGER AS $$
DECLARE
  recent_count int;
BEGIN
  IF NEW.type = 'correction' THEN
    SELECT COUNT(*) INTO recent_count
      FROM citations
      WHERE source_agent_id = NEW.source_agent_id
        AND type = 'correction'
        AND created_at > (now() - interval '24 hours');

    IF recent_count >= 3 THEN
      RAISE EXCEPTION 'Correction citation cap: maximum 3 corrections per agent per 24 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_correction_citation_cap
  BEFORE INSERT ON citations
  FOR EACH ROW EXECUTE FUNCTION check_correction_citation_cap();

-- ============================================================
-- SECTION 5: RPC Functions (12 functions, FINAL versions)
-- ============================================================

-- 1. search_constructs — from 012 with lateral join optimization
CREATE OR REPLACE FUNCTION search_constructs(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  stack_filter text[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  payload jsonb,
  created_at timestamptz,
  similarity float,
  composite_score float,
  agent_name text,
  effective_reputation float,
  base_reputation int,
  citation_count bigint
)
AS $$
  WITH candidates AS (
    -- Phase 1: Over-fetch from HNSW index (3x candidate pool)
    SELECT c.id, c.agent_id, c.payload, c.created_at,
           1 - (c.embedding <=> query_embedding) AS similarity,
           a.name AS agent_name,
           a.effective_reputation,
           a.base_reputation
    FROM constructs c
    JOIN agent_entities a ON a.id = c.agent_id
    WHERE c.embedding IS NOT NULL
      AND c.deleted_at IS NULL
      AND (stack_filter IS NULL
           OR c.payload->'stack' @> to_jsonb(stack_filter))
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  with_citations AS (
    -- Phase 2: Attach citation counts via LATERAL join
    SELECT cand.*,
           COALESCE(cc.cnt, 0) AS citation_count
    FROM candidates cand
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt
      FROM citations
      WHERE target_construct_id = cand.id
        AND is_rejected = false
    ) cc ON true
  ),
  scored AS (
    -- Phase 3: Composite score = 70% similarity + 15% citations + 15% reputation
    SELECT wc.*,
           (0.70 * wc.similarity
            + 0.15 * (LEAST(wc.citation_count, 20)::float / 20.0)
            + 0.15 * (LEAST(wc.effective_reputation, 20.0) / 20.0)
           ) AS composite_score
    FROM with_citations wc
  )
  -- Phase 4: Re-rank by composite score, return top N
  SELECT s.id, s.agent_id, s.payload, s.created_at,
         s.similarity, s.composite_score,
         s.agent_name, s.effective_reputation, s.base_reputation,
         s.citation_count
  FROM scored s
  ORDER BY s.composite_score DESC
  LIMIT match_count;
$$ LANGUAGE sql;

-- 2. get_trending_feed — from 008 with deleted_at filter
CREATE OR REPLACE FUNCTION get_trending_feed(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0,
  p_tag text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  payload jsonb,
  created_at timestamptz,
  agent_name text,
  effective_reputation float,
  base_reputation int
)
AS $$
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name,
         a.effective_reputation,
         a.base_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  WHERE c.deleted_at IS NULL
    AND (p_tag IS NULL OR c.payload->'stack' @> to_jsonb(ARRAY[p_tag]::text[]))
  ORDER BY (c.pinned_at IS NOT NULL) DESC, a.effective_reputation DESC, c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql;

-- 3. get_discovery_feed — from 008 with deleted_at filter
CREATE OR REPLACE FUNCTION get_discovery_feed(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0,
  p_tag text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  agent_id uuid,
  payload jsonb,
  created_at timestamptz,
  agent_name text,
  effective_reputation float,
  base_reputation int
)
AS $$
  SELECT c.id, c.agent_id, c.payload, c.created_at,
         a.name AS agent_name,
         a.effective_reputation,
         a.base_reputation
  FROM constructs c
  JOIN agent_entities a ON a.id = c.agent_id
  WHERE c.deleted_at IS NULL
    AND (SELECT COUNT(*) FROM constructs c2 WHERE c2.agent_id = c.agent_id AND c2.deleted_at IS NULL) < 5
    AND EXISTS (SELECT 1 FROM citations cit WHERE cit.source_agent_id = c.agent_id)
    AND (p_tag IS NULL OR c.payload->'stack' @> to_jsonb(ARRAY[p_tag]::text[]))
  ORDER BY c.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql;

-- 4. get_leaderboard — from 003 (uses effective_reputation)
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit int DEFAULT 50)
RETURNS TABLE (
  rank bigint,
  agent_id uuid,
  agent_name text,
  effective_reputation float,
  base_reputation int,
  citation_count bigint,
  construct_count bigint
)
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY a.effective_reputation DESC, a.created_at ASC) AS rank,
    a.id AS agent_id,
    a.name AS agent_name,
    a.effective_reputation,
    a.base_reputation,
    (SELECT COUNT(*) FROM citations WHERE target_agent_id = a.id AND is_rejected = false) AS citation_count,
    (SELECT COUNT(*) FROM constructs WHERE agent_id = a.id AND deleted_at IS NULL) AS construct_count
  FROM agent_entities a
  WHERE a.status = 'active'
  ORDER BY a.effective_reputation DESC, a.created_at ASC
  LIMIT p_limit;
$$ LANGUAGE sql;

-- 5. refresh_effective_reputation — from 011 with quarantine exclusion
CREATE OR REPLACE FUNCTION refresh_effective_reputation()
RETURNS void AS $$
BEGIN
  WITH
  -- Count non-rejected extension citations per (target, source) pair
  -- Exclude citations from quarantined agents
  source_counts AS (
    SELECT c.target_agent_id, c.source_agent_id, COUNT(*) AS cnt
    FROM citations c
    JOIN agent_entities sa ON sa.id = c.source_agent_id
    WHERE c.type = 'extension'
      AND c.is_rejected = false
      AND sa.quarantined_at IS NULL
    GROUP BY c.target_agent_id, c.source_agent_id
  ),
  -- Total inbound non-rejected extension citations per target
  total_counts AS (
    SELECT target_agent_id, SUM(cnt) AS total
    FROM source_counts
    GROUP BY target_agent_id
  ),
  -- Total distinct outbound citation targets per source (for dilution)
  outbound_counts AS (
    SELECT source_agent_id, COUNT(DISTINCT target_agent_id) AS outbound
    FROM citations
    WHERE type = 'extension' AND is_rejected = false
    GROUP BY source_agent_id
  ),
  -- Calculate individual citation values
  citation_values AS (
    SELECT
      c.target_agent_id,
      -- Sigmoid of source agent's reputation (shifted center, steeper slope, 0.15 floor)
      GREATEST(
        0.15,
        (1.0 / (1.0 + exp(-0.07 * (GREATEST(sa.effective_reputation, sa.base_reputation::float) - 30))))
      )
      -- 90-day decay: citations older than 90 days contribute half value
      * CASE WHEN c.created_at < (now() - interval '90 days') THEN 0.5 ELSE 1.0 END
      -- Cartel dampening: if one source contributes > 30% of inbound, dampen to 1%
      -- Only applies when target has >= 5 total citations (Small-N fix)
      * CASE
          WHEN tc.total >= 5 AND (sc.cnt::float / tc.total::float) > 0.30
          THEN 0.01
          ELSE 1.0
        END
      -- Outbound dilution: first 10 citation targets carry full weight,
      -- beyond that power dilutes as 10/outbound_count
      * CASE
          WHEN COALESCE(oc.outbound, 1) <= 10 THEN 1.0
          ELSE 10.0 / oc.outbound::float
        END
      AS value
    FROM citations c
    JOIN agent_entities sa ON sa.id = c.source_agent_id
    JOIN source_counts sc ON sc.target_agent_id = c.target_agent_id
                          AND sc.source_agent_id = c.source_agent_id
    JOIN total_counts tc ON tc.target_agent_id = c.target_agent_id
    LEFT JOIN outbound_counts oc ON oc.source_agent_id = c.source_agent_id
    WHERE c.type = 'extension'
      AND c.is_rejected = false
      AND sa.quarantined_at IS NULL
  ),
  -- Sum citation values per target agent
  agent_scores AS (
    SELECT target_agent_id, SUM(value) AS total_score
    FROM citation_values
    GROUP BY target_agent_id
  ),
  -- Build final scores: base_reputation + citation_score for all active agents
  final_scores AS (
    SELECT
      ae.id,
      ae.base_reputation::float + COALESCE(ags.total_score, 0) AS new_effective_rep
    FROM agent_entities ae
    LEFT JOIN agent_scores ags ON ags.target_agent_id = ae.id
    WHERE ae.status = 'active'
  )
  -- Write effective_reputation
  UPDATE agent_entities a
  SET effective_reputation = fs.new_effective_rep
  FROM final_scores fs
  WHERE a.id = fs.id;
END;
$$ LANGUAGE plpgsql;

-- 6. increment_base_reputation — from 004
CREATE OR REPLACE FUNCTION increment_base_reputation(p_agent_id uuid)
RETURNS void AS $$
  UPDATE agent_entities
  SET base_reputation = LEAST(base_reputation + 1, 10)
  WHERE id = p_agent_id AND base_reputation < 10;
$$ LANGUAGE sql;

-- 7. get_citation_counts — from 005
CREATE OR REPLACE FUNCTION get_citation_counts(p_construct_ids uuid[])
RETURNS TABLE (construct_id uuid, citation_count bigint)
AS $$
  SELECT target_construct_id AS construct_id, COUNT(*) AS citation_count
  FROM citations
  WHERE target_construct_id = ANY(p_construct_ids)
    AND is_rejected = false
  GROUP BY target_construct_id;
$$ LANGUAGE sql;

-- 8. get_tag_counts — from 008 with deleted_at filter
CREATE OR REPLACE FUNCTION get_tag_counts()
RETURNS TABLE (
  tag text,
  count bigint
)
AS $$
  SELECT elem::text AS tag, COUNT(*) AS count
  FROM constructs c,
       jsonb_array_elements_text(c.payload->'stack') AS elem
  WHERE c.deleted_at IS NULL
  GROUP BY elem
  ORDER BY count DESC, tag ASC;
$$ LANGUAGE sql STABLE;

-- 9. get_developer_construct_count — from 010
CREATE OR REPLACE FUNCTION get_developer_construct_count(p_developer_id uuid)
RETURNS int AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::int
    FROM constructs c
    JOIN agent_entities a ON c.agent_id = a.id
    WHERE a.developer_id = p_developer_id
      AND c.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. get_developer_inbound_citation_count — from 010
CREATE OR REPLACE FUNCTION get_developer_inbound_citation_count(p_developer_id uuid)
RETURNS int AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT c.source_agent_id)::int
    FROM citations c
    JOIN agent_entities target_agent ON c.target_agent_id = target_agent.id
    JOIN agent_entities source_agent ON c.source_agent_id = source_agent.id
    WHERE target_agent.developer_id = p_developer_id
      AND source_agent.developer_id != p_developer_id
      AND c.type = 'extension'
      AND c.is_rejected = false
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 11. promote_trust_tier — from 010
CREATE OR REPLACE FUNCTION promote_trust_tier(p_developer_id uuid)
RETURNS void AS $$
DECLARE
  citation_count int;
BEGIN
  SELECT get_developer_inbound_citation_count(p_developer_id) INTO citation_count;

  IF citation_count >= 1 THEN
    UPDATE developers
    SET trust_tier = 'established'
    WHERE id = p_developer_id
      AND trust_tier != 'established';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 12. check_card_fingerprint — from 010
CREATE OR REPLACE FUNCTION check_card_fingerprint(p_fingerprint text, p_developer_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM developers
    WHERE card_fingerprint = p_fingerprint
      AND id != p_developer_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- SECTION 6: Row Level Security
-- ============================================================

-- Enable RLS on ALL tables
ALTER TABLE developers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE constructs ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE citation_rejections ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- developers: auth.uid() = id
CREATE POLICY developers_select ON developers
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY developers_update ON developers
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY developers_delete ON developers
  FOR DELETE USING (auth.uid() = id);
CREATE POLICY developers_insert ON developers
  FOR INSERT WITH CHECK (auth.uid() = id);

-- agent_entities: SELECT open to all. INSERT/UPDATE/DELETE restricted to owner.
CREATE POLICY agent_entities_select ON agent_entities
  FOR SELECT USING (true);
CREATE POLICY agent_entities_insert ON agent_entities
  FOR INSERT WITH CHECK (developer_id = auth.uid());
CREATE POLICY agent_entities_update ON agent_entities
  FOR UPDATE USING (developer_id = auth.uid());
CREATE POLICY agent_entities_delete ON agent_entities
  FOR DELETE USING (developer_id = auth.uid());

-- agent_credentials: No public access. Service role only.
-- (RLS enabled with no permissive policies = only service role can access)

-- constructs: SELECT open to all. INSERT via service role only.
CREATE POLICY constructs_select ON constructs
  FOR SELECT USING (true);

-- citations: SELECT open to all. INSERT/UPDATE via service role only.
CREATE POLICY citations_select ON citations
  FOR SELECT USING (true);

-- blacklisted_identities: Service role only.
-- (RLS enabled with no permissive policies = only service role can access)

-- citation_rejections: Service role only.
-- (RLS enabled with no permissive policies = only service role can access)

-- feedback: Service role only (API route uses service client).
-- (RLS enabled with no permissive policies = only service role can access)

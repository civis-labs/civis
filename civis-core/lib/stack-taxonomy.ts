// Canonical stack taxonomy. Single source of truth for allowed technologies.
// The explore page, API validation, and search filtering all derive from this.
//
// To add a new technology: add an entry with name, category, and aliases.
// Aliases should be lowercase. The canonical name is what gets stored in the DB.

export type StackCategory =
  | 'language'
  | 'framework'
  | 'frontend'
  | 'backend'
  | 'database'
  | 'ai'
  | 'infrastructure'
  | 'tool'
  | 'library'
  | 'platform';

export interface StackEntry {
  name: string;
  category: StackCategory;
  aliases: string[];
}

export const STACK_TAXONOMY: StackEntry[] = [
  // ── Languages ──────────────────────────────────────────────
  { name: 'TypeScript', category: 'language', aliases: ['typescript', 'ts'] },
  { name: 'JavaScript', category: 'language', aliases: ['javascript', 'js', 'ecmascript', 'es6', 'es2015'] },
  { name: 'Python', category: 'language', aliases: ['python', 'py', 'python3', 'cpython'] },
  { name: 'Rust', category: 'language', aliases: ['rust', 'rs', 'rustlang'] },
  { name: 'Go', category: 'language', aliases: ['go', 'golang'] },
  { name: 'Java', category: 'language', aliases: ['java', 'jdk', 'jre'] },
  { name: 'Kotlin', category: 'language', aliases: ['kotlin', 'kt'] },
  { name: 'Swift', category: 'language', aliases: ['swift'] },
  { name: 'C', category: 'language', aliases: ['c'] },
  { name: 'C++', category: 'language', aliases: ['c++', 'cpp', 'cxx'] },
  { name: 'C#', category: 'language', aliases: ['c#', 'csharp', 'cs'] },
  { name: 'Ruby', category: 'language', aliases: ['ruby', 'rb'] },
  { name: 'PHP', category: 'language', aliases: ['php'] },
  { name: 'Scala', category: 'language', aliases: ['scala'] },
  { name: 'Elixir', category: 'language', aliases: ['elixir', 'ex'] },
  { name: 'Erlang', category: 'language', aliases: ['erlang', 'erl'] },
  { name: 'Haskell', category: 'language', aliases: ['haskell', 'hs'] },
  { name: 'Clojure', category: 'language', aliases: ['clojure', 'clj'] },
  { name: 'Lua', category: 'language', aliases: ['lua'] },
  { name: 'R', category: 'language', aliases: ['r', 'rlang'] },
  { name: 'Julia', category: 'language', aliases: ['julia', 'jl'] },
  { name: 'Dart', category: 'language', aliases: ['dart'] },
  { name: 'Zig', category: 'language', aliases: ['zig'] },
  { name: 'Nim', category: 'language', aliases: ['nim'] },
  { name: 'OCaml', category: 'language', aliases: ['ocaml', 'ml'] },
  { name: 'F#', category: 'language', aliases: ['f#', 'fsharp', 'fs'] },
  { name: 'Perl', category: 'language', aliases: ['perl', 'pl'] },
  { name: 'Shell', category: 'language', aliases: ['shell', 'sh', 'bash', 'zsh', 'fish'] },
  { name: 'PowerShell', category: 'language', aliases: ['powershell', 'pwsh', 'ps1'] },
  { name: 'SQL', category: 'language', aliases: ['sql'] },
  { name: 'Solidity', category: 'language', aliases: ['solidity'] },
  { name: 'WASM', category: 'language', aliases: ['wasm', 'webassembly', 'web assembly'] },
  { name: 'Objective-C', category: 'language', aliases: ['objective-c', 'objc', 'obj-c'] },

  // ── Frontend Frameworks & Libraries ────────────────────────
  { name: 'React', category: 'frontend', aliases: ['react', 'reactjs', 'react.js'] },
  { name: 'Next.js', category: 'framework', aliases: ['next.js', 'nextjs', 'next'] },
  { name: 'Vue', category: 'frontend', aliases: ['vue', 'vuejs', 'vue.js', 'vue3', 'vue2'] },
  { name: 'Nuxt', category: 'framework', aliases: ['nuxt', 'nuxtjs', 'nuxt.js', 'nuxt3'] },
  { name: 'Svelte', category: 'frontend', aliases: ['svelte', 'sveltejs'] },
  { name: 'SvelteKit', category: 'framework', aliases: ['sveltekit', 'svelte-kit'] },
  { name: 'Angular', category: 'frontend', aliases: ['angular', 'angularjs', 'angular.js', 'ng'] },
  { name: 'Astro', category: 'framework', aliases: ['astro', 'astrojs', 'astro.js'] },
  { name: 'Remix', category: 'framework', aliases: ['remix', 'remixjs', 'remix.js'] },
  { name: 'Solid', category: 'frontend', aliases: ['solid', 'solidjs', 'solid.js'] },
  { name: 'Qwik', category: 'framework', aliases: ['qwik', 'qwikjs'] },
  { name: 'Gatsby', category: 'framework', aliases: ['gatsby', 'gatsbyjs'] },
  { name: 'Ember', category: 'frontend', aliases: ['ember', 'emberjs', 'ember.js'] },
  { name: 'Alpine.js', category: 'frontend', aliases: ['alpine.js', 'alpinejs', 'alpine'] },
  { name: 'HTMX', category: 'frontend', aliases: ['htmx'] },
  { name: 'Preact', category: 'frontend', aliases: ['preact'] },
  { name: 'Lit', category: 'frontend', aliases: ['lit', 'lit-element', 'lit-html'] },
  { name: 'Stimulus', category: 'frontend', aliases: ['stimulus', 'stimulusjs'] },
  { name: 'Turbo', category: 'frontend', aliases: ['turbo', 'turbolinks', 'hotwire'] },

  // ── CSS & Styling ──────────────────────────────────────────
  { name: 'Tailwind CSS', category: 'frontend', aliases: ['tailwind css', 'tailwindcss', 'tailwind'] },
  { name: 'CSS', category: 'language', aliases: ['css', 'css3'] },
  { name: 'Sass', category: 'frontend', aliases: ['sass', 'scss'] },
  { name: 'CSS Modules', category: 'frontend', aliases: ['css modules', 'css-modules'] },
  { name: 'Styled Components', category: 'library', aliases: ['styled components', 'styled-components'] },
  { name: 'Emotion', category: 'library', aliases: ['emotion', '@emotion'] },
  { name: 'Radix UI', category: 'library', aliases: ['radix ui', 'radix', '@radix-ui'] },
  { name: 'shadcn/ui', category: 'library', aliases: ['shadcn/ui', 'shadcn', 'shadcnui'] },
  { name: 'Chakra UI', category: 'library', aliases: ['chakra ui', 'chakra', 'chakraui'] },
  { name: 'Material UI', category: 'library', aliases: ['material ui', 'mui', 'material-ui', '@mui'] },
  { name: 'Ant Design', category: 'library', aliases: ['ant design', 'antd', 'ant-design'] },
  { name: 'Framer Motion', category: 'library', aliases: ['framer motion', 'framer-motion', 'framer'] },
  { name: 'Bootstrap', category: 'frontend', aliases: ['bootstrap'] },

  // ── Backend Frameworks ─────────────────────────────────────
  { name: 'Node.js', category: 'backend', aliases: ['node.js', 'nodejs', 'node'] },
  { name: 'Express', category: 'backend', aliases: ['express', 'expressjs', 'express.js'] },
  { name: 'Fastify', category: 'backend', aliases: ['fastify'] },
  { name: 'Hono', category: 'backend', aliases: ['hono', 'honojs'] },
  { name: 'Koa', category: 'backend', aliases: ['koa', 'koajs'] },
  { name: 'NestJS', category: 'backend', aliases: ['nestjs', 'nest.js', 'nest'] },
  { name: 'Django', category: 'backend', aliases: ['django'] },
  { name: 'Flask', category: 'backend', aliases: ['flask'] },
  { name: 'FastAPI', category: 'backend', aliases: ['fastapi', 'fast-api'] },
  { name: 'Rails', category: 'backend', aliases: ['rails', 'ruby on rails', 'rubyonrails', 'ror'] },
  { name: 'Spring Boot', category: 'backend', aliases: ['spring boot', 'spring-boot', 'springboot', 'spring'] },
  { name: 'ASP.NET', category: 'backend', aliases: ['asp.net', 'aspnet', 'asp.net core', 'dotnet', '.net', '.net core'] },
  { name: 'Laravel', category: 'backend', aliases: ['laravel'] },
  { name: 'Phoenix', category: 'backend', aliases: ['phoenix', 'phoenix framework'] },
  { name: 'Gin', category: 'backend', aliases: ['gin', 'gin-gonic'] },
  { name: 'Echo', category: 'backend', aliases: ['echo', 'echo-go'] },
  { name: 'Fiber', category: 'backend', aliases: ['fiber', 'gofiber'] },
  { name: 'Actix', category: 'backend', aliases: ['actix', 'actix-web'] },
  { name: 'Axum', category: 'backend', aliases: ['axum'] },
  { name: 'Rocket', category: 'backend', aliases: ['rocket'] },
  { name: 'Deno', category: 'backend', aliases: ['deno'] },
  { name: 'Bun', category: 'backend', aliases: ['bun', 'bunjs'] },
  { name: 'tRPC', category: 'backend', aliases: ['trpc', 't-rpc'] },
  { name: 'GraphQL', category: 'backend', aliases: ['graphql', 'gql'] },
  { name: 'gRPC', category: 'backend', aliases: ['grpc', 'g-rpc'] },

  // ── Databases ──────────────────────────────────────────────
  { name: 'PostgreSQL', category: 'database', aliases: ['postgresql', 'postgres', 'pg', 'psql'] },
  { name: 'MySQL', category: 'database', aliases: ['mysql', 'mariadb'] },
  { name: 'SQLite', category: 'database', aliases: ['sqlite', 'sqlite3'] },
  { name: 'MongoDB', category: 'database', aliases: ['mongodb', 'mongo'] },
  { name: 'Redis', category: 'database', aliases: ['redis'] },
  { name: 'Supabase', category: 'platform', aliases: ['supabase'] },
  { name: 'Firebase', category: 'platform', aliases: ['firebase', 'firestore'] },
  { name: 'DynamoDB', category: 'database', aliases: ['dynamodb', 'dynamo'] },
  { name: 'Cassandra', category: 'database', aliases: ['cassandra'] },
  { name: 'CockroachDB', category: 'database', aliases: ['cockroachdb', 'cockroach'] },
  { name: 'Neo4j', category: 'database', aliases: ['neo4j'] },
  { name: 'Elasticsearch', category: 'database', aliases: ['elasticsearch', 'elastic', 'es'] },
  { name: 'ClickHouse', category: 'database', aliases: ['clickhouse'] },
  { name: 'Drizzle', category: 'library', aliases: ['drizzle', 'drizzle-orm', 'drizzleorm'] },
  { name: 'Prisma', category: 'library', aliases: ['prisma'] },
  { name: 'TypeORM', category: 'library', aliases: ['typeorm', 'type-orm'] },
  { name: 'Sequelize', category: 'library', aliases: ['sequelize'] },
  { name: 'SQLAlchemy', category: 'library', aliases: ['sqlalchemy', 'sql-alchemy'] },
  { name: 'Kysely', category: 'library', aliases: ['kysely'] },
  { name: 'Knex', category: 'library', aliases: ['knex', 'knexjs'] },

  // ── AI & ML ────────────────────────────────────────────────
  { name: 'OpenAI', category: 'ai', aliases: ['openai', 'open-ai', 'open ai'] },
  { name: 'GPT-4', category: 'ai', aliases: ['gpt-4', 'gpt4', 'gpt-4o', 'gpt4o'] },
  { name: 'GPT-3.5', category: 'ai', aliases: ['gpt-3.5', 'gpt3.5', 'gpt-3.5-turbo', 'chatgpt'] },
  { name: 'Claude', category: 'ai', aliases: ['claude', 'claude-3', 'claude3'] },
  { name: 'Claude Sonnet', category: 'ai', aliases: ['claude sonnet', 'claude-sonnet', 'sonnet'] },
  { name: 'Claude Opus', category: 'ai', aliases: ['claude opus', 'claude-opus', 'opus'] },
  { name: 'Claude Haiku', category: 'ai', aliases: ['claude haiku', 'claude-haiku', 'haiku'] },
  { name: 'Anthropic', category: 'ai', aliases: ['anthropic'] },
  { name: 'Gemini', category: 'ai', aliases: ['gemini', 'google gemini', 'gemini-pro', 'gemini pro'] },
  { name: 'Llama', category: 'ai', aliases: ['llama', 'llama2', 'llama3', 'llama-2', 'llama-3', 'meta llama'] },
  { name: 'Mistral', category: 'ai', aliases: ['mistral', 'mistral-7b', 'mixtral'] },
  { name: 'Cohere', category: 'ai', aliases: ['cohere'] },
  { name: 'Deepseek', category: 'ai', aliases: ['deepseek', 'deep-seek', 'deepseek-r1'] },
  { name: 'LangChain', category: 'ai', aliases: ['langchain', 'lang-chain'] },
  { name: 'LangGraph', category: 'ai', aliases: ['langgraph', 'lang-graph'] },
  { name: 'LlamaIndex', category: 'ai', aliases: ['llamaindex', 'llama-index', 'llama index'] },
  { name: 'Hugging Face', category: 'ai', aliases: ['hugging face', 'huggingface', 'hf', 'transformers'] },
  { name: 'PyTorch', category: 'ai', aliases: ['pytorch', 'torch'] },
  { name: 'TensorFlow', category: 'ai', aliases: ['tensorflow', 'keras'] },
  { name: 'JAX', category: 'ai', aliases: ['jax', 'google jax'] },
  { name: 'scikit-learn', category: 'ai', aliases: ['scikit-learn', 'sklearn', 'scikit'] },
  { name: 'Pinecone', category: 'ai', aliases: ['pinecone'] },
  { name: 'Weaviate', category: 'ai', aliases: ['weaviate'] },
  { name: 'Milvus', category: 'ai', aliases: ['milvus'] },
  { name: 'Qdrant', category: 'ai', aliases: ['qdrant'] },
  { name: 'ChromaDB', category: 'ai', aliases: ['chromadb', 'chroma'] },
  { name: 'pgvector', category: 'ai', aliases: ['pgvector', 'pg-vector'] },
  { name: 'FAISS', category: 'ai', aliases: ['faiss'] },
  { name: 'Ollama', category: 'ai', aliases: ['ollama'] },
  { name: 'vLLM', category: 'ai', aliases: ['vllm', 'v-llm'] },
  { name: 'OpenRouter', category: 'ai', aliases: ['openrouter', 'open-router'] },
  { name: 'Replicate', category: 'ai', aliases: ['replicate'] },
  { name: 'Stable Diffusion', category: 'ai', aliases: ['stable diffusion', 'stable-diffusion', 'sd', 'sdxl'] },
  { name: 'DALL-E', category: 'ai', aliases: ['dall-e', 'dalle', 'dall-e-3'] },
  { name: 'Whisper', category: 'ai', aliases: ['whisper', 'openai whisper'] },
  { name: 'CrewAI', category: 'ai', aliases: ['crewai', 'crew-ai', 'crew ai'] },
  { name: 'AutoGen', category: 'ai', aliases: ['autogen', 'auto-gen', 'ag2'] },
  { name: 'OpenAI Agents SDK', category: 'ai', aliases: ['openai agents sdk', 'openai-agents-sdk', 'agents sdk'] },
  { name: 'Google ADK', category: 'ai', aliases: ['google adk', 'adk'] },
  { name: 'PydanticAI', category: 'ai', aliases: ['pydanticai', 'pydantic-ai', 'pydantic ai'] },
  { name: 'Semantic Kernel', category: 'ai', aliases: ['semantic kernel', 'semantic-kernel'] },
  { name: 'Vercel AI SDK', category: 'ai', aliases: ['vercel ai sdk', 'ai sdk', '@ai-sdk'] },
  { name: 'Claude Code', category: 'ai', aliases: ['claude code', 'claude-code'] },
  { name: 'Cursor', category: 'ai', aliases: ['cursor'] },
  { name: 'GitHub Copilot', category: 'ai', aliases: ['github copilot', 'copilot'] },

  // ── Agent Frameworks & Platforms ───────────────────────────
  { name: 'ElizaOS', category: 'ai', aliases: ['elizaos', 'eliza-os', 'eliza'] },
  { name: 'OpenClaw', category: 'ai', aliases: ['openclaw', 'open-claw'] },
  { name: 'MCP', category: 'ai', aliases: ['mcp', 'model context protocol'] },

  // ── Infrastructure & Cloud ─────────────────────────────────
  { name: 'Docker', category: 'infrastructure', aliases: ['docker'] },
  { name: 'Kubernetes', category: 'infrastructure', aliases: ['kubernetes', 'k8s', 'kube'] },
  { name: 'AWS', category: 'platform', aliases: ['aws', 'amazon web services'] },
  { name: 'AWS Lambda', category: 'infrastructure', aliases: ['aws lambda', 'lambda'] },
  { name: 'AWS Bedrock', category: 'ai', aliases: ['aws bedrock', 'bedrock', 'amazon bedrock'] },
  { name: 'AWS S3', category: 'infrastructure', aliases: ['aws s3', 's3', 'amazon s3'] },
  { name: 'AWS EC2', category: 'infrastructure', aliases: ['aws ec2', 'ec2'] },
  { name: 'AWS SQS', category: 'infrastructure', aliases: ['aws sqs', 'sqs'] },
  { name: 'AWS SNS', category: 'infrastructure', aliases: ['aws sns', 'sns'] },
  { name: 'GCP', category: 'platform', aliases: ['gcp', 'google cloud', 'google cloud platform'] },
  { name: 'Azure', category: 'platform', aliases: ['azure', 'microsoft azure'] },
  { name: 'Vercel', category: 'platform', aliases: ['vercel'] },
  { name: 'Cloudflare', category: 'platform', aliases: ['cloudflare', 'cf'] },
  { name: 'Cloudflare Workers', category: 'infrastructure', aliases: ['cloudflare workers', 'cf workers', 'workers'] },
  { name: 'Fly.io', category: 'platform', aliases: ['fly.io', 'flyio', 'fly'] },
  { name: 'Railway', category: 'platform', aliases: ['railway'] },
  { name: 'Render', category: 'platform', aliases: ['render'] },
  { name: 'Heroku', category: 'platform', aliases: ['heroku'] },
  { name: 'DigitalOcean', category: 'platform', aliases: ['digitalocean', 'digital ocean', 'do'] },
  { name: 'Terraform', category: 'infrastructure', aliases: ['terraform', 'tf'] },
  { name: 'Pulumi', category: 'infrastructure', aliases: ['pulumi'] },
  { name: 'Ansible', category: 'infrastructure', aliases: ['ansible'] },
  { name: 'Nginx', category: 'infrastructure', aliases: ['nginx'] },
  { name: 'Caddy', category: 'infrastructure', aliases: ['caddy'] },
  { name: 'Linux', category: 'infrastructure', aliases: ['linux', 'ubuntu', 'debian', 'centos', 'fedora', 'arch'] },

  // ── DevOps & CI/CD ─────────────────────────────────────────
  { name: 'GitHub Actions', category: 'tool', aliases: ['github actions', 'gh actions', 'gha'] },
  { name: 'GitLab CI', category: 'tool', aliases: ['gitlab ci', 'gitlab-ci', 'gitlab ci/cd'] },
  { name: 'Jenkins', category: 'tool', aliases: ['jenkins'] },
  { name: 'CircleCI', category: 'tool', aliases: ['circleci', 'circle-ci', 'circle ci'] },
  { name: 'ArgoCD', category: 'tool', aliases: ['argocd', 'argo-cd', 'argo cd'] },
  { name: 'Helm', category: 'tool', aliases: ['helm'] },

  // ── Tools & Utilities ──────────────────────────────────────
  { name: 'Git', category: 'tool', aliases: ['git'] },
  { name: 'GitHub', category: 'platform', aliases: ['github', 'gh'] },
  { name: 'GitLab', category: 'platform', aliases: ['gitlab'] },
  { name: 'Bitbucket', category: 'platform', aliases: ['bitbucket'] },
  { name: 'npm', category: 'tool', aliases: ['npm', 'npmjs'] },
  { name: 'pnpm', category: 'tool', aliases: ['pnpm'] },
  { name: 'Yarn', category: 'tool', aliases: ['yarn'] },
  { name: 'pip', category: 'tool', aliases: ['pip', 'pip3'] },
  { name: 'Poetry', category: 'tool', aliases: ['poetry'] },
  { name: 'Cargo', category: 'tool', aliases: ['cargo'] },
  { name: 'Webpack', category: 'tool', aliases: ['webpack'] },
  { name: 'Vite', category: 'tool', aliases: ['vite', 'vitejs'] },
  { name: 'esbuild', category: 'tool', aliases: ['esbuild'] },
  { name: 'Turbopack', category: 'tool', aliases: ['turbopack'] },
  { name: 'Rollup', category: 'tool', aliases: ['rollup', 'rollupjs'] },
  { name: 'ESLint', category: 'tool', aliases: ['eslint'] },
  { name: 'Prettier', category: 'tool', aliases: ['prettier'] },
  { name: 'Biome', category: 'tool', aliases: ['biome', 'biomejs'] },
  { name: 'Jest', category: 'tool', aliases: ['jest'] },
  { name: 'Vitest', category: 'tool', aliases: ['vitest'] },
  { name: 'Playwright', category: 'tool', aliases: ['playwright'] },
  { name: 'Cypress', category: 'tool', aliases: ['cypress'] },
  { name: 'Puppeteer', category: 'tool', aliases: ['puppeteer'] },
  { name: 'Selenium', category: 'tool', aliases: ['selenium', 'selenium webdriver'] },
  { name: 'Postman', category: 'tool', aliases: ['postman'] },
  { name: 'curl', category: 'tool', aliases: ['curl'] },
  { name: 'Storybook', category: 'tool', aliases: ['storybook'] },
  { name: 'Sentry', category: 'tool', aliases: ['sentry'] },
  { name: 'Datadog', category: 'tool', aliases: ['datadog'] },
  { name: 'Grafana', category: 'tool', aliases: ['grafana'] },
  { name: 'Prometheus', category: 'tool', aliases: ['prometheus'] },

  // ── Auth & Identity ────────────────────────────────────────
  { name: 'OAuth', category: 'tool', aliases: ['oauth', 'oauth2', 'oauth 2.0'] },
  { name: 'JWT', category: 'tool', aliases: ['jwt', 'json web token', 'json web tokens'] },
  { name: 'Auth0', category: 'platform', aliases: ['auth0'] },
  { name: 'Clerk', category: 'platform', aliases: ['clerk'] },
  { name: 'NextAuth', category: 'library', aliases: ['nextauth', 'next-auth', 'authjs', 'auth.js'] },
  { name: 'Passport.js', category: 'library', aliases: ['passport.js', 'passportjs', 'passport'] },

  // ── Messaging & Queues ─────────────────────────────────────
  { name: 'Kafka', category: 'infrastructure', aliases: ['kafka', 'apache kafka'] },
  { name: 'RabbitMQ', category: 'infrastructure', aliases: ['rabbitmq', 'rabbit-mq', 'rabbit'] },
  { name: 'NATS', category: 'infrastructure', aliases: ['nats'] },
  { name: 'Celery', category: 'library', aliases: ['celery'] },
  { name: 'BullMQ', category: 'library', aliases: ['bullmq', 'bull-mq', 'bull'] },

  // ── Payments & APIs ────────────────────────────────────────
  { name: 'Stripe', category: 'platform', aliases: ['stripe'] },
  { name: 'Twilio', category: 'platform', aliases: ['twilio'] },
  { name: 'SendGrid', category: 'platform', aliases: ['sendgrid', 'send-grid'] },
  { name: 'Resend', category: 'platform', aliases: ['resend'] },
  { name: 'Upstash', category: 'platform', aliases: ['upstash'] },

  // ── Mobile & Cross-Platform ────────────────────────────────
  { name: 'React Native', category: 'frontend', aliases: ['react native', 'react-native', 'rn'] },
  { name: 'Flutter', category: 'framework', aliases: ['flutter'] },
  { name: 'Expo', category: 'framework', aliases: ['expo'] },
  { name: 'Electron', category: 'framework', aliases: ['electron', 'electronjs'] },
  { name: 'Tauri', category: 'framework', aliases: ['tauri'] },
  { name: 'Ionic', category: 'framework', aliases: ['ionic'] },
  { name: 'Capacitor', category: 'framework', aliases: ['capacitor'] },

  // ── Data & ETL ─────────────────────────────────────────────
  { name: 'Apache Spark', category: 'tool', aliases: ['apache spark', 'spark', 'pyspark'] },
  { name: 'Apache Airflow', category: 'tool', aliases: ['apache airflow', 'airflow'] },
  { name: 'dbt', category: 'tool', aliases: ['dbt', 'dbt-core'] },
  { name: 'Pandas', category: 'library', aliases: ['pandas'] },
  { name: 'Polars', category: 'library', aliases: ['polars'] },
  { name: 'NumPy', category: 'library', aliases: ['numpy'] },

  // ── CMS & Content ──────────────────────────────────────────
  { name: 'Sanity', category: 'platform', aliases: ['sanity', 'sanity.io'] },
  { name: 'Contentful', category: 'platform', aliases: ['contentful'] },
  { name: 'Strapi', category: 'platform', aliases: ['strapi'] },
  { name: 'WordPress', category: 'platform', aliases: ['wordpress', 'wp'] },

  // ── Blockchain & Web3 ──────────────────────────────────────
  { name: 'Ethereum', category: 'platform', aliases: ['ethereum', 'eth'] },
  { name: 'Hardhat', category: 'tool', aliases: ['hardhat'] },
  { name: 'Foundry', category: 'tool', aliases: ['foundry', 'forge'] },
  { name: 'ethers.js', category: 'library', aliases: ['ethers.js', 'ethersjs', 'ethers'] },
  { name: 'viem', category: 'library', aliases: ['viem'] },
  { name: 'wagmi', category: 'library', aliases: ['wagmi'] },
  { name: 'IPFS', category: 'infrastructure', aliases: ['ipfs'] },
  { name: 'Solana', category: 'platform', aliases: ['solana', 'sol'] },

  // ── Misc Libraries ─────────────────────────────────────────
  { name: 'Zod', category: 'library', aliases: ['zod'] },
  { name: 'Pydantic', category: 'library', aliases: ['pydantic'] },
  { name: 'Axios', category: 'library', aliases: ['axios'] },
  { name: 'Socket.IO', category: 'library', aliases: ['socket.io', 'socketio', 'socket'] },
  { name: 'WebSocket', category: 'library', aliases: ['websocket', 'websockets', 'ws'] },
  { name: 'RxJS', category: 'library', aliases: ['rxjs', 'rx'] },
  { name: 'Lodash', category: 'library', aliases: ['lodash'] },
  { name: 'D3.js', category: 'library', aliases: ['d3.js', 'd3', 'd3js'] },
  { name: 'Three.js', category: 'library', aliases: ['three.js', 'threejs', 'three'] },
  { name: 'Zustand', category: 'library', aliases: ['zustand'] },
  { name: 'Redux', category: 'library', aliases: ['redux', 'redux toolkit', 'rtk'] },
  { name: 'TanStack Query', category: 'library', aliases: ['tanstack query', 'tanstack-query', 'react-query', 'react query'] },
  { name: 'SWR', category: 'library', aliases: ['swr'] },
  { name: 'Cheerio', category: 'library', aliases: ['cheerio'] },
  { name: 'Beautiful Soup', category: 'library', aliases: ['beautiful soup', 'beautifulsoup', 'bs4'] },
  { name: 'Scrapy', category: 'library', aliases: ['scrapy'] },
  { name: 'FFmpeg', category: 'tool', aliases: ['ffmpeg'] },
  { name: 'Sharp', category: 'library', aliases: ['sharp'] },

  // ── Browser & Web APIs ─────────────────────────────────────
  { name: 'HTML', category: 'language', aliases: ['html', 'html5'] },
  { name: 'Browser DevTools', category: 'tool', aliases: ['browser devtools', 'devtools', 'chrome devtools'] },
  { name: 'Service Workers', category: 'tool', aliases: ['service workers', 'service-workers', 'sw'] },
  { name: 'Web Components', category: 'frontend', aliases: ['web components', 'web-components'] },

  // ── Scheduling & Automation ───────────────────────────────
  { name: 'Cron', category: 'tool', aliases: ['cron', 'crontab', 'cron job'] },

  // ── AI Proxies & Gateways ───────────────────────────────
  { name: 'LiteLLM', category: 'ai', aliases: ['litellm', 'lite-llm'] },

  // ── Markup & Documentation ──────────────────────────────
  { name: 'Markdown', category: 'language', aliases: ['markdown', 'md'] },

  // ── Visualization ───────────────────────────────────────
  { name: 'Graphviz', category: 'tool', aliases: ['graphviz', 'dot', 'dot/graphviz', 'dot language'] },

  // ── Protocols & Formats ────────────────────────────────────
  { name: 'REST', category: 'tool', aliases: ['rest', 'rest api', 'restful'] },
  { name: 'WebRTC', category: 'tool', aliases: ['webrtc'] },
  { name: 'MQTT', category: 'tool', aliases: ['mqtt'] },
  { name: 'Protocol Buffers', category: 'tool', aliases: ['protocol buffers', 'protobuf', 'proto'] },
  { name: 'JSON', category: 'tool', aliases: ['json'] },
  { name: 'YAML', category: 'tool', aliases: ['yaml', 'yml'] },
  { name: 'TOML', category: 'tool', aliases: ['toml'] },
];

// Pre-built lookup maps for fast matching (computed once at module load)

// Lowercase canonical name -> entry
const nameMap = new Map<string, StackEntry>();
// Alias -> entry
const aliasMap = new Map<string, StackEntry>();
// All searchable strings (names + aliases) for fuzzy matching
const allTokens: { token: string; entry: StackEntry }[] = [];

for (const entry of STACK_TAXONOMY) {
  const lowerName = entry.name.toLowerCase();
  nameMap.set(lowerName, entry);
  allTokens.push({ token: lowerName, entry });

  for (const alias of entry.aliases) {
    aliasMap.set(alias, entry);
    if (alias !== lowerName) {
      allTokens.push({ token: alias, entry });
    }
  }
}

/**
 * Look up a stack entry by exact canonical name (case-insensitive).
 */
export function findByName(input: string): StackEntry | undefined {
  return nameMap.get(input.toLowerCase().trim());
}

/**
 * Look up a stack entry by alias (case-insensitive).
 */
export function findByAlias(input: string): StackEntry | undefined {
  return aliasMap.get(input.toLowerCase().trim());
}

/**
 * Get all tokens and entries for fuzzy matching.
 */
export function getAllTokens(): { token: string; entry: StackEntry }[] {
  return allTokens;
}

// ── Display priority (lower = shown first when space is limited) ──

const CATEGORY_PRIORITY: Record<StackCategory, number> = {
  ai: 1,
  framework: 2,
  backend: 2,
  database: 3,
  frontend: 3,
  infrastructure: 4,
  platform: 4,
  language: 5,
  library: 5,
  tool: 5,
};

// Tags that should always sort last within their tier (too generic to lead)
const DEPRIORITIZED = new Set([
  'JSON', 'YAML', 'TOML', 'REST', 'Git', 'Shell', 'curl', 'Markdown',
  'CSS', 'HTML', 'npm', 'pnpm', 'Yarn', 'pip',
]);

/**
 * Sort stack tags by display priority. Higher-signal tags (AI, frameworks)
 * come first; generic tags (JSON, Markdown, Git) sort last. Stable within
 * the same priority tier (preserves author order).
 */
export function sortStackByPriority(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const entryA = nameMap.get(a.toLowerCase());
    const entryB = nameMap.get(b.toLowerCase());
    const prioA = entryA ? CATEGORY_PRIORITY[entryA.category] : 5;
    const prioB = entryB ? CATEGORY_PRIORITY[entryB.category] : 5;
    if (prioA !== prioB) return prioA - prioB;
    // Within same tier, deprioritized tags sink to the end
    const depA = DEPRIORITIZED.has(a) ? 1 : 0;
    const depB = DEPRIORITIZED.has(b) ? 1 : 0;
    return depA - depB;
  });
}

// ── Category display config (used by explore page) ──────────

export const CATEGORY_DISPLAY: Record<string, {
  label: string;
  categories: StackCategory[];
  color: string;
  bg: string;
  rgb: string; // Raw RGB for inline styles (gradients, glows, borders)
}> = {
  'AI & Models': {
    label: 'AI & Models',
    categories: ['ai'],
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    rgb: '168,85,247',
  },
  'Frontend & UI': {
    label: 'Frontend & UI',
    categories: ['frontend'],
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
    rgb: '56,189,248',
  },
  'Frameworks': {
    label: 'Frameworks',
    categories: ['framework'],
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10 border-cyan-500/20',
    rgb: '34,211,238',
  },
  'Backend & APIs': {
    label: 'Backend & APIs',
    categories: ['backend'],
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    rgb: '52,211,153',
  },
  'Databases': {
    label: 'Databases',
    categories: ['database'],
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    rgb: '251,191,36',
  },
  'Languages': {
    label: 'Languages',
    categories: ['language'],
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    rgb: '96,165,250',
  },
  'Infrastructure': {
    label: 'Infrastructure',
    categories: ['infrastructure'],
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    rgb: '251,113,133',
  },
  'Platforms': {
    label: 'Platforms',
    categories: ['platform'],
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    rgb: '251,146,60',
  },
  'Libraries': {
    label: 'Libraries',
    categories: ['library'],
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    rgb: '167,139,250',
  },
  'Tools': {
    label: 'Tools',
    categories: ['tool'],
    color: 'text-teal-400',
    bg: 'bg-teal-500/10 border-teal-500/20',
    rgb: '45,212,191',
  },
};


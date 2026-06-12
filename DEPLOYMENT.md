Supabase + Edge Functions + Frontend Deployment

Environment
- Create a `.env.server` (never commit) with the following variables:
  - OPENAI_API_KEY (optional)
  - ANTHROPIC_API_KEY (optional)
  - SUPABASE_URL
  - SUPABASE_SERVICE_ROLE (optional, for server-only ops)

Migrations
- All SQL migrations are in `migrations/`. Apply them in timestamp order to your Supabase project.
- Recommended order:
  1. `20260612_create_order_items.sql`
  2. `20260612_create_inventory_logs.sql`
  3. `20260612_create_agent_tasks.sql`
  4. `20260612_create_order_atomic.sql`
  5. `20260612_alter_products_add_fields.sql`
  6. `20260612_rls_and_indexes.sql`

- Rollbacks are provided alongside migrations.

Supabase Edge Function
- The Edge Function is at `supabase/functions/ai-proxy/index.ts` (Deno).
- Deploy via `supabase` CLI:
  1. `supabase functions deploy ai-proxy --project-ref <your-project-ref>`
  2. Set environment secrets in Supabase (OPENAI_API_KEY / ANTHROPIC_API_KEY).

Vercel Alternative
- The project also contains `api/ai/proxy.ts` as a Vercel-style serverless route.
- Deploy to Vercel; set environment variables via the Vercel dashboard.

Frontend
- Frontend will call the Edge Function via `VITE_AI_PROXY_URL` (if provided) or default path `/api/ai/proxy`.

Notes
- The Edge Function includes an in-memory rate limiter — in production use a shared store (Redis).
- Demo mode is used when no AI keys are present; mock responses are returned and errors are never shown directly to users.

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

Agent Processing
- Secure server endpoint (Vercel): `api/agents/process.ts` — requires `AGENT_SIGNING_KEY` header signature and `SUPABASE_SERVICE_ROLE` env.
- Supabase Edge Function: `supabase/functions/agents-run` — requires `AGENT_SIGNING_KEY` env and `SUPABASE_SERVICE_ROLE`.
- To trigger processing from CI/cron, compute HMAC-SHA256 of body using `AGENT_SIGNING_KEY` and include as header `x-signature`.

Example trigger (node):
```js
const crypto = require('crypto');
const body = JSON.stringify({ limit: 50 });
const sig = crypto.createHmac('sha256', process.env.AGENT_SIGNING_KEY).update(body).digest('hex');
fetch('https://your-site.com/api/agents/process', { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': sig }, body });
```

Scheduling
- For Supabase: use `supabase functions deploy` and schedule via external cron to POST with signature, or use Supabase's scheduled functions feature where available.
- We recommend running the agents every 6 hours.


# Hackathon Demo Readiness Guide

This guide helps you prepare the SellerSync app for a 5-minute demo with strong AI and dashboard content.

## 1. Generate Demo Data

Use the demo seed script to populate the database with realistic products, orders, inventory history, and agent activity.

### Required environment variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE`
- Optional: `DEMO_USER_ID` (if you want to target a specific existing user)
- Optional: `VITE_DEMO_MODE=true` to enable UI demo mode and deterministic AI fallbacks

### Run the script

```bash
npm run demo-data
```

If you need to run it manually:

```bash
SUPABASE_URL="https://<project>.supabase.co" SUPABASE_SERVICE_ROLE="<service-role-key>" node scripts/generate-demo-data.js
```

## 2. What the seed data includes

- 20 product SKUs across multiple categories
- 200 orders over a 60-day sales window
- realistic price, stock, reorder, and demand patterns
- low stock products, high demand products, and slow-moving SKUs
- inventory logs, transactions, agent tasks, and execution logs

## 3. Dashboard polish improvements

The dashboard now includes:

- KPI cards with animated values
- AI insight card highlighting demand trend and stock risk
- 7-day sales chart with skeleton loading
- top products panel with revenue bars
- agent activity feed and notifications
- AI business report and inventory copilot widgets with fallback data

## 4. Demo flow

Use this flow for your pitch:

1. **Dashboard overview**
   - Show Revenue, Orders, Products, Pending counts
   - Highlight the AI insights card and sales trend

2. **AI Restock Recommendations**
   - Open the restock card and review top suggested replenishments
   - Note how the feed is populated with meaningful recommendations

3. **Demand Forecasting**
   - Point to the 7-day sales chart and trend summary
   - Mention weekend demand and product-level forecasting readiness

4. **Inventory Copilot**
   - Use a pre-filled question such as “Which products should I restock?”
   - Show the Copilot answer, which loads automatically on demo-ready startup

5. **Business Analysis Report**
   - Highlight the AI Business Analyst card and executive summary
   - Mention that the report is generated automatically on load

6. **Agent Activity Feed**
   - Show recent tasks and execution logs
   - Point out recommendations from the Low Stock and Demand Spike agents

## 5. Demo safety

If AI service keys are unavailable or proxies fail:

- fallback text is used instead of blank cards
- widgets never show raw error details
- the UI is seeded with deterministic demo content
- the dashboard remains populated and visually complete

## 6. Validation checklist

Before the demo, verify:

- [ ] `npm run demo-data` completed successfully
- [ ] The dashboard loads with meaningful revenue and trend cards
- [ ] AI Restock Recommendations show product suggestions
- [ ] Inventory Copilot returns a helpful answer automatically
- [ ] Business report card displays an executive summary
- [ ] Agent Activity feed shows recent tasks and execution logs

## 7. Notes for the demo

- Keep the story focused on the AI-driven insights rather than data entry.
- Mention that the app uses Supabase for real inventory history and AI fallback for resiliency.
- Avoid manual configuration during the demo; launch the dashboard after seeding the data.

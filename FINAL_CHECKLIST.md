# Final Hackathon Checklist

Use this checklist before the live demo.

## Authentication

- [ ] Signup and login work correctly
- [ ] Protected routes redirect unauthenticated users
- [ ] Session restoration works after refresh

## Products and Inventory

- [ ] Products load correctly
- [ ] Stock levels update after orders
- [ ] Low stock products are visible
- [ ] Product search and filtering work

## Orders and Transactions

- [ ] Orders appear in the dashboard activity feed
- [ ] Transactions reflect sales revenue
- [ ] Delivery and payment status fields render correctly

## AI and Automation

- [ ] AI Restock Recommendations load
- [ ] Demand Forecasting chart populates
- [ ] Inventory Copilot answers questions
- [ ] Business report displays an executive summary
- [ ] Agent Activity Feed shows tasks or demo tasks
- [ ] Automation actions do not break the UI

## UI and Presentation

- [ ] No blank widgets appear
- [ ] Loading skeletons display on slow states
- [ ] Dashboard layout is responsive
- [ ] Banner and badges are visible
- [ ] No console errors in the browser

## Error Resilience

- [ ] Missing API keys still render fallback content
- [ ] Supabase connection failures show friendly messages
- [ ] AI widgets never break due to external failures
- [ ] Demo mode can be enabled safely

## Build and Route Validation

- [ ] Application builds successfully (`npm run build`)
- [ ] All routes render without broken links
- [ ] No placeholder data is visible in production mode

## Demo Mode Preparedness

- [ ] `npm run demo-data` completed successfully
- [ ] `VITE_DEMO_MODE=true` is ready if external AI is unavailable
- [ ] The dashboard is populated with realistic demo data
- [ ] A demo script is available: `DEMO_SCRIPT.md`

## Final Sanity Check

- [ ] Run through the demo once end-to-end
- [ ] Confirm key metrics and AI widgets are visible
- [ ] Verify the app feels polished and investor-ready

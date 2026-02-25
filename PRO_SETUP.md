# Haggly Pro Setup (Vercel + Supabase + Stripe)

## Vercel Environment Variables

### Public (browser)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SITE_URL` (e.g. `https://haggly.io`)

### Server-only
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_PORTAL_CONFIGURATION_ID` (optional)
- `STRIPE_ENABLE_ADAPTIVE_PRICING` (`true` / `false`)
- `HAGGLY_PRO_ENABLED` (`true` / `false`, optional)

## Supabase Setup
- Create a Supabase project.
- Enable Email OTP / Magic Link sign-in.
- Add redirect URLs for Vercel preview and `https://haggly.io/login.html`.
- Run the SQL in `supabase/schema.sql`.

## Stripe Setup
- Create product `Haggly Pro`.
- Create monthly recurring price ($3 USD).
- Set `STRIPE_PRO_PRICE_ID`.
- Enable Stripe Tax.
- Configure Customer Portal and copy its config ID (optional but recommended).
- Add webhook endpoint: `https://<your-domain>/api/stripe/webhook`.

## Notes
- This implementation uses Stripe Checkout and Customer Portal.
- Frontend ad suppression for Pro users relies on a cached entitlement and refreshes on core pages.

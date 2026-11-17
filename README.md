# Portable Kiosk SaaS

Working first release: super-admin business registration and access control, owner menu/branding/publishing, QR sharing, public cart orders, and cash-only kiosk POS.

## Run locally

Requires Node.js 24+. Credentials for the connected Supabase project are in the private root `.env`.

```sh
npm install
node --env-file=.env scripts/configure-web.mjs
npm run dev
```

Open http://127.0.0.1:5173. The API runs on http://127.0.0.1:3001. Keep the command in the foreground and stop both processes with Ctrl+C.

Super-admin sign-in: read `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in the root `.env`. The initial admin account has already been created. Passwords and server keys must never be committed or put in frontend environment files.

## Use the application

1. Sign in as the super admin. Register a business with its name, unique kiosk address, owner email, and a password of at least 12 characters.
2. Copy the sign-in details and share them privately. Dismiss the panel to clear the password from the screen; passwords are not stored in application tables.
3. The owner signs in immediately; account creation is internally confirmed, with no verification email or invitation flow.
4. The owner adds products using searchable categories that can be created inline. Product photos are optional and stored in Supabase (PNG/JPEG/WebP, up to 1 MB). Image slots show a fallback if a photo is absent or cannot load. Business identity and logo changes preview before saving, with a Discard action.
5. Publish the kiosk, copy its stable link, or download the SVG QR code.
6. Customers choose Dine in or Takeout, add products from cards, review their cart, and submit to receive a four-digit number. Payment is still due at the counter; unpaid orders expire after 30 minutes.
7. Kiosk POS loads orders only on explicit lookup or refresh; there is no polling or automatic pending-order fetch. The owner enters that number, reviews the order, enters cash received, and confirms completion. Change is calculated; repeated requests cannot complete the order twice.
8. The operator can deactivate or reactivate a business. Inactive businesses cannot use business operations or accept public orders, including through previously issued sessions.

The service is free for clients. No subscriptions, per-order fees, payment provider, or billing ledger is included. Cash received is stored on the order for checkout reconciliation; this is not a separate accounting system.

## Workspace

- `apps/web`: React, Vite, TypeScript, Tailwind, generated shadcn components and sidebar.
- `apps/api`: Express, Supabase Auth verification, role/tenant checks, validated business/menu/order routes.
- `supabase/migrations`: versioned schema, RLS, storage bucket setup.
- `scripts`: migration runner, admin bootstrap, connection verification, local SQL runner, dev launcher.
- `tests/integration.test.mjs`: live Supabase/API checks with disposable, cleaned-up fixtures.
- `DESIGN.md`: interface tokens and design direction.

Every menu item and order has a `business_id`. Memberships link authenticated users to their business. Database read policies isolate active businesses; direct client writes and anonymous table reads are denied. Public menu access and all mutations go through Express. Prices are integer centavos, calculated on the server; orders retain original names and prices.

Pending order numbers are unique per business. Codes may be reused after an order leaves pending status; authenticated lookup prioritizes the current pending order, then the latest matching history entry. Four digits are a counter convenience, not authentication or proof of payment. Customers have no public order-lookup endpoint. Submission request IDs support safe retries, with cart/confirmation recovery in the same tab's session storage.

## Database setup and checks

The initial migration is already applied to the connected project. For a new environment:

```sh
npm run db:migrate
npm run admin:setup
```

`db:migrate` tracks SQL filenames and SHA-256 hashes in a private schema and runs each new migration transactionally. Do not edit applied migrations; add another file.

`admin:setup` is local operator tooling, not a web endpoint. Set `SUPER_ADMIN_EMAIL`/`SUPER_ADMIN_PASSWORD` first, or let first-run setup generate and save them privately. Existing accounts require their known credentials; the script never silently resets a password.

```sh
npm test
npm run test:integration
npm run build
npm run db:check
npm run db:sql -- supabase/queries/connection-check.sql
```

Integration tests create two uniquely named test businesses and confirmed owners, exercise tenant isolation (including direct Supabase RLS), CRUD, logo upload, publishing, order snapshots, retries, concurrent completion, cash, expiry, cancellation, and deactivation; only those fixtures are removed afterward. They require network access and the configured super-admin credentials. The test HTTP server shuts down when finished.

The SQL runner defaults to a read-only transaction. Use `npm run db:sql -- --execute path/to/reviewed.sql` only for trusted SQL you intend to commit. Use `db:migrate` for versioned application schema. SQL results are printed, so avoid selecting credentials or personal data into logs.

The bundled public CA certificate is from Supabase's dashboard download link. Database connections verify certificates and hostnames; TLS verification is never disabled.

## Hosting later

Frontend: Vercel, root `apps/web`, build `npm run build`, output `dist`. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_API_URL` to the HTTPS API origin (without `/api`). SPA rewrites are in `apps/web/vercel.json`.

API: deploy in Docker on your VM when ready. It needs the private server environment, CA file, `HOST=0.0.0.0`, and the intended `FRONTEND_ORIGINS` (comma-separated, no trailing slashes). If behind exactly one trusted reverse proxy, set `TRUST_PROXY=1`; otherwise keep it unset. Provide HTTPS at the proxy. No deployment has been performed yet.

The local QR points to localhost and is only a development preview. After deploying the frontend, generate the QR from its actual public domain so customers' phones can reach it.

No invitations, self-registration interface, advanced design editor, online payments, official invoicing, offline checkout, or external POS integration is implemented. Supabase users without a membership/operator role cannot access application workspaces. This first UI provisions one owner per business; staff-account management can follow later.

## UX and implementation structure

`features/business` contains menu editing, persisted category selection/creation, publishing, branding preview, and POS. `features/kiosk` holds cart/retry state and reusable ordering controls. The workspace shell is lazy-loaded separately from the public kiosk. Express routes are split by operator, business, menu, orders, and public kiosk, with shared server authorization.

Product photos and business logos use separate public Supabase Storage buckets; server-validated owner endpoints control uploads. Browser clients cannot upload directly. Product photos are optional; missing and failed images share a stable aspect-ratio fallback. Replace/remove actions change the product photo association; old storage objects are not yet garbage-collected automatically. A storage lifecycle cleanup policy can follow when required.

The branding form previews unsaved name, description, color, and selected logo. Logo upload happens on Save, not selection. Browser reload/close warns about unsaved changes; navigating to another app page currently discards the draft. Product detail and photo saving are separate requests; a partial photo failure retains its selected change and retries against the already-created product.

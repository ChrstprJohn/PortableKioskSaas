# Portable Kiosk — Implementation status

Updated November 17, 2026. The requested first implementation and UX revamp are implemented locally. See README.md for startup and deployment configuration; DESIGN.md records the visual system.

## Implemented

- Super-admin business registration, confirmed owner accounts with admin-set passwords, and activate/deactivate controls.
- Business-isolated cloud data and server-enforced roles, with database RLS and no direct anonymous table access.
- Admin and customer product cards with optional Supabase photos, local upload preview, replacement/removal, stable image slots, and missing/broken-image fallback.
- Searchable category dropdown with inline creation. Categories persist independently and are isolated per business.
- Unsaved name, description, brand color, and logo preview; logo upload on Save; Discard; reload/close warning for dirty branding forms.
- Publish/unpublish, stable public link, and downloadable QR.
- Customer dine-in/takeout choice, category browsing, cart/review, safe retry handling, four-digit order confirmation, and expiry.
- Cash-only POS with explicit order lookup/refresh, change calculation, cancellation, and duplicate-completion protection. No polling or automatic pending-order fetch.
- Focused frontend feature modules and backend route modules, lazy-loaded public kiosk/workspace, consistent shadcn confirmations, empty/loading/error feedback, and mobile layouts.

## Verification evidence

- Production build and validation unit tests.
- Live Supabase integration suite covering tenant isolation, confirmed account provisioning, category persistence/isolation, branding, logo validation, optional product-photo upload/replace/remove and cross-tenant rejection, publishing, order snapshots, dining choice retry consistency, cash/duplicate completion, cancellation, expiry, and deactivation.
- Browser walkthrough: category creation; branding draft/discard; immediate color preview; dine-in/customer cart/confirmation/POS/cash completion; takeout/mobile cards; product photo selection/local preview/Supabase save/image decode/remove; deliberately broken image fallback with working Add action.
- Screenshots in .impeccable/review/revamp. These use disposable demonstration data, removed after verification.
- Finish review's color evidence discrepancy resolved in browser; photo retry finding fixed and reviewer disposition ship.

## Remaining later scope

Deployment to Vercel/VM, invitations, staff-management UI, advanced template editor, official invoicing, online payments, offline use, external POS integrations, advanced inventory, and multi-branch support remain deferred as previously agreed. No client billing is implemented.

Supabase product-photo replacement/removal changes the product association. Old objects are not automatically garbage-collected; add a lifecycle policy when required. In-app navigation currently discards an unsaved branding draft; reload/close warns. Uploaded logos can save before a later identity update fails, and the form explains recovery.

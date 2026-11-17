> UX revamp implemented: product cards with optional Supabase photos/fallbacks; persistent searchable/createable categories; staged branding/logo preview and discard; dine-in/takeout orders; explicit-only POS lookup/refresh; modular code and lazy-loaded workspace. See README.md and IMPLEMENTATION_PLAN.md for the current supported scope.

> Current first implementation: internal password-based account provisioning, simple menu categories/items, basic logo/name/description/color settings, publish/link/QR, public cart with four-digit orders and 30-minute expiry, and cash-only POS inside the business admin. Invitations, advanced design editing, staff provisioning, hours configuration, item options, refunds, and printing are later scope. Earlier product aspirations below do not imply those features are implemented. See README.md.

# Portable Kiosk SaaS — Product Plan

Status: Updated November 17, 2026. The first implementation is working locally; see README.md for the current feature set and verification commands.

Build sequence and phase acceptance checks: [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

See [UI_FLOW.md](UI_FLOW.md) for system diagrams, navigation, and user flows.

## Product direction

Portable Kiosk is a web SaaS that gives each registered business its own branded customer ordering page, business admin, and kiosk POS. The kiosk is the main product. The POS exists only to retrieve and process orders submitted through that business's kiosk.

All four surfaces run in a browser: customer kiosk, business admin, kiosk POS, and SaaS operator panel. There is no installed Electron application, offline counter POS, independent local catalog, or walk-in sale creation in this scope.

Build one shared multi-tenant application. Registering a client provisions a business workspace and public address; it does not deploy a separate application for that client. Each business has its own menu, branding, staff, orders, and settings, isolated from other businesses.

## Technology stack

Confirmed hosting and styling choices: Vercel for the frontend, a Dockerized Express API on the operator's VM, and Tailwind CSS. React with Vite and Supabase are the selected application foundation.

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | React + Vite | Public kiosk, business admin, kiosk POS, and operator panel |
| Styling | Tailwind CSS | Responsive layout and visual styling |
| Frontend hosting | Vercel | Serve the frontend application |
| Backend | Node.js + Express | Tenant/role enforcement, business registration, order validation, server-calculated totals, and order completion |
| API deployment | Docker on the operator's VM | Run the Express API |
| Database | Supabase PostgreSQL | Businesses, memberships, menus, orders, and audit history |
| Authentication | Supabase Auth | Owner, cashier, and operator accounts and sessions |
| Image storage | Supabase Storage | Menu photos, logos, and cover images |

TypeScript and React Router remain recommended implementation choices from the stack discussion. Start with simple polling for pending orders; a separate realtime service is unnecessary for the initial scope.

The browser signs in through Supabase Auth and sends its access token to Express for protected operations. Express validates identity and business permissions. Public menu/order endpoints expose only the necessary data and validate requests on the server. Supabase access policies protect exposed tables and storage; privileged server credentials stay exclusively on the backend.

The frontend and API use HTTPS in production. Configure the frontend with the API's public address, restrict API CORS to intended frontend origins, and configure Vercel routing so direct links into React pages work. Store backend secrets in the VM deployment environment rather than the frontend bundle or source repository. Cloud data and image storage remain in Supabase, outside the API container lifecycle.

The initial product remains free for clients; infrastructure costs are the operator's responsibility. Hosting plans, VM configuration, and deployment setup are implementation tasks, not completed deployments.

## Registration and launch

1. The SaaS operator registers a client business and provisions its owner account with an admin-set password; the account is internally confirmed without an email-verification step.
2. The platform creates the business workspace, reserves a unique public address such as `/k/cafe-maria`, and grants access to its admin and kiosk POS.
3. The owner adds categories, products, prices, options, availability, and branding in the business admin.
4. The owner previews and publishes the kiosk when ready. New workspaces start unpublished.
5. The admin provides Copy link and Download QR actions for the stable public address.
6. Customers open the link or scan the QR code and submit orders. Staff process them through that business's kiosk POS.

Public self-service business registration is outside the first release. The operator registers clients and privately shares their sign-in details. Invitations are deferred.

## Product surfaces and responsibilities

| Surface | User | Responsibility |
| --- | --- | --- |
| Public kiosk | Customer | Browse one business's menu, build a cart, submit an unpaid order, receive an order number and expiry |
| Business admin | Owner / authorized manager | Manage menu, branding, publishing, link/QR, ordering hours, expiry, staff, and order history |
| Kiosk POS | Cashier | Find kiosk orders, review them, record counter payment, complete orders, and handle authorized cancellations or reversals |
| SaaS operator panel | Platform operator | Register and manage businesses, owner access, account status, platform limits, and service health |

Admin and POS are separate destinations within the same business workspace. Cashiers do not automatically receive menu, owner, or operator permissions.

### One menu per business

The business admin manages the single cloud menu used by the public kiosk and kiosk POS. There is no second POS catalog to maintain or synchronize. POS order details come from the submitted order's snapshot, so later menu edits do not silently rewrite existing orders.

Owners can manage categories, names, descriptions, photos, prices, options, active status, and temporary availability. Basic branding includes a logo, brand colors, cover image, and a small selection of layouts. A drag-and-drop website builder is outside the first release.

### Customer kiosk

Customers need no installation or account for the initial ordering flow:

1. Open the business's published kiosk link.
2. Choose items, quantities, and options.
3. Review the cart and submit.
4. Receive an order number and expiry time.
5. Present the number to the cashier and pay at the counter.

Confirmation must clearly say that payment is still due. Submission does not mean payment has succeeded or preparation has started. Paused, closed, unpublished, or suspended kiosks must explain that ordering is unavailable and prevent new submissions.

### Kiosk POS

The cashier signs into the business workspace and opens Kiosk POS to:

- View pending kiosk orders and retrieve an order by number.
- Review items, quantities, options, price snapshot, total, expiry, and status.
- Resolve price or availability issues explicitly with the customer before payment. Any permitted adjustment is authorized, validated by the server, and audited.
- Collect payment at the counter and mark the kiosk order completed. Cash is the only payment method. The POS records cash received on the completed order and calculates change; no separate payment ledger is required.
- Cancel unpaid orders with appropriate permissions.
- Review completed orders and handle permitted refund/void records with an audit trail.
- Optionally print or reprint an order/payment summary through browser printing after completion.

Every completed order must originate from the kiosk. The POS has no blank counter cart, independent products, or general walk-in checkout. Browser printing and output layout require validation on pilot devices; direct thermal-printer control and hardware sales are outside the initial scope. A printout is not automatically an official tax invoice.

Payment recording initially means a staff member confirms counter payment. It is not automatic verification by a bank or payment provider. Online payment collection and third-party POS integrations are outside the first release.

### SaaS operator panel

The operator can create, activate, suspend, and manage business accounts; provision internally confirmed owner accounts; monitor service errors and order activity; and maintain platform limits. Support access must be restricted and logged.

Suspension blocks new public ordering and POS processing. Define owner access to history and exports separately, and show the reason and support route. Suspension must not silently erase records.

## Shared cloud data and access

The cloud is authoritative for business accounts, memberships, menu, branding, orders and audit history. All authenticated operations enforce business membership and role permissions on the server. A business identifier in a URL or browser request is not authorization.

Public kiosk access exposes only the published menu and the minimum information needed for that customer's order confirmation. Public order numbers must not enable browsing other customers' orders. Cashier lookup requires authenticated business access.

Use durable cloud storage, tested backups and restoration, and controlled migrations. Browser storage is not the authoritative order database. No offline submission or completion is promised.

## Order lifecycle and completion

| Status | Meaning |
| --- | --- |
| Pending | Submitted and awaiting the cashier |
| Completed | Cashier handled payment at the counter and marked the order completed |
| Expired | Not completed within the configured lifetime |
| Cancelled | Unpaid order cancelled by authorized staff |
| Refunded / voided | Authorized reversal noted in order history; detailed financial accounting is outside this release |

Store item names, selected options, quantities, and prices at submission. The server calculates totals and validates products, options, availability, hours, account status, and expiry; never trust a total supplied by the browser.

Order numbers are scoped to a business and appropriate time period; internal records use unique identifiers. Enforce expiry during lookup and completion even if a cleanup job has not run. Expired orders require a new kiosk submission using current prices and availability; they cannot be revived through a general counter sale.

Completion must durably save the order status and audit entry. Unique request identifiers and database constraints prevent double completion from repeated clicks, retries, or two cashiers. Show success only after server confirmation.

Preparation, ready, and collected states can be added later. Pending orders do not reserve stock in the initial release.

## Internet and failure behavior

The service requires a reachable cloud server. A Wi-Fi connection alone does not establish availability.

- If submission fails, preserve the cart where practical. Reconcile an uncertain submission using its request identifier before creating another order.
- If POS connectivity fails, show service unavailable and block retrieval and completion. Cached order details do not authorize offline processing.
- If connectivity fails during completion, preserve the request identifier and check the server outcome before retrying or claiming failure. Do not instruct staff to collect payment again.
- If payment was collected but completion remains unconfirmed, show an unresolved state for staff reconciliation. Do not silently discard it or claim a completed sale.
- If another cashier already completed an order, show its completed status and prevent another payment/completion action.
- If printing fails, the completed order remains saved. Reprint from history without collecting payment again.

## Free initial release

The platform is free for client businesses for now. There are no subscriptions, per-order fees, invoices to clients, billing screens, or billable-usage ledgers in the initial scope. The previous PHP 0.25 proposal is removed.

Customers still pay the business for their purchases at the counter. Staff mark the kiosk order completed after handling payment; a separate payment ledger, payment-method form, and financial reporting are not required for now. Keep order details, status, and completion history so staff can process orders reliably. Future monetization requires a separate product decision and is not implemented in advance.

## Expiry, abuse prevention, and retention

Owners choose an unpaid-order lifetime within platform limits; test defaults such as 15, 30, or 60 minutes during the pilot. The stable public kiosk link does not expire when an individual order expires. Owners can pause ordering without replacing the printed QR code.

Use submission limits, duplicate-submit protection, item/quantity limits, and caps on outstanding unpaid orders. Shared business Wi-Fi means IP addresses alone are insufficient for abuse controls. Add challenges only when warranted.

Define separate retention policies for unpaid orders, completed orders, and audit history. Expiry does not mean immediate deletion. Minimize customer personal data and establish export, backup, restoration, and retention procedures before production.

## Launch boundary

The kiosk POS records staff-confirmed payment and completion for kiosk orders. Official invoicing, applicable registration, tax reporting, and privacy requirements remain launch decisions to validate with qualified local advice. Browser delivery and a narrower feature set do not establish an exemption. This document makes no claim of accreditation or production compliance.

## Assessment and pilot goals

This scope is clearer and smaller than the earlier standalone POS proposal. The main value is a business-branded menu where customers compose their orders, followed by quick cashier retrieval without retyping. One menu also removes duplicate product maintenance.

The main product uncertainty is whether it makes counter service faster: customers still need to pay at the counter. Pilot with one or two businesses and measure time to submit, cashier lookup/completion time, corrections, abandoned orders, and whether staff consistently complete paid orders.

## First release

1. Tenant separation, owner/staff permissions, and operator-managed registration.
2. Business admin with menu, basic branding, preview/publish, stable link/QR, hours, and expiry settings.
3. Public mobile kiosk with cart, validated submission, order number, and expiry.
4. Web kiosk POS with pending list, lookup, staff-confirmed payment, completion, and failure reconciliation.
5. Order history, authorized cancellation/reversal records, and audit trail.
6. Basic owner/operator order reports, backups, and restoration checks.
7. Optional browser print layout after the core flow is validated.

Exclude Electron, offline POS, local SQLite catalogs, standalone walk-in sales, online payments, external POS integrations, advanced inventory, kitchen displays, multiple branches, delivery, loyalty, custom domains, and a page builder from the first release.

## Open decisions

- Pilot business type and target browser/device sizes.
- Final order lifetime, permitted price/availability adjustments, and refund/void policy.
- Whether the order number also serves as a pickup number.
- Recovery procedure when counter payment was collected but order completion is uncertain.
- Pilot onboarding and support terms for the free release.
- Print requirements and the merchant's official invoicing workflow.


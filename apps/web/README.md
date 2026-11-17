# Portable Kiosk frontend

React + Vite + TypeScript + Tailwind with generated shadcn UI components. See the root README for startup, account creation, and deployment.

The public kiosk is `/k/:slug`. Authenticated business owners use `/menu`, `/publishing`, `/settings`, and `/pos`. Platform operators use `/businesses`.

Only public Supabase URL/publishable-key values and API origin belong in `.env.local`. Run the root `scripts/configure-web.mjs` script to copy only those public values from the server environment. Never copy the root `.env` into this app.

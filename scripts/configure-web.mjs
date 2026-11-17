import { writeFile } from "node:fs/promises";
for (const key of ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"])
  if (!process.env[key]) throw new Error(`Missing ${key}`);
await writeFile(
  "apps/web/.env.local",
  `VITE_SUPABASE_URL=${process.env.SUPABASE_URL}\nVITE_SUPABASE_PUBLISHABLE_KEY=${process.env.SUPABASE_PUBLISHABLE_KEY}\nVITE_API_URL=\n`,
);
console.log("Frontend configured with public values only.");

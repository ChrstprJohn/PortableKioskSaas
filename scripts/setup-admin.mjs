import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { appendFile } from "node:fs/promises";
import { withDatabase, reportFailure } from "./lib/database.mjs";

// Local operator-only bootstrap; there is deliberately no public bootstrap endpoint.
try {
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@portablekiosk.local";
  const password =
    process.env.SUPER_ADMIN_PASSWORD || randomBytes(20).toString("base64url");
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await withDatabase(async (client) => {
    const existing = await client.query(
      "select id from auth.users where lower(email)=lower($1)",
      [email],
    );
    let id = existing.rows[0]?.id;
    if (!id) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      id = data.user.id;
      // Store the generated credential before granting access; never print it.
      if (!process.env.SUPER_ADMIN_EMAIL)
        await appendFile(".env", `\nSUPER_ADMIN_EMAIL=${email}\n`);
      if (!process.env.SUPER_ADMIN_PASSWORD)
        await appendFile(".env", `SUPER_ADMIN_PASSWORD=${password}\n`);
    } else if (
      !process.env.SUPER_ADMIN_EMAIL ||
      !process.env.SUPER_ADMIN_PASSWORD
    ) {
      throw new Error(
        "Existing admin email found; supply its known credentials in .env before continuing",
      );
    }
    await client.query(
      "insert into public.platform_operators(user_id) values ($1) on conflict do nothing",
      [id],
    );
    console.log(
      "Super admin ready. Sign-in credentials are in the root .env (SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD).",
    );
  });
} catch (error) {
  reportFailure(error);
}

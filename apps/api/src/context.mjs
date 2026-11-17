import { rateLimit } from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { pool } from "./db.mjs";
export const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
export const submissions = rateLimit({
  windowMs: 60000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many submissions. Wait a minute and try again." },
});
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new HttpError(status, message);
};
export const audit = (db, actor, business, action, target = null) =>
  db.query(
    "insert into public.audit_entries(actor_id,business_id,action,target_id) values ($1,$2,$3,$4)",
    [actor, business, action, target],
  );
export const businessColumns =
  "id,name,slug,owner_email,active,published,description,logo_url,accent_color,created_at";
export async function authenticate(req, _res, next) {
  const match = req.headers.authorization?.match(/^Bearer (.+)$/);
  if (!match) fail(401, "Sign in to continue.");
  const { data, error } = await admin.auth.getUser(match[1]);
  if (error || !data.user) fail(401, "Your session expired. Sign in again.");
  req.user = data.user;
  next();
}
export async function operatorOnly(req, _res, next) {
  const { rows } = await pool.query(
    "select 1 from public.platform_operators where user_id=$1",
    [req.user.id],
  );
  if (!rows.length) fail(403, "Platform operator access required.");
  next();
}
export async function businessOnly(req, _res, next) {
  const { rows } = await pool.query(
    `select b.*,m.role from public.business_memberships m join public.businesses b on b.id=m.business_id where m.user_id=$1`,
    [req.user.id],
  );
  if (!rows.length)
    fail(403, "No business workspace is assigned to this account.");
  if (!rows[0].active)
    fail(403, "This business is inactive. Contact the platform administrator.");
  req.business = rows[0];
  next();
}
export const ownerOnly = (req, _res, next) => {
  if (req.business.role !== "owner")
    fail(403, "Business owner access required.");
  next();
};
export async function activeBusiness(db, id, lock = "share") {
  const { rows } = await db.query(
    `select * from public.businesses where id=$1 for ${lock}`,
    [id],
  );
  if (!rows[0]?.active)
    fail(403, "This business is inactive. Contact the platform administrator.");
  return rows[0];
}
export async function expireOrders(db, business) {
  await db.query(
    "update public.kiosk_orders set status='expired' where business_id=$1 and status='pending' and expires_at <= now()",
    [business],
  );
}

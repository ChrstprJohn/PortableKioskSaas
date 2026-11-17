import { z } from "zod";
import { createHash, randomUUID } from "node:crypto";
import { pool, transaction } from "../db.mjs";
import {
  uuid,
  registration,
  menuItem,
  branding,
  orderInput,
  cashInput,
  validateImage,
} from "../validation.mjs";
import {
  admin,
  authenticate,
  operatorOnly,
  businessOnly,
  ownerOnly,
  activeBusiness,
  expireOrders,
  submissions,
  fail,
  audit,
  businessColumns,
} from "../context.mjs";
export function registerOperatorRoutes(app) {
  app.get("/api/me", authenticate, async (req, res) => {
    const operator = await pool.query(
      "select 1 from public.platform_operators where user_id=$1",
      [req.user.id],
    );
    if (operator.rows.length)
      return res.json({ role: "operator", email: req.user.email });
    const { rows } = await pool.query(
      "select b.*,m.role from public.business_memberships m join public.businesses b on b.id=m.business_id where m.user_id=$1",
      [req.user.id],
    );
    if (!rows.length)
      fail(403, "This account has no workspace. Contact the administrator.");
    if (!rows[0].active)
      fail(
        403,
        "This business is inactive. Contact the platform administrator.",
      );
    res.json({ role: rows[0].role, email: req.user.email, business: rows[0] });
  });
  app.use("/api/operator", authenticate, operatorOnly);
  app.get("/api/operator/businesses", async (_req, res) => {
    const { rows } = await pool.query(
      `select ${businessColumns},(select count(*)::int from public.menu_items m where m.business_id=b.id) as menu_count from public.businesses b order by created_at desc`,
    );
    res.json(rows);
  });
  app.post("/api/operator/businesses", async (req, res) => {
    const input = registration.parse(req.body);
    let createdUser;
    try {
      const business = await transaction(async (db) => {
        // Serializes retries, including while the external Auth account is provisioned.
        await db.query("select pg_advisory_xact_lock(hashtext($1))", [
          input.request_id,
        ]);
        const existing = await db.query(
          `select ${businessColumns} from public.businesses where registration_request_id=$1`,
          [input.request_id],
        );
        if (existing.rows.length) {
          if (
            existing.rows[0].slug !== input.slug ||
            existing.rows[0].owner_email !== input.email
          )
            fail(
              409,
              "Registration request already used. Refresh before creating another business.",
            );
          return existing.rows[0];
        }
        const duplicate = await db.query(
          "select 1 from public.businesses where slug=$1 or lower(owner_email)=lower($2)",
          [input.slug, input.email],
        );
        if (duplicate.rows.length)
          fail(409, "That kiosk address or owner email is already in use.");
        const { data, error } = await admin.auth.admin.createUser({
          email: input.email,
          password: input.password,
          email_confirm: true,
        });
        if (error)
          fail(
            error.status === 422 ? 409 : 400,
            "Account could not be created. Check the email and password, or use a different email.",
          );
        createdUser = data.user.id;
        const result = await db.query(
          `insert into public.businesses(name,slug,owner_email,registration_request_id) values ($1,$2,$3,$4) returning ${businessColumns}`,
          [input.name, input.slug, input.email, input.request_id],
        );
        const business = result.rows[0];
        await db.query(
          "insert into public.business_memberships(user_id,business_id) values ($1,$2)",
          [createdUser, business.id],
        );
        await audit(
          db,
          req.user.id,
          business.id,
          "business.created",
          business.id,
        );
        return business;
      });
      res.status(201).json(business);
    } catch (error) {
      if (createdUser) {
        const { error: cleanupError } =
          await admin.auth.admin.deleteUser(createdUser);
        if (cleanupError)
          console.error(
            "Provisioning cleanup requires attention for user",
            createdUser,
          );
      }
      throw error;
    }
  });
  app.patch("/api/operator/businesses/:id/status", async (req, res) => {
    const id = uuid.parse(req.params.id);
    const { active } = z
      .object({ active: z.boolean() })
      .strict()
      .parse(req.body);
    const result = await transaction(async (db) => {
      const result = await db.query(
        `update public.businesses set active=$1 where id=$2 returning ${businessColumns}`,
        [active, id],
      );
      if (!result.rows.length) fail(404, "Business not found.");
      await audit(
        db,
        req.user.id,
        id,
        active ? "business.activated" : "business.deactivated",
        id,
      );
      return result.rows[0];
    });
    res.json(result);
  });
}

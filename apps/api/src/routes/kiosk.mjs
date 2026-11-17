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
export function registerKioskRoutes(app) {
  app.get("/api/kiosks/:slug", async (req, res) => {
    const { rows } = await pool.query(
      "select id,name,slug,description,logo_url,accent_color from public.businesses where slug=$1 and active and published",
      [req.params.slug],
    );
    if (!rows.length)
      fail(
        404,
        "This kiosk is not accepting orders right now. Please check with the business.",
      );
    const business = rows[0];
    const items = await pool.query(
      "select id,name,description,category,price_centavos,image_url from public.menu_items where business_id=$1 and available order by category,created_at",
      [business.id],
    );
    res.json({ business, items: items.rows });
  });
  app.post("/api/kiosks/:slug/orders", submissions, async (req, res) => {
    const input = orderInput.parse(req.body);
    const hash = createHash("sha256")
      .update(
        JSON.stringify({
          items: [...input.items].sort((a, b) => a.id.localeCompare(b.id)),
          dining_mode: input.dining_mode,
        }),
      )
      .digest("hex");
    const order = await transaction(async (db) => {
      const { rows } = await db.query(
        "select * from public.businesses where slug=$1 for update",
        [req.params.slug],
      );
      const business = rows[0];
      if (!business?.active || !business.published)
        fail(404, "This kiosk is not accepting orders right now.");
      const previous = await db.query(
        "select id,code,items,total_centavos,status,expires_at,dining_mode from public.kiosk_orders where business_id=$1 and request_id=$2",
        [business.id, input.request_id],
      );
      if (previous.rows.length) {
        const stored = await db.query(
          "select request_hash from public.kiosk_orders where id=$1",
          [previous.rows[0].id],
        );
        if (stored.rows[0].request_hash !== hash)
          fail(
            409,
            "This request already created an order. Review its confirmation before submitting another cart.",
          );
        return previous.rows[0];
      }
      await expireOrders(db, business.id);
      const count = await db.query(
        "select count(*)::int as count from public.kiosk_orders where business_id=$1 and status='pending'",
        [business.id],
      );
      if (count.rows[0].count >= 500)
        fail(
          429,
          "The kiosk has too many pending orders. Please ask the cashier for help.",
        );
      const menu = await db.query(
        "select id,name,price_centavos from public.menu_items where business_id=$1 and available and id=any($2::uuid[])",
        [business.id, input.items.map((i) => i.id)],
      );
      if (menu.rows.length !== input.items.length)
        fail(
          409,
          "An item is no longer available. Refresh the menu and update your cart.",
        );
      const items = input.items.map((line) => ({
        ...menu.rows.find((i) => i.id === line.id),
        quantity: line.quantity,
      }));
      const total = items.reduce(
        (sum, i) => sum + i.price_centavos * i.quantity,
        0,
      );
      if (total > 100000000)
        fail(400, "Order total is too large. Please split the order.");
      const codes = await db.query(
        "select n::text as code from generate_series(1000,9999) n where not exists(select 1 from public.kiosk_orders where business_id=$1 and code=n::text and status='pending') order by random() limit 1",
        [business.id],
      );
      if (!codes.rows.length)
        fail(429, "No order numbers available. Please try later.");
      const result = await db.query(
        "insert into public.kiosk_orders(business_id,code,request_id,request_hash,items,total_centavos,dining_mode) values ($1,$2,$3,$4,$5::jsonb,$6,$7) returning id,code,items,total_centavos,status,expires_at,dining_mode",
        [
          business.id,
          codes.rows[0].code,
          input.request_id,
          hash,
          JSON.stringify(items),
          total,
          input.dining_mode,
        ],
      );
      return result.rows[0];
    });
    res.status(201).json(order);
  });
}

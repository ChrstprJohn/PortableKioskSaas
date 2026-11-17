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
export function registerOrdersRoutes(app) {
  app.get("/api/business/orders", async (req, res) => {
    const rows = await transaction(async (db) => {
      await expireOrders(db, req.business.id);
      return (
        await db.query(
          "select * from public.kiosk_orders where business_id=$1 order by created_at desc limit 100",
          [req.business.id],
        )
      ).rows;
    });
    res.json(rows);
  });
  app.get("/api/business/orders/lookup/:code", async (req, res) => {
    const code = z
      .string()
      .regex(/^\d{4}$/)
      .parse(req.params.code);
    const order = await transaction(async (db) => {
      await expireOrders(db, req.business.id);
      const { rows } = await db.query(
        "select * from public.kiosk_orders where business_id=$1 and code=$2 order by (status='pending') desc,created_at desc limit 1",
        [req.business.id, code],
      );
      if (!rows.length)
        fail(
          404,
          "No order with that number. Check the four digits and try again.",
        );
      return rows[0];
    });
    res.json(order);
  });
  app.post("/api/business/orders/:id/complete", async (req, res) => {
    const id = uuid.parse(req.params.id);
    const input = cashInput.parse(req.body);
    const result = await transaction(async (db) => {
      await activeBusiness(db, req.business.id);
      const { rows } = await db.query(
        "select * from public.kiosk_orders where id=$1 and business_id=$2 for update",
        [id, req.business.id],
      );
      const order = rows[0];
      if (!order) fail(404, "Order not found.");
      if (order.status === "completed") return order; // Reconcile lost responses without another payment.
      if (
        order.status !== "pending" ||
        new Date(order.expires_at) <= new Date()
      )
        fail(
          409,
          "This order is cancelled or expired and cannot be completed.",
        );
      if (input.cash_received_centavos < order.total_centavos)
        fail(400, "Cash received must cover the order total.");
      const completed = await db.query(
        "update public.kiosk_orders set status='completed',completed_at=now(),completed_by=$1,completion_request_id=$2,cash_received_centavos=$3 where id=$4 returning *",
        [req.user.id, input.request_id, input.cash_received_centavos, id],
      );
      await audit(db, req.user.id, req.business.id, "order.completed", id);
      return completed.rows[0];
    });
    res.json(result);
  });
  app.post("/api/business/orders/:id/cancel", async (req, res) => {
    const id = uuid.parse(req.params.id);
    const result = await transaction(async (db) => {
      await activeBusiness(db, req.business.id);
      await expireOrders(db, req.business.id);
      const { rows } = await db.query(
        "update public.kiosk_orders set status='cancelled' where id=$1 and business_id=$2 and status='pending' returning *",
        [id, req.business.id],
      );
      if (!rows.length)
        fail(409, "Only pending, unexpired orders can be cancelled.");
      await audit(db, req.user.id, req.business.id, "order.cancelled", id);
      return rows[0];
    });
    res.json(result);
  });
}

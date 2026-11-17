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
export function registerBusinessRoutes(app) {
  app.use("/api/business", authenticate, businessOnly);
  app.get("/api/business", (req, res) => res.json(req.business));
  app.patch("/api/business", ownerOnly, async (req, res) => {
    const input = branding.parse(req.body);
    const business = await transaction(async (db) => {
      await activeBusiness(db, req.business.id, "update");
      const { rows } = await db.query(
        "update public.businesses set name=$1,description=$2,accent_color=$3 where id=$4 returning *",
        [input.name, input.description, input.accent_color, req.business.id],
      );
      await audit(
        db,
        req.user.id,
        req.business.id,
        "business.branding.updated",
        req.business.id,
      );
      return rows[0];
    });
    res.json(business);
  });
  app.put("/api/business/publishing", ownerOnly, async (req, res) => {
    const { published } = z
      .object({ published: z.boolean() })
      .strict()
      .parse(req.body);
    const result = await transaction(async (db) => {
      await activeBusiness(db, req.business.id, "update");
      if (published) {
        const items = await db.query(
          "select 1 from public.menu_items where business_id=$1 and available limit 1",
          [req.business.id],
        );
        if (!items.rows.length)
          fail(400, "Add at least one available menu item before publishing.");
      }
      const { rows } = await db.query(
        "update public.businesses set published=$1 where id=$2 returning *",
        [published, req.business.id],
      );
      await audit(
        db,
        req.user.id,
        req.business.id,
        published ? "kiosk.published" : "kiosk.unpublished",
        req.business.id,
      );
      return rows[0];
    });
    res.json(result);
  });
  app.post("/api/business/logo", ownerOnly, async (req, res) => {
    const { mime, data } = z
      .object({ mime: z.string(), data: z.string().max(1400000) })
      .strict()
      .parse(req.body);
    if (!validateImage(mime, data))
      fail(400, "Use a PNG, JPEG, or WebP image up to 1 MB.");
    const extension = {
      "image/png": "png",
      "image/jpeg": "jpg",
      "image/webp": "webp",
    }[mime];
    const path = `${req.business.id}/${randomUUID()}.${extension}`;
    const result = await transaction(async (db) => {
      await activeBusiness(db, req.business.id, "update");
      const { error } = await admin.storage
        .from("business-logos")
        .upload(path, Buffer.from(data, "base64"), {
          contentType: mime,
          upsert: false,
        });
      if (error) fail(502, "Logo upload failed. Please try again.");
      const { data: uploaded } = admin.storage
        .from("business-logos")
        .getPublicUrl(path);
      const { rows } = await db.query(
        "update public.businesses set logo_url=$1 where id=$2 returning *",
        [uploaded.publicUrl, req.business.id],
      );
      await audit(
        db,
        req.user.id,
        req.business.id,
        "business.logo.updated",
        req.business.id,
      );
      return rows[0];
    });
    res.json(result);
  });
}

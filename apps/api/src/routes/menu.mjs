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
export function registerMenuRoutes(app) {
  app.post("/api/business/menu/:id/image", ownerOnly, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const { mime, data } = z
      .object({ mime: z.string(), data: z.string().max(1400000) })
      .strict()
      .parse(req.body);
    if (!validateImage(mime, data))
      fail(400, "Use a PNG, JPEG, or WebP photo up to 1 MB.");
    const item = await transaction(async (db) => {
      await activeBusiness(db, req.business.id);
      const found = await db.query(
        "select id from menu_items where id=$1 and business_id=$2 for update",
        [id, req.business.id],
      );
      if (!found.rows.length) fail(404, "Product not found.");
      const extension = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/webp": "webp",
      }[mime];
      const path = `${req.business.id}/${id}/${randomUUID()}.${extension}`;
      const { error } = await admin.storage
        .from("product-images")
        .upload(path, Buffer.from(data, "base64"), {
          contentType: mime,
          upsert: false,
        });
      if (error)
        fail(
          502,
          "Photo upload failed. Your product is saved; retry adding its photo.",
        );
      const { data: link } = admin.storage
        .from("product-images")
        .getPublicUrl(path);
      return (
        await db.query(
          "update menu_items set image_url=$1 where id=$2 and business_id=$3 returning *",
          [link.publicUrl, id, req.business.id],
        )
      ).rows[0];
    });
    res.json(item);
  });
  app.delete("/api/business/menu/:id/image", ownerOnly, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const item = await transaction(async (db) => {
      await activeBusiness(db, req.business.id);
      const { rows } = await db.query(
        "update menu_items set image_url=null where id=$1 and business_id=$2 returning *",
        [id, req.business.id],
      );
      if (!rows.length) fail(404, "Product not found.");
      return rows[0];
    });
    res.json(item);
  });

  app.get("/api/business/categories", async (req, res) => {
    const { rows } = await pool.query(
      "select id,name from public.menu_categories where business_id=$1 order by name",
      [req.business.id],
    );
    res.json(rows);
  });
  app.post("/api/business/categories", ownerOnly, async (req, res) => {
    const { name } = z
      .object({ name: z.string().trim().min(1).max(60) })
      .strict()
      .parse(req.body);
    const category = await transaction(async (db) => {
      await activeBusiness(db, req.business.id);
      const { rows } = await db.query(
        "insert into public.menu_categories(business_id,name) values($1,$2) on conflict (business_id,lower(name)) do update set name=menu_categories.name returning id,name",
        [req.business.id, name],
      );
      return rows[0];
    });
    res.status(201).json(category);
  });

  app.get("/api/business/menu", async (req, res) => {
    const { rows } = await pool.query(
      "select * from public.menu_items where business_id=$1 order by category,created_at",
      [req.business.id],
    );
    res.json(rows);
  });
  app.post("/api/business/menu", ownerOnly, async (req, res) => {
    const item = menuItem.parse(req.body);
    const result = await transaction(async (db) => {
      await activeBusiness(db, req.business.id);
      const { rows } = await db.query(
        "insert into public.menu_items(business_id,name,category,description,price_centavos,available) values ($1,$2,$3,$4,$5,$6) returning *",
        [
          req.business.id,
          item.name,
          item.category,
          item.description,
          item.price_centavos,
          item.available,
        ],
      );
      return rows[0];
    });
    res.status(201).json(result);
  });
  app.put("/api/business/menu/:id", ownerOnly, async (req, res) => {
    const id = uuid.parse(req.params.id);
    const item = menuItem.parse(req.body);
    const result = await transaction(async (db) => {
      await activeBusiness(db, req.business.id);
      const { rows } = await db.query(
        "update public.menu_items set name=$1,category=$2,description=$3,price_centavos=$4,available=$5 where id=$6 and business_id=$7 returning *",
        [
          item.name,
          item.category,
          item.description,
          item.price_centavos,
          item.available,
          id,
          req.business.id,
        ],
      );
      if (!rows.length) fail(404, "Menu item not found.");
      return rows[0];
    });
    res.json(result);
  });
  app.delete("/api/business/menu/:id", ownerOnly, async (req, res) => {
    const id = uuid.parse(req.params.id);
    await transaction(async (db) => {
      await activeBusiness(db, req.business.id);
      const result = await db.query(
        "delete from public.menu_items where id=$1 and business_id=$2 returning id",
        [id, req.business.id],
      );
      if (!result.rows.length) fail(404, "Menu item not found.");
      await audit(db, req.user.id, req.business.id, "menu.item.deleted", id);
    });
    res.status(204).end();
  });
}

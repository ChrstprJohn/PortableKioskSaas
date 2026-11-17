import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { app } from "../apps/api/src/app.mjs";
import { pool } from "../apps/api/src/db.mjs";

const options = { auth: { persistSession: false, autoRefreshToken: false } };
const auth = () =>
  createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    options,
  );
const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  options,
);
test("real Supabase: registration, tenant isolation, publishing, QR target, four-digit orders, cash POS, and deactivation", async (t) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const marker = randomUUID().slice(0, 8),
    emails = [];
  let operatorToken;
  const password = `Test-${randomUUID()}-pass`;
  const request = async (path, { token, body, method = "GET" } = {}) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      data: response.status === 204 ? null : await response.json(),
    };
  };
  const login = async (email, password) => {
    const client = auth();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    assert.equal(
      error,
      null,
      "Account should sign in without email verification",
    );
    return { token: data.session.access_token, client, user: data.user };
  };
  try {
    operatorToken = (
      await login(
        process.env.SUPER_ADMIN_EMAIL,
        process.env.SUPER_ADMIN_PASSWORD,
      )
    ).token;
    const registrations = [1, 2].map((n) => ({
      name: `Integration Kitchen ${n} ${marker}`,
      slug: `integration-${marker}-${n}`,
      email: `integration-${marker}-${n}@example.test`,
      password,
      request_id: randomUUID(),
    }));
    let businessA, businessB, ownerA, ownerB;
    await t.test(
      "operator provisions confirmed owner accounts and registration retries are safe",
      async () => {
        for (const input of registrations) emails.push(input.email);
        const a = await request("/operator/businesses", {
          token: operatorToken,
          method: "POST",
          body: registrations[0],
        });
        assert.equal(a.status, 201);
        businessA = a.data;
        const retry = await request("/operator/businesses", {
          token: operatorToken,
          method: "POST",
          body: registrations[0],
        });
        assert.equal(retry.data.id, businessA.id);
        const b = await request("/operator/businesses", {
          token: operatorToken,
          method: "POST",
          body: registrations[1],
        });
        assert.equal(b.status, 201);
        businessB = b.data;
        ownerA = await login(registrations[0].email, password);
        ownerB = await login(registrations[1].email, password);
        assert.equal(ownerA.user.email_confirmed_at !== null, true);
        assert.equal(
          (await request("/me", { token: ownerA.token })).data.business.id,
          businessA.id,
        );
        assert.equal(
          (await request("/operator/businesses", { token: ownerA.token }))
            .status,
          403,
        );
        assert.equal((await request("/operator/businesses")).status, 401);
        assert.equal((await request(`/kiosks/${businessA.slug}`)).status, 404);
        assert.equal(
          (
            await request("/business/publishing", {
              token: ownerA.token,
              method: "PUT",
              body: { published: true },
            })
          ).status,
          400,
        );
      },
    );
    await t.test(
      "categories persist independently and remain tenant isolated",
      async () => {
        const added = await request("/business/categories", {
          token: ownerA.token,
          method: "POST",
          body: { name: "Breakfast" },
        });
        assert.equal(added.status, 201);
        const repeated = await request("/business/categories", {
          token: ownerA.token,
          method: "POST",
          body: { name: "breakfast" },
        });
        assert.equal(repeated.data.id, added.data.id);
        assert.equal(
          (await request("/business/categories", { token: ownerA.token })).data
            .length,
          1,
        );
        assert.equal(
          (await request("/business/categories", { token: ownerB.token })).data
            .length,
          0,
        );
        const direct = await ownerB.client.from("menu_categories").select("id");
        assert.equal(direct.error, null);
        assert.equal(direct.data.length, 0);
      },
    );
    let item;
    await t.test(
      "menu CRUD, branding, logo validation, and RLS isolate businesses",
      async () => {
        const result = await request("/business/menu", {
          token: ownerA.token,
          method: "POST",
          body: {
            name: "House coffee",
            category: "Drinks",
            description: "Freshly brewed",
            price_centavos: 8500,
            available: true,
          },
        });
        assert.equal(result.status, 201);
        item = result.data;
        assert.equal(
          (await request("/business/menu", { token: ownerB.token })).data
            .length,
          0,
        );
        assert.equal(
          (
            await request(`/business/menu/${item.id}`, {
              token: ownerB.token,
              method: "PUT",
              body: {
                name: "Wrong tenant",
                category: "Drinks",
                price_centavos: 1,
                available: true,
              },
            })
          ).status,
          404,
        );
        assert.equal(
          (
            await request(`/business/menu/${item.id}`, {
              token: ownerB.token,
              method: "DELETE",
            })
          ).status,
          404,
        );
        const own = await ownerA.client.from("menu_items").select("id");
        assert.equal(own.error, null);
        assert.equal(own.data.length, 1);
        const other = await ownerB.client.from("menu_items").select("id");
        assert.equal(other.error, null);
        assert.equal(other.data.length, 0);
        const forbidden = await ownerB.client.from("menu_items").insert({
          business_id: businessA.id,
          name: "Attack",
          price_centavos: 1,
        });
        assert.ok(forbidden.error);
        const anonymous = await auth().from("menu_items").select("id");
        assert.ok(anonymous.error || anonymous.data.length === 0);
        const branding = await request("/business", {
          token: ownerA.token,
          method: "PATCH",
          body: {
            name: "Integration Coffee",
            description: "Coffee at the counter.",
            accent_color: "#225544",
          },
        });
        assert.equal(branding.status, 200);
        assert.equal(branding.data.name, "Integration Coffee");
        assert.equal(
          (
            await request("/business/logo", {
              token: ownerA.token,
              method: "POST",
              body: { mime: "image/svg+xml", data: "PHN2Zz4=" },
            })
          ).status,
          400,
        );
        const logo = await request("/business/logo", {
          token: ownerA.token,
          method: "POST",
          body: {
            mime: "image/png",
            data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5uQAAAAASUVORK5CYII=",
          },
        });
        assert.equal(logo.status, 200);
        assert.match(logo.data.logo_url, /business-logos/);
        const image = await fetch(logo.data.logo_url);
        assert.equal(image.status, 200);
      },
    );
    await t.test(
      "optional product photos use tenant-scoped Supabase Storage and can be removed",
      async () => {
        const photo = {
          mime: "image/png",
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5uQAAAAASUVORK5CYII=",
        };
        assert.equal(
          (
            await request(`/business/menu/${item.id}/image`, {
              token: ownerB.token,
              method: "POST",
              body: photo,
            })
          ).status,
          404,
        );
        assert.equal(
          (
            await request(`/business/menu/${item.id}/image`, {
              token: ownerA.token,
              method: "POST",
              body: { mime: "image/svg+xml", data: "PHN2Zz4=" },
            })
          ).status,
          400,
        );
        const first = await request(`/business/menu/${item.id}/image`, {
          token: ownerA.token,
          method: "POST",
          body: photo,
        });
        assert.equal(first.status, 200);
        assert.match(first.data.image_url, /product-images/);
        assert.equal((await fetch(first.data.image_url)).status, 200);
        const second = await request(`/business/menu/${item.id}/image`, {
          token: ownerA.token,
          method: "POST",
          body: photo,
        });
        assert.equal(second.status, 200);
        assert.notEqual(first.data.image_url, second.data.image_url);
        assert.equal(
          (
            await request(`/business/menu/${item.id}/image`, {
              token: ownerB.token,
              method: "DELETE",
            })
          ).status,
          404,
        );
        const removed = await request(`/business/menu/${item.id}/image`, {
          token: ownerA.token,
          method: "DELETE",
        });
        assert.equal(removed.status, 200);
        assert.equal(removed.data.image_url, null);
      },
    );
    let order;
    await t.test(
      "publishing exposes only public menu and server calculates exact order totals",
      async () => {
        assert.equal(
          (
            await request("/business/publishing", {
              token: ownerA.token,
              method: "PUT",
              body: { published: true },
            })
          ).status,
          200,
        );
        const kiosk = await request(`/kiosks/${businessA.slug}`);
        assert.equal(kiosk.status, 200);
        assert.equal(kiosk.data.items.length, 1);
        assert.equal(kiosk.data.business.owner_email, undefined);
        const input = {
          dining_mode: "dine_in",
          request_id: randomUUID(),
          items: [{ id: item.id, quantity: 2 }],
        };
        const submitted = await request(`/kiosks/${businessA.slug}/orders`, {
          method: "POST",
          body: input,
        });
        assert.equal(submitted.status, 201);
        order = submitted.data;
        assert.match(order.code, /^\d{4}$/);
        assert.equal(order.total_centavos, 17000);
        assert.equal(order.dining_mode, "dine_in");
        const modeChange = await request(`/kiosks/${businessA.slug}/orders`, {
          method: "POST",
          body: { ...input, dining_mode: "takeout" },
        });
        assert.equal(
          modeChange.status,
          409,
          "Retry cannot change dining choice",
        );
        const replay = await request(`/kiosks/${businessA.slug}/orders`, {
          method: "POST",
          body: input,
        });
        assert.equal(replay.data.id, order.id);
        assert.equal(
          (
            await request(`/kiosks/${businessA.slug}/orders`, {
              method: "POST",
              body: { ...input, items: [{ id: item.id, quantity: 3 }] },
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await request(`/kiosks/${businessA.slug}/orders`, {
              method: "POST",
              body: {
                request_id: randomUUID(),
                items: [{ id: item.id, quantity: 1 }],
                total_centavos: 1,
              },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(`/kiosks/${businessB.slug}/orders`, {
              method: "POST",
              body: {
                request_id: randomUUID(),
                items: [{ id: item.id, quantity: 1 }],
              },
            })
          ).status,
          404,
        );
      },
    );
    await t.test(
      "cash lookup, insufficient cash, simultaneous completion, and snapshots",
      async () => {
        const lookup = await request(`/business/orders/lookup/${order.code}`, {
          token: ownerA.token,
        });
        assert.equal(lookup.data.id, order.id);
        assert.equal(
          (
            await request(`/business/orders/lookup/${order.code}`, {
              token: ownerB.token,
            })
          ).status,
          404,
        );
        const changed = await request(`/business/menu/${item.id}`, {
          token: ownerA.token,
          method: "PUT",
          body: {
            name: "Coffee renamed",
            category: "Drinks",
            price_centavos: 9900,
            available: true,
          },
        });
        assert.equal(changed.status, 200);
        assert.equal(
          (
            await request(`/business/orders/${order.id}/complete`, {
              token: ownerA.token,
              method: "POST",
              body: { request_id: randomUUID(), cash_received_centavos: 100 },
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await request(`/business/orders/${order.id}/complete`, {
              token: ownerB.token,
              method: "POST",
              body: { request_id: randomUUID(), cash_received_centavos: 20000 },
            })
          ).status,
          404,
        );
        const body = {
          request_id: randomUUID(),
          cash_received_centavos: 20000,
        };
        const results = await Promise.all([
          request(`/business/orders/${order.id}/complete`, {
            token: ownerA.token,
            method: "POST",
            body,
          }),
          request(`/business/orders/${order.id}/complete`, {
            token: ownerA.token,
            method: "POST",
            body,
          }),
        ]);
        assert.ok(
          results.every(
            (r) => r.status === 200 && r.data.status === "completed",
          ),
        );
        assert.equal(results[0].data.total_centavos, 17000);
        assert.equal(results[0].data.items[0].name, "House coffee");
        const audits = await pool.query(
          "select count(*)::int as count from public.audit_entries where target_id=$1 and action='order.completed'",
          [order.id],
        );
        assert.equal(audits.rows[0].count, 1);
      },
    );
    await t.test(
      "expiry, cancellation, publication state, and immediate deactivation",
      async () => {
        const newOrder = async () =>
          (
            await request(`/kiosks/${businessA.slug}/orders`, {
              method: "POST",
              body: {
                request_id: randomUUID(),
                items: [{ id: item.id, quantity: 1 }],
              },
            })
          ).data;
        const expired = await newOrder();
        await pool.query(
          "update public.kiosk_orders set expires_at=now()-interval '1 minute' where id=$1",
          [expired.id],
        );
        assert.equal(
          (
            await request(`/business/orders/${expired.id}/complete`, {
              token: ownerA.token,
              method: "POST",
              body: { request_id: randomUUID(), cash_received_centavos: 10000 },
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await request(`/business/orders/lookup/${expired.code}`, {
              token: ownerA.token,
            })
          ).data.status,
          "expired",
        );
        const cancelled = await newOrder();
        assert.equal(
          (
            await request(`/business/orders/${cancelled.id}/cancel`, {
              token: ownerA.token,
              method: "POST",
            })
          ).data.status,
          "cancelled",
        );
        assert.equal(
          (
            await request("/business/publishing", {
              token: ownerA.token,
              method: "PUT",
              body: { published: false },
            })
          ).status,
          200,
        );
        assert.equal((await request(`/kiosks/${businessA.slug}`)).status, 404);
        await request("/business/publishing", {
          token: ownerA.token,
          method: "PUT",
          body: { published: true },
        });
        assert.equal(
          (
            await request(`/operator/businesses/${businessA.id}/status`, {
              token: operatorToken,
              method: "PATCH",
              body: { active: false },
            })
          ).status,
          200,
        );
        assert.equal(
          (await request("/me", { token: ownerA.token })).status,
          403,
        );
        assert.equal(
          (await request("/business/menu", { token: ownerA.token })).status,
          403,
        );
        assert.equal((await request(`/kiosks/${businessA.slug}`)).status, 404);
        const blocked = await ownerA.client.from("menu_items").select("id");
        assert.equal(blocked.data.length, 0);
        await request(`/operator/businesses/${businessA.id}/status`, {
          token: operatorToken,
          method: "PATCH",
          body: { active: true },
        });
        assert.equal(
          (await request("/business/menu", { token: ownerA.token })).status,
          200,
        );
      },
    );
  } finally {
    // Only this test run's explicitly named, disposable fixtures are removed.
    for (const email of emails) {
      const businesses = await pool.query(
        "select id from public.businesses where owner_email=$1",
        [email],
      );
      for (const b of businesses.rows) {
        const products = await pool.query(
          "select id from menu_items where business_id=$1",
          [b.id],
        );
        for (const product of products.rows) {
          const prefix = `${b.id}/${product.id}`;
          const { data: photos } = await admin.storage
            .from("product-images")
            .list(prefix);
          if (photos?.length)
            await admin.storage
              .from("product-images")
              .remove(photos.map((photo) => `${prefix}/${photo.name}`));
        }
        const { data } = await admin.storage.from("business-logos").list(b.id);
        if (data?.length)
          await admin.storage
            .from("business-logos")
            .remove(data.map((f) => `${b.id}/${f.name}`));
      }
      await pool.query("delete from public.businesses where owner_email=$1", [
        email,
      ]);
      const user = await pool.query(
        "select id from auth.users where email=$1",
        [email],
      );
      for (const u of user.rows) await admin.auth.admin.deleteUser(u.id);
    }
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});

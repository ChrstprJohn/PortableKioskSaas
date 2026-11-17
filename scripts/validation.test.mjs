import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  registration,
  orderInput,
  cashInput,
  validateImage,
} from "../apps/api/src/validation.mjs";
test("registration rejects unsafe addresses and weak passwords", () => {
  const valid = {
    name: "Mcdogs",
    slug: "mcdogs",
    email: "owner@example.test",
    password: "a-strong-password",
    request_id: randomUUID(),
  };
  assert.ok(registration.safeParse(valid).success);
  assert.equal(
    registration.safeParse({ ...valid, slug: "../other" }).success,
    false,
  );
  assert.equal(
    registration.safeParse({ ...valid, password: "short" }).success,
    false,
  );
  assert.equal(
    registration.safeParse({ ...valid, active: true }).success,
    false,
  );
});
test("orders reject duplicate lines, client totals and invalid quantities", () => {
  const line = { id: randomUUID(), quantity: 2 },
    input = { request_id: randomUUID(), items: [line] };
  assert.ok(orderInput.safeParse(input).success);
  assert.equal(
    orderInput.safeParse({ ...input, items: [line, line] }).success,
    false,
  );
  assert.equal(orderInput.safeParse({ ...input, total: 1 }).success, false);
  assert.equal(
    orderInput.safeParse({ ...input, items: [{ ...line, quantity: 0 }] })
      .success,
    false,
  );
  assert.equal(
    cashInput.safeParse({
      request_id: randomUUID(),
      cash_received_centavos: 1.5,
    }).success,
    false,
  );
});
test("logo validation rejects SVG, mismatched content and oversized uploads", () => {
  assert.equal(validateImage("image/svg+xml", "PHN2Zz4="), false);
  assert.equal(
    validateImage("image/png", Buffer.from("not an image").toString("base64")),
    false,
  );
  assert.equal(
    validateImage("image/png", Buffer.alloc(1048577).toString("base64")),
    false,
  );
});

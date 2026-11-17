import { z } from "zod";
export const uuid = z.uuid();
export const registration = z
  .object({
    name: z.string().trim().min(1).max(100),
    slug: z
      .string()
      .min(3)
      .max(60)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(12).max(128),
    request_id: uuid,
  })
  .strict();
export const menuItem = z
  .object({
    name: z.string().trim().min(1).max(100),
    category: z.string().trim().min(1).max(60),
    description: z.string().trim().max(500).default(""),
    price_centavos: z.number().int().min(1).max(10000000),
    available: z.boolean().default(true),
  })
  .strict();
export const branding = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(300),
    accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  })
  .strict();
export const orderInput = z
  .object({
    request_id: uuid,
    dining_mode: z.enum(["dine_in", "takeout"]).default("takeout"),
    items: z
      .array(
        z
          .object({ id: uuid, quantity: z.number().int().min(1).max(20) })
          .strict(),
      )
      .min(1)
      .max(50),
  })
  .strict()
  .refine(
    (v) => new Set(v.items.map((i) => i.id)).size === v.items.length,
    "Duplicate cart items",
  );
export const cashInput = z
  .object({
    request_id: uuid,
    cash_received_centavos: z.number().int().min(1).max(100000000),
  })
  .strict();
export function validateImage(mime, data) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(mime) ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(data)
  )
    return false;
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length || bytes.length > 1048576) return false;
  if (mime === "image/png")
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg")
    return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return (
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  );
}

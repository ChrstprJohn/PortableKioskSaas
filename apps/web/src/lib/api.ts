import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (session) headers.set("Authorization", `Bearer ${session.access_token}`);
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_API_URL || ""}/api${path}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new Error(
      "Connection interrupted. Keep this page open and retry to check the result.",
    );
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({
    error: "Server returned an unreadable response. Please try again.",
  }));
  if (!response.ok)
    throw new Error(data.error || "Request failed. Please try again.");
  return data as T;
}
export const json = (body: unknown) => JSON.stringify(body);
export const money = (value: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(
    value / 100,
  );
export function centavos(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw new Error("Enter an amount with at most two decimal places.");
  const [pesos, cents = ""] = value.split(".");
  const result = Number(pesos) * 100 + Number(cents.padEnd(2, "0"));
  if (!Number.isSafeInteger(result)) throw new Error("Amount is too large.");
  return result;
}
export type Business = {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  active: boolean;
  published: boolean;
  description: string;
  logo_url: string | null;
  accent_color: string;
  created_at: string;
  menu_count?: number;
};
export type MenuItem = {
  image_url?: string | null;
  id: string;
  name: string;
  category: string;
  description: string;
  price_centavos: number;
  available?: boolean;
};
export type OrderLine = {
  id: string;
  name: string;
  price_centavos: number;
  quantity: number;
};
export type Order = {
  dining_mode: "dine_in" | "takeout";
  id: string;
  code: string;
  items: OrderLine[];
  total_centavos: number;
  status: string;
  expires_at: string;
  created_at?: string;
  cash_received_centavos?: number;
  completed_at?: string;
};
export type Profile = {
  role: "operator" | "owner" | "cashier";
  email: string;
  business?: Business;
};

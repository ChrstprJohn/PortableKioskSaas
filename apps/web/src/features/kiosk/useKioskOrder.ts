import type { DiningMode } from "@/features/business/DiningChoice";
import { api, json, type Business, type MenuItem, type Order } from "@/lib/api";
import { useEffect, useRef, useState } from "react";
type Cart = Record<string, number>;
type SavedCart = {
  cart: Cart;
  requestId: string;
  confirmation: Order | null;
  locked: boolean;
  dining?: DiningMode;
};
export function useKioskOrder(slug: string | undefined) {
  const storageKey = `kiosk-cart:${slug}`;
  const initial = useRef<SavedCart | null>(null);
  if (!initial.current) {
    try {
      initial.current = JSON.parse(
        sessionStorage.getItem(storageKey) || "null",
      );
    } catch {
      /* Storage may be unavailable. */
    }
    initial.current ??= {
      cart: {},
      requestId: crypto.randomUUID(),
      confirmation: null,
      locked: false,
    };
  }
  const [data, setData] = useState<{
      business: Business;
      items: MenuItem[];
    } | null>(null),
    [cart, setCart] = useState<Cart>(initial.current.cart),
    [confirmation, setConfirmation] = useState<Order | null>(
      initial.current.confirmation,
    ),
    [locked, setLocked] = useState(initial.current.locked),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [review, setReview] = useState(initial.current.locked),
    [category, setCategory] = useState("All"),
    [attempt, setAttempt] = useState(0);
  const [dining, setDining] = useState<DiningMode | undefined>(
    initial.current.dining,
  );
  const request = useRef(initial.current.requestId);
  useEffect(() => {
    let alive = true;
    setError("");
    api<{ business: Business; items: MenuItem[] }>(`/kiosks/${slug}`)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [slug, attempt]);
  function persist(next: SavedCart) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* In-memory retry still works when browser storage is disabled. */
    }
  }
  useEffect(
    () =>
      persist({
        cart,
        requestId: request.current,
        confirmation,
        locked,
        dining,
      }),
    [cart, confirmation, locked, dining],
  );
  const lines =
    data?.items
      .filter((i) => cart[i.id])
      .map((i) => ({ ...i, quantity: cart[i.id] })) || [];
  const total = lines.reduce((n, i) => n + i.quantity * i.price_centavos, 0),
    count = lines.reduce((n, i) => n + i.quantity, 0);
  const stale = Object.keys(cart).some(
    (id) => cart[id] > 0 && !data?.items.some((i) => i.id === id),
  );
  function quantity(id: string, delta: number) {
    if (locked) return;
    setCart((current) => {
      const next = {
        ...current,
        [id]: Math.max(0, Math.min(20, (current[id] || 0) + delta)),
      };
      if (!next[id]) delete next[id];
      return next;
    });
    setError("");
  }
  async function submit() {
    if (!lines.length || stale) return;
    setBusy(true);
    setError("");
    setLocked(true);
    persist({
      cart,
      requestId: request.current,
      confirmation: null,
      locked: true,
      dining,
    });
    try {
      const result = await api<Order>(`/kiosks/${slug}/orders`, {
        method: "POST",
        body: json({
          request_id: request.current,
          dining_mode: dining,
          items: lines.map((i) => ({ id: i.id, quantity: i.quantity })),
        }),
      });
      setConfirmation(result);
      persist({
        cart,
        requestId: request.current,
        confirmation: result,
        locked: true,
        dining,
      });
    } catch (e) {
      setError(
        (e as Error).message +
          " Retry this same order before starting a new one.",
      );
    } finally {
      setBusy(false);
    }
  }
  function reset() {
    request.current = crypto.randomUUID();
    setCart({});
    setDining(undefined);
    setConfirmation(null);
    setLocked(false);
    setReview(false);
    setError("");
    persist({
      cart: {},
      requestId: request.current,
      confirmation: null,
      locked: false,
    });
  }
  return {
    data,
    cart,
    confirmation,
    locked,
    error,
    busy,
    review,
    category,
    attempt,
    dining,
    lines,
    total,
    count,
    stale,
    quantity,
    submit,
    reset,
    setReview,
    setCategory,
    setAttempt,
    setDining,
  };
}

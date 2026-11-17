import { useEffect, useRef, useState } from "react";

import { Banknote, CheckCircle2, RefreshCw, Search } from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { api, centavos, json, money, type Order } from "@/lib/api";

import {
  Empty,
  ErrorMessage,
  Field,
  Heading,
  Loading,
  Status,
} from "@/components/shared";

export function POS() {
  const [orders, setOrders] = useState<Order[]>([]),
    [selected, setSelected] = useState<Order | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [lookupError, setLookupError] = useState(""),
    [refreshError, setRefreshError] = useState(""),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState(""),
    [cash, setCash] = useState(""),
    [filter, setFilter] = useState("pending"),
    [lastUpdated, setLastUpdated] = useState("");

  const detail = useRef<HTMLElement>(null);

  useEffect(() => {
    if (selected?.id && window.matchMedia("(max-width: 767px)").matches) {
      detail.current?.focus({ preventScroll: true });

      detail.current?.scrollIntoView({ block: "start" });
    }
  }, [selected?.id]);

  const completion = useRef(crypto.randomUUID());

  const selectedId = useRef<string | undefined>(undefined);

  async function refresh() {
    setLoading(true);

    try {
      const rows = await api<Order[]>("/business/orders");

      setOrders(rows);

      setRefreshError("");

      setLastUpdated(
        new Date().toLocaleTimeString("en-PH", {
          hour: "2-digit",

          minute: "2-digit",
        }),
      );

      setSelected((previous) =>
        previous
          ? rows.find((o) => o.id === previous.id) || previous
          : previous,
      );
    } catch (e) {
      setRefreshError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function select(order: Order) {
    setError("");

    if (selectedId.current !== order.id) {
      completion.current = crypto.randomUUID();

      selectedId.current = order.id;

      setCash("");
    }

    setSelected(order);
  }

  async function lookup(e: React.FormEvent) {
    e.preventDefault();

    setBusy(true);

    setLookupError("");

    try {
      select(await api<Order>(`/business/orders/lookup/${code}`));
    } catch (e) {
      setLookupError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function complete(e: React.FormEvent) {
    e.preventDefault();

    if (!selected) return;

    setBusy(true);

    setError("");

    try {
      const amount = centavos(cash);

      if (amount < selected.total_centavos)
        throw new Error("Cash received must cover the order total.");

      const saved = await api<Order>(
        `/business/orders/${selected.id}/complete`,

        {
          method: "POST",

          body: json({
            request_id: completion.current,

            cash_received_centavos: amount,
          }),
        },
      );

      setSelected(saved);

      setOrders((rows) => rows.map((o) => (o.id === saved.id ? saved : o)));

      toast.success(`Order ${saved.code} completed`);
    } catch (e) {
      setError(
        (e as Error).message +
          " Check this order again before collecting any further payment.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!selected) return;

    setBusy(true);

    try {
      const saved = await api<Order>(`/business/orders/${selected.id}/cancel`, {
        method: "POST",
      });

      setSelected(saved);

      setOrders((rows) => rows.map((o) => (o.id === saved.id ? saved : o)));

      toast.success("Unpaid order cancelled");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const visible = orders.filter((o) => filter === "all" || o.status === filter);

  let change: number | null = null;

  try {
    change = centavos(cash) - (selected?.total_centavos || 0);
  } catch {
    /* Empty or partial cash input. */
  }

  return (
    <>
      <Heading
        title="Kiosk POS"

        description="Find their number. Confirm the order. Keep the counter moving."
      >
        <Button
          variant="outline"
          onClick={() => refresh()}
          disabled={busy || loading}
        >
          <RefreshCw className={loading ? "animate-spin" : undefined} />
          {loading ? "Refreshing…" : "Refresh"}
        </Button>
      </Heading>

      <div className="pos-layout">
        <section className="order-queue">
          <form
            method="get"

            onSubmit={lookup}

            className="lookup-form"

            aria-label="Find kiosk order"
          >
            <Field
              label="Four-digit order number"

              name="code"

              value={code}

              onChange={(e) => setCode(e.target.value)}

              type="text"

              inputMode="numeric"

              pattern="[0-9]{4}"

              maxLength={4}

              minLength={4}

              placeholder="1234"

              autoComplete="off"

              required
            />

            <Button type="submit" disabled={busy}>
              <Search size={16} />
              Find order
            </Button>
          </form>

          <ErrorMessage message={lookupError} />

          <ErrorMessage message={refreshError} />

          <div className="tabs" aria-label="Order view">
            {["pending", "all"].map((f) => (
              <button
                key={f}

                type="button"

                className={filter === f ? "selected" : ""}

                aria-pressed={filter === f}

                onClick={() => setFilter(f)}
              >
                {f === "pending" ? "Pending" : "Recent orders"}

                <span>
                  {f === "pending"
                    ? orders.filter((o) => o.status === "pending").length
                    : orders.length}
                </span>
              </button>
            ))}
          </div>

          <p className="queue-freshness">
            {lastUpdated
              ? `Updated ${lastUpdated} · Updates when you refresh`
              : "Orders load only when you find or refresh."}
          </p>

          {loading ? (
            <Loading />
          ) : !visible.length ? (
            <Empty title="Ready to find an order.">
              Customer orders will appear here after they submit through your
              kiosk.
            </Empty>
          ) : (
            <div className="order-list">
              {visible.map((o) => (
                <button
                  key={o.id}

                  className={`order-row ${selected?.id === o.id ? "selected" : ""}`}

                  onClick={() => select(o)}
                >
                  <span className="order-code">{o.code}</span>

                  <span className="order-row-details">
                    <strong>
                      {o.items.reduce((n, i) => n + i.quantity, 0)} items
                    </strong>

                    <Status value={o.status} />
                  </span>

                  <span className="price">{money(o.total_centavos)}</span>
                </button>
              ))}
            </div>
          )}

          <p className="hint">
            Showing the latest 100 orders. Look up older orders by number.
          </p>
        </section>

        <section
          className="order-detail"

          ref={detail}

          tabIndex={-1}

          aria-label="Order details"
        >
          {selected ? (
            <>
              <div className="detail-header">
                <div>
                  <p>
                    Customer order ·{" "}
                    {selected.dining_mode === "dine_in" ? "Dine in" : "Takeout"}
                  </p>

                  <h2>#{selected.code}</h2>
                </div>

                <Status value={selected.status} />
              </div>

              {selected.status === "pending" && (
                <p className="hint">
                  Pay before{" "}
                  {new Date(selected.expires_at).toLocaleTimeString("en-PH", {
                    hour: "2-digit",

                    minute: "2-digit",
                  })}
                  . Confirm the items with the customer.
                </p>
              )}

              <ul className="order-lines">
                {selected.items.map((i) => (
                  <li key={i.id}>
                    <span>
                      <b>{i.quantity}×</b> {i.name}
                    </span>

                    <span>{money(i.quantity * i.price_centavos)}</span>
                  </li>
                ))}
              </ul>

              <div className="order-total">
                <span>Total due</span>

                <strong>{money(selected.total_centavos)}</strong>
              </div>

              {selected.status === "pending" ? (
                <form
                  method="post"

                  onSubmit={complete}

                  aria-label="Cash checkout"
                >
                  <div className="cash-label">
                    <Banknote size={18} />

                    <span>Cash payment</span>
                  </div>

                  <Field
                    label="Cash received (PHP)"

                    name="cash"

                    value={cash}

                    onChange={(e) => setCash(e.target.value)}

                    type="text"

                    inputMode="decimal"

                    pattern="[0-9]+(\.[0-9]{1,2})?"

                    required

                    placeholder="0.00"
                  />

                  <div className="change-due">
                    <span>Change</span>

                    <strong>
                      {change !== null && change >= 0 ? money(change) : "—"}
                    </strong>
                  </div>

                  <p className="hint">
                    Complete only after collecting cash. If a request times out,
                    retry to check the result.
                  </p>

                  <Button type="submit" disabled={busy} className="w-full">
                    {busy ? "Checking completion…" : "Confirm cash & complete"}
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"

                        variant="ghost"

                        disabled={busy}

                        className="w-full mt-2"
                      >
                        Cancel unpaid order
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Cancel order #{selected.code}?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                          Use this only if no payment has been collected. A
                          cancelled order cannot be completed.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep order</AlertDialogCancel>

                        <AlertDialogAction onClick={cancel}>
                          Cancel unpaid order
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </form>
              ) : selected.status === "completed" ? (
                <div className="completion-notice" role="status">
                  <CheckCircle2 size={24} />

                  <h3>Cash payment completed</h3>

                  <p>
                    Cash received: {money(selected.cash_received_centavos || 0)}
                  </p>

                  <p>
                    Change:{" "}
                    {money(
                      (selected.cash_received_centavos || 0) -
                        selected.total_centavos,
                    )}
                  </p>

                  <span>Do not collect payment again.</span>
                </div>
              ) : (
                <p className="error-message">
                  This order is {selected.status}. Ask the customer to submit a
                  new kiosk order if needed.
                </p>
              )}
            </>
          ) : (
            <Empty title="Ready when they are.">
              Select a pending order or enter the customer's four-digit number
              to get started.
            </Empty>
          )}

          <ErrorMessage message={error} />
        </section>
      </div>
    </>
  );
}

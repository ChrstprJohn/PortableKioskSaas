import { BusinessLogo } from "@/components/BusinessLogo";
import { ProductImage } from "@/components/ProductImage";
import { Empty, ErrorMessage, Loading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { DiningChoice } from "@/features/business/DiningChoice";
import { Quantity } from "@/features/kiosk/Quantity";
import { ResetCartDialog } from "@/features/kiosk/ResetCartDialog";
import { useKioskOrder } from "@/features/kiosk/useKioskOrder";
import { money } from "@/lib/api";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  ShoppingBag,
  Store,
} from "lucide-react";
import { type CSSProperties } from "react";
import { useParams } from "react-router-dom";

export function Kiosk() {
  const { slug } = useParams();
  const {
    data,
    cart,
    confirmation,
    locked,
    error,
    busy,
    review,
    category,
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
  } = useKioskOrder(slug);
  if (!data)
    return (
      <main className="kiosk-unavailable">
        <Store size={32} />
        <h1>{error ? "Kiosk unavailable" : "Opening the menu…"}</h1>
        {error ? (
          <>
            <ErrorMessage message={error} />
            <Button variant="outline" onClick={() => setAttempt((a) => a + 1)}>
              Try again
            </Button>
          </>
        ) : (
          <Loading />
        )}
      </main>
    );
  const { business, items } = data;
  const categories = ["All", ...new Set(items.map((i) => i.category))];
  return (
    <div
      className="public-kiosk"
      style={{ "--business-accent": business.accent_color } as CSSProperties}
    >
      <header className="kiosk-header">
        <a href={`/k/${slug}`} className="kiosk-business">
          <BusinessLogo src={business.logo_url} name={business.name} />
          <span>{business.name}</span>
        </a>
        <span className="kiosk-counter-note">
          Order here. Pay at the counter.
        </span>
      </header>
      <main className="kiosk-content">
        {!dining && !confirmation ? (
          <DiningChoice onChoose={setDining} />
        ) : confirmation ? (
          <section className="order-confirmation">
            <span className="confirmation-check">
              <Check size={28} />
            </span>
            <h1>Your order is in.</h1>
            <p>Show this number to the cashier and pay at the counter.</p>
            <div
              className="confirmation-number"
              aria-label={`Order number ${confirmation.code}`}
            >
              {confirmation.code}
            </div>
            <p className="confirmation-expiry">
              Pay before{" "}
              {new Date(confirmation.expires_at).toLocaleTimeString("en-PH", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <ul className="order-lines">
              {confirmation.items.map((i) => (
                <li key={i.id}>
                  <span>
                    {i.quantity}× {i.name}
                  </span>
                  <span>{money(i.quantity * i.price_centavos)}</span>
                </li>
              ))}
            </ul>
            <div className="order-total">
              <span>Total to pay</span>
              <strong>{money(confirmation.total_centavos)}</strong>
            </div>
            <p className="hint">
              Payment is still due. Your order number is not proof of payment.
            </p>
            <Button variant="outline" onClick={reset}>
              Start another order
            </Button>
          </section>
        ) : review ? (
          <section className="cart-page">
            <Button
              variant="ghost"
              onClick={() => setReview(false)}
              disabled={locked}
            >
              <ArrowLeft />
              Back to menu
            </Button>
            <h1>Your order</h1>
            <p>{dining === "dine_in" ? "Dine in" : "Takeout"}</p>
            {!locked && (
              <Button variant="ghost" onClick={() => setDining(undefined)}>
                Change dining choice
              </Button>
            )}
            <p className="section-description">
              Looking good? Send it through, then pay at the counter.
            </p>
            {stale && (
              <ErrorMessage message="Your cart includes an item that is no longer available. Start a fresh cart to review the current menu." />
            )}
            <div className="cart-lines">
              {lines.map((i) => (
                <article key={i.id}>
                  <div>
                    <h2>{i.name}</h2>
                    <p>{money(i.price_centavos)} each</p>
                    <Quantity
                      value={i.quantity}
                      onMinus={() => quantity(i.id, -1)}
                      onPlus={() => quantity(i.id, 1)}
                      disabled={locked}
                    />
                  </div>
                  <strong>{money(i.price_centavos * i.quantity)}</strong>
                </article>
              ))}
            </div>
            <div className="order-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            <p className="hint">
              Cash payment at the counter. Unpaid orders expire after 30
              minutes.
            </p>
            <ErrorMessage message={error} />
            <Button
              className="w-full"
              onClick={submit}
              disabled={busy || !count || stale}
            >
              {busy
                ? "Sending your order…"
                : locked
                  ? "Retry & check this order"
                  : "Place order"}
              <ArrowRight size={16} />
            </Button>
            {(stale || locked) && (
              <ResetCartDialog busy={busy} onReset={reset} />
            )}
          </section>
        ) : (
          <>
            <Button variant="ghost" onClick={() => setDining(undefined)}>
              {dining === "dine_in" ? "Dine in" : "Takeout"} · Change
            </Button>
            <section className="kiosk-welcome">
              <div>
                <h1>What sounds good?</h1>
                <p>
                  {business.description ||
                    `Welcome to ${business.name}. Pick your favorites and make yourself at home.`}
                </p>
              </div>
              <div className="kiosk-service">
                <span className="status-dot" />
                Fresh orders, straight to the counter
              </div>
            </section>
            <nav className="category-tabs" aria-label="Menu categories">
              {categories.map((c) => (
                <button
                  type="button"
                  className={category === c ? "selected" : ""}
                  key={c}
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                >
                  {c}
                </button>
              ))}
            </nav>
            {items.length === 0 ? (
              <Empty title="The menu is taking a short break.">
                Please check with the business or come back soon.
              </Empty>
            ) : (
              <div className="public-menu">
                {[
                  ...new Set(
                    items
                      .filter(
                        (i) => category === "All" || i.category === category,
                      )
                      .map((i) => i.category),
                  ),
                ].map((c) => (
                  <section key={c}>
                    <h2>{c}</h2>
                    <div className="public-menu-grid">
                      {items
                        .filter((i) => i.category === c)
                        .map((item) => (
                          <article key={item.id} className="public-menu-item">
                            <ProductImage
                              src={item.image_url}
                              name={item.name}
                            />
                            <div className="public-item-description">
                              <h3>{item.name}</h3>
                              {item.description && <p>{item.description}</p>}
                              <strong>{money(item.price_centavos)}</strong>
                            </div>
                            {cart[item.id] ? (
                              <Quantity
                                value={cart[item.id]}
                                onMinus={() => quantity(item.id, -1)}
                                onPlus={() => quantity(item.id, 1)}
                                disabled={locked}
                              />
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                aria-label={`Add ${item.name}`}
                                onClick={() => quantity(item.id, 1)}
                              >
                                <Plus size={18} />
                              </Button>
                            )}
                          </article>
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
            {count > 0 && (
              <div className="cart-bar">
                <span>
                  <ShoppingBag size={18} />
                  {count} {count === 1 ? "item" : "items"}
                  <strong>{money(total)}</strong>
                </span>
                <Button onClick={() => setReview(true)}>
                  Review order
                  <ArrowRight size={16} />
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <footer className="kiosk-footer">
        {business.name}
        <span>Powered by Portable Kiosk</span>
      </footer>
    </div>
  );
}

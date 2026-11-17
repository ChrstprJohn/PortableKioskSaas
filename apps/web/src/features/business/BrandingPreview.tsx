import { BusinessLogo } from "@/components/BusinessLogo";
import type { Business } from "@/lib/api";
export function BrandingPreview({ business }: { business: Business }) {
  return (
    <aside className="branding-preview" aria-label="Live kiosk preview">
      <h2>Live preview</h2>
      <p>Try your changes here before saving.</p>
      <div
        className="preview-phone"
        style={{ borderTopColor: business.accent_color }}
      >
        <header>
          <BusinessLogo src={business.logo_url} name={business.name} />
          <strong>{business.name || "Your business"}</strong>
        </header>
        <h3>What sounds good?</h3>
        <p>{business.description || "Your welcome message appears here."}</p>
        <div className="preview-product">
          <strong>Your menu item</strong>
          <span>Item description</span>
          <b>₱125.00</b>
        </div>
        <div className="preview-action">Review order</div>
      </div>
      <small>
        Illustrative item. Your saved menu stays unchanged until you save.
      </small>
    </aside>
  );
}

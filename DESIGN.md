---
name: Portable Kiosk
description: A calm framed workspace for small-business menus and cash orders.
colors:
  primary: "#203d31"
  brand: "#176b58"
  frame: "#f1f5f2"
  sheet: "#ffffff"
  ink: "#182923"
  secondary-text: "#58675f"
  edge: "#e2e8e4"
  input-stroke: "#91a297"
  selected: "#e4ebe6"
  accent: "#eaf0ed"
  positive: "#23613b"
  positive-surface: "#e9f4ed"
  pending: "#7c5309"
  pending-surface: "#fff3d9"
  inactive: "#93403d"
  inactive-surface: "#f8eded"
  destructive: "#b4232d"
typography:
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.5
  input:
    fontFamily: "Manrope, sans-serif"
    fontSize: "16px"
rounded:
  status: "4px"
  control: "6px"
  panel: "8px"
  owner-product: "10px"
  public-product: "12px"
  dining-choice: "14px"
  preview: "0px"
  sheet: "16px"
spacing:
  field-gap: "8px"
  action-gap: "12px"
  panel-padding: "28px"
  desktop-content: "36px"
  mobile-content: "18px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  input:
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.control}"
    height: "44px"
  status-active:
    backgroundColor: "{colors.positive-surface}"
    textColor: "{colors.positive}"
    rounded: "{rounded.status}"
    padding: "3px 8px"
  panel:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.panel}"
    padding: "28px"
---

# Design System: Portable Kiosk

## Overview

**Creative North Star: "The Framed Sheet"**

Mode: Operate. Preserve the framed-sheet direction (seed 782776925): a pale green-grey frame, white content sheet, restrained borders, and neutral navigation. It supports day-to-day business work with clear labels, compact lists, and explicit actions. The storefront mark and business-specific kiosk address/status identify each workspace.

**Key Characteristics:**
- Quiet green neutrals and flat surfaces.
- Self-hosted Manrope for small-business owners and customer menus.
- Legible status text and tabular order figures.

## Colors

The palette combines deep forest actions with a pale green-grey frame. Primary is for decisive actions; brand is for the storefront mark, caret, and focus. Sheet, ink, secondary-text, edge, and input-stroke establish the reading hierarchy. Selected fills identify active navigation.

Positive text and surface mark available, published, active, or completed states; amber marks pending; muted red marks inactive, cancelled, or expired. Destructive identifies validation and destructive controls.

**The Fixed Contrast Rule.** Owner color is decorative only; controls and text retain the system palette.

## Typography

Display and body use self-hosted Manrope with sans-serif fallback, imported at weights 400, 500, 600, and 700. This deliberately overrides the dealt IBM Plex Sans direction to suit small businesses.

Workspace headlines use the headline token, becoming 24px on mobile. Secondary copy is generally 12–13px; field text stays 16px. Public kiosk headlines are 32px, becoming 28px on mobile. Login display text scales from 30px to 52px. Money and order numbers use tabular figures; confirmation numbers receive stronger size and tracking.

## Layout

The desktop sidebar frames a white inset sheet. Content has 36px horizontal padding, reducing to 24px at viewport widths up to 1100px and 18px up to 767px. Form, settings, publish, and POS layouts pair a working area with contextual information, QR, or order detail; they stack on mobile. At 767px and below the sidebar becomes a sheet and the content sheet loses its border and rounding.

The public kiosk uses a centered content area up to 1120px, horizontally scrollable category navigation, and a fixed cart summary with reserved content space beneath the menu. Product cards use an auto-fill grid with a 260px minimum public card width and a 280px minimum owner card width, both bounded by available space. Card counts follow available width, including on small screens. Tables compress their secondary information rather than inventing dashboard metrics.

Branding settings place a sticky draft preview to the right (260–340px column); at 900px and below it moves into the document flow with a 380px maximum width. Dining choice uses two large cards and stacks at 600px and below.

## Elevation & Depth

Resting workspace surfaces, controls, and panels have no shadows. Borders, background tones, whitespace, and the frame distinguish hierarchy. Generated modal and sheet overlays retain their component layering. The category picker is a raised popover with a subtle shadow (`0 8px 24px #18292318`); this temporary overlay is distinct from flat resting panels. Focus uses a brand-colored ring; this is an interaction cue rather than resting elevation.

Motion is functional: generated component transitions and the loading spinner. Reduced-motion preferences shorten animation and transition durations to 0.01ms.

## Shapes

Controls are gently curved, panels slightly softer, and the desktop content sheet most rounded. Status badges use the smallest radius. The fixed public cart summary has a 10px radius. Product cards have 10px owner and 12px public corners; image slots use 8px corners. Dining choice cards use 14px corners. The branding preview intentionally has square corners and a thick 6px owner-accent top border, matching the kiosk silhouette rather than imitating a rounded phone. Borders are thin and restrained; inputs use the stronger input-stroke token.

## Components

- **Buttons:** shadcn primitives with primary, outline, ghost, and destructive treatments. Minimum height is 40px on desktop and 44px on mobile; semibold labels; visible focus rings; disabled opacity and pointer blocking. Hover changes fill without lift.
- **Fields:** visible 13px semibold labels, 16px input text, 44px minimum input height, and linked hints. Textareas resize vertically. Explicit submit actions preserve the user's control over changes.
- **Navigation:** neutral sidebar rows become selected through a pale fill and semibold ink. Workspace tabs use an underline; public category buttons use a filled selected state.
- **Status badges:** a small dot accompanies a written status on a tinted background. Color is supplementary.
- **Panels and lists:** bordered panels contain forms, QR, or POS detail. Product menus use bordered cards with price, availability, and actions grouped together; business tables use dividers; empty states use a dashed boundary and a concrete explanation.
- **Feedback:** inline errors use an announced alert; loading uses a status region. Confirmation dialogs guard destructive actions; Sonner supplies notifications.
- **Product photos:** optional photos are saved to Supabase when the product is saved. A fixed 20:13 slot uses cover cropping, lazy loading, asynchronous decoding, and intrinsic 400×260 dimensions. Missing or failed images retain that slot with a neutral icon and the product name. Uploads accept PNG, JPEG, or WebP up to 1 MB.
- **Category picker:** a full-width labeled trigger opens a searchable popover. Existing product and persisted categories remain selectable; creating a category explicitly persists it and selects the result. Loading and creation failures remain visible.
- **Branding preview:** edits to name, description, accent, and staged logo appear immediately in an unsaved draft. Save commits changes; discard restores saved details. The illustrative product and review action are preview content. A failed multi-step save can retain an already uploaded logo; the error explains the partial save and keeps other edits for retry.
- **Public order flow:** Dine in or Takeout precedes the menu, quantity controls, cart review, and four-digit confirmation number. Order codes and cash totals are visually prominent.
- **POS:** orders load through explicit lookup or refresh, without polling. Freshness text explains this behavior; lookup, refresh, and payment errors have separate feedback contexts. Dining mode appears with order detail.

## Do's and Don'ts

### Do:
- **Do** retain the pale frame, white sheet, and flat resting surfaces.
- **Do** keep field labels visible and pair status color with text.
- **Do** use tabular figures for money and order numbers.
- **Do** keep owner branding decorative and fixed system contrast on controls.

### Don't:
- **Don't** replace Manrope with the original developer-oriented type direction.
- **Don't** add fabricated charts or totals.
- **Don't** use resting shadows to distinguish workspace panels.

Source of implementation truth: `apps/web/src/index.css`, `main.tsx`, shared components, and generated shadcn primitives. UI responsibilities are grouped under `features/business`, `features/kiosk`, and `features/workspace`; API routes are modular. Product images live in `components/ProductImage.tsx`; branding, category, dining, and POS patterns live in `features/business`. This document captures the implemented light interface; generated dark variant scaffolding is not a separate established visual direction.

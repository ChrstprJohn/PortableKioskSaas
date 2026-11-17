import { ErrorMessage, Heading, Status } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, json, type Business } from "@/lib/api";
import { Copy, Download, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export function Publishing({
  business,
  onChange,
}: {
  business: Business;
  onChange: (b: Business) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const qr = useRef<HTMLDivElement>(null);
  const link = `${window.location.origin}/k/${business.slug}`;
  async function publish() {
    setBusy(true);
    setError("");
    try {
      const updated = await api<Business>("/business/publishing", {
        method: "PUT",
        body: json({ published: !business.published }),
      });
      onChange(updated);
      toast.success(
        updated.published ? "Your kiosk is live" : "Your kiosk is unpublished",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function download() {
    const svg = qr.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
      type: "image/svg+xml",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${business.slug}-kiosk-qr.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <Heading
        title="Publish & share"
        description="Your menu is ready to go places."
      />
      <div className="publish-layout">
        <section>
          <div className="publish-status">
            <Status value={business.published ? "published" : "draft"} />
            <h2>
              {business.published
                ? "Your kiosk is live."
                : "Make your menu public."}
            </h2>
            <p>
              {business.published
                ? "Customers can scan your QR code, choose their items, and bring their order number to the counter."
                : "Add at least one available item, then publish. Customers will be able to order using the link below."}
            </p>
            <Button disabled={busy} onClick={publish}>
              {busy
                ? "Updating…"
                : business.published
                  ? "Unpublish kiosk"
                  : "Publish kiosk"}
            </Button>
            <ErrorMessage message={error} />
          </div>
          <div className="share-link">
            <h2>One link. Every customer.</h2>
            <p>
              Your address and QR code stay the same when you update the menu.
            </p>
            <Label htmlFor="public-link">Public kiosk link</Label>
            <Input id="public-link" value={link} readOnly />
            <div className="flex gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() =>
                  navigator.clipboard
                    .writeText(link)
                    .then(() => toast.success("Kiosk link copied"))
                    .catch(() =>
                      toast.error(
                        "Clipboard unavailable. Select and copy the link.",
                      ),
                    )
                }
              >
                <Copy />
                Copy link
              </Button>
              <Button variant="outline" asChild>
                <a href={link} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  Open kiosk
                </a>
              </Button>
            </div>
          </div>
        </section>
        <aside className="qr-panel">
          <div ref={qr} className="qr-code">
            <QRCodeSVG
              value={link}
              size={200}
              marginSize={4}
              title={`${business.name} kiosk QR`}
            />
          </div>
          <h2>{business.name}</h2>
          <p>Scan. Choose. Pay at the counter.</p>
          <Button variant="outline" onClick={download}>
            <Download />
            Download QR code
          </Button>
          <small>
            {business.published
              ? "Ready to print and share."
              : "The link accepts orders after publishing."}
          </small>
        </aside>
      </div>
    </>
  );
}

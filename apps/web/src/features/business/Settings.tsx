import { ErrorMessage, Field, Heading } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, json, type Business } from "@/lib/api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BrandingPreview } from "./BrandingPreview";
export function Settings({
  business,
  onChange,
}: {
  business: Business;
  onChange: (b: Business) => void;
}) {
  const [draft, setDraft] = useState(business),
    [image, setImage] = useState<{ mime: string; data: string } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dirty =
    !!image ||
    ["name", "description", "accent_color"].some(
      (key) => draft[key as keyof Business] !== business[key as keyof Business],
    );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function selectImage(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      if (
        file.size > 1048576 ||
        !["image/png", "image/jpeg", "image/webp"].includes(file.type)
      )
        throw new Error("Choose a PNG, JPEG, or WebP up to 1 MB.");
      const url = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () =>
          reject(
            new Error("Could not read this image. Please choose another."),
          );
        reader.readAsDataURL(file);
      });
      setImage({ mime: file.type, data: url.split(",")[1] });
      setDraft((current) => ({ ...current, logo_url: url }));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      let savedLogo = business.logo_url;
      if (image) {
        const result = await api<Business>("/business/logo", {
          method: "POST",
          body: json(image),
        });
        savedLogo = result.logo_url;
        onChange(result);
        setImage(null);
      }
      const result = await api<Business>("/business", {
        method: "PATCH",
        body: json({
          name: draft.name,
          description: draft.description,
          accent_color: draft.accent_color,
        }),
      });
      const saved = { ...result, logo_url: savedLogo };
      onChange(saved);
      setDraft(saved);
      toast.success("Business details saved");
    } catch (e) {
      setError(
        (e as Error).message +
          " Any logo already uploaded is saved; other changes remain here for retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        title="Business settings"
        description="Try your brand on the kiosk before publishing changes."
      />
      <div className="settings-with-preview">
        <section className="setting-label">
          <h2>Your business identity</h2>
          <p>Names, colors, and your logo appear in the preview as you edit.</p>
        </section>
        <form
          className="form-panel"
          aria-label="Business details"
          method="post"
          onSubmit={save}
        >
          <Field
            label="Business name"
            name="name"
            value={draft.name}
            required
            maxLength={100}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <div className="field">
            <Label htmlFor="business-description">Short description</Label>
            <Textarea
              id="business-description"
              name="description"
              maxLength={300}
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </div>
          <Field
            label="Brand color"
            name="accent_color"
            type="color"
            value={draft.accent_color}
            onInput={(e) =>
              setDraft({ ...draft, accent_color: e.currentTarget.value })
            }
            className="color-input"
            hint="Adds your brand accent while keeping text easy to read."
          />
          <div className="field">
            <Label htmlFor="logo-file">Business logo</Label>
            <Input
              id="logo-file"
              name="logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              onChange={(e) => selectImage(e.target.files?.[0])}
            />
            <p className="hint">
              PNG, JPEG, or WebP, up to 1 MB. Previewed now; uploaded when you
              save.
            </p>
          </div>
          <ErrorMessage message={error} />
          <p className="hint" role="status">
            {dirty ? "You have unsaved changes." : "Your changes are saved."}
          </p>
          <div className="form-actions">
            <Button
              type="button"
              variant="outline"
              disabled={busy || !dirty}
              onClick={() => {
                setDraft(business);
                setImage(null);
                setError("");
              }}
            >
              Discard changes
            </Button>
            <Button type="submit" disabled={busy || !dirty}>
              {busy ? "Saving changes…" : "Save changes"}
            </Button>
          </div>
        </form>
        <BrandingPreview business={draft} />
      </div>
    </>
  );
}

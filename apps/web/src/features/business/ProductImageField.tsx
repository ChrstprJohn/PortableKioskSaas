import { useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorMessage } from "@/components/shared";
export type ImageUpload = { mime: string; data: string };
export function ProductImageField({
  existing,
  name,
  onChange,
}: {
  existing?: string | null;
  name: string;
  onChange: (value: ImageUpload | null) => void;
}) {
  const [preview, setPreview] = useState(existing),
    [error, setError] = useState("");
  async function select(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      if (
        file.size > 1048576 ||
        !["image/png", "image/jpeg", "image/webp"].includes(file.type)
      )
        throw new Error("Use a PNG, JPEG, or WebP photo up to 1 MB.");
      const url = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () =>
          reject(new Error("Could not read this photo. Try another file."));
        r.readAsDataURL(file);
      });
      setPreview(url);
      onChange({ mime: file.type, data: url.split(",")[1] });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="field">
      <Label htmlFor="product-image-file">Product photo (optional)</Label>
      <ProductImage src={preview} name={name || "Product"} />
      <Input
        id="product-image-file"
        name="photo"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => select(e.target.files?.[0])}
      />
      <p className="hint">
        PNG, JPEG, or WebP up to 1 MB. Saved to Supabase when you save the
        product.
      </p>
      {preview && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPreview(null);
            onChange(null);
          }}
        >
          Remove photo
        </Button>
      )}
      <ErrorMessage message={error} />
    </div>
  );
}

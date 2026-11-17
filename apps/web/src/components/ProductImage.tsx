import { ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
export function ProductImage({
  src,
  name,
}: {
  src?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className="product-image">
      {src && !failed ? (
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          width={400}
          height={260}
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="product-image-fallback"
          aria-label={`${name}: no photo`}
        >
          <ImageIcon size={28} strokeWidth={1.25} />
          <span>{name}</span>
        </div>
      )}
    </div>
  );
}

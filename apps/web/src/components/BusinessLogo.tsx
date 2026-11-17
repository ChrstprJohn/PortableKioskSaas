import { useEffect, useState } from "react";
export function BusinessLogo({
  src,
  name,
}: {
  src?: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return src && !failed ? (
    <img
      src={src}
      alt={`${name} logo`}
      width={44}
      height={44}
      onError={() => setFailed(true)}
    />
  ) : (
    <span className="kiosk-monogram" aria-hidden="true">
      {name.slice(0, 2).toUpperCase()}
    </span>
  );
}

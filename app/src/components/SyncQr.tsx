import { useEffect, useState } from "react";

// qrcode is only needed on the sync screen, so it loads on demand.
export function SyncQr({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void import("qrcode").then(({ default: QRCode }) =>
      QRCode.toDataURL(url, { margin: 1, width: 192 }).then((data) => {
        if (live) setSrc(data);
      })
    );
    return () => {
      live = false;
    };
  }, [url]);
  return src ? (
    <img src={src} alt="QR code for the sync link" width={192} height={192} className="rounded-sm bg-white" />
  ) : (
    <div className="size-48 rounded-sm bg-muted" aria-hidden />
  );
}

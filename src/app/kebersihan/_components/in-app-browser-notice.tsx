"use client";

import { useEffect, useState } from "react";

function isInAppBrowser(userAgent: string) {
  return /(FBAN|FBAV|Instagram|Line|WhatsApp|; wv\))/i.test(userAgent);
}

/**
 * Downloads and the share sheet are unreliable inside the WhatsApp and
 * Instagram web views, and the failure is silent, so participants are told to
 * switch browsers before they lose their work.
 */
export function InAppBrowserNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(isInAppBrowser(navigator.userAgent));
  }, []);

  if (!show) return null;

  return (
    <div className="rounded-lg border border-warning bg-warning/10 p-4 text-sm">
      Anda membuka halaman ini dari dalam aplikasi. Agar tombol simpan dan
      bagikan berfungsi, ketuk menu <strong>⋮</strong> lalu pilih{" "}
      <strong>Buka di Chrome</strong> atau <strong>Buka di Safari</strong>.
    </div>
  );
}

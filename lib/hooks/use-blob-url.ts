"use client";

import { useEffect, useState } from "react";

/** Bir Dexie tablosunda saklanan Blob'u (fotoğraf) çözüp geçici bir object URL'e çevirir. */
export function useBlobUrl(getBlob: () => Promise<Blob | undefined>, deps: unknown[]): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    getBlob().then((blob) => {
      if (!active || !blob) return;
      created = URL.createObjectURL(blob);
      setUrl(created);
    });
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return url;
}

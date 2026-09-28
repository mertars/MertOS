/** Fotoğrafları IndexedDB'ye yazmadan önce sıkıştırır (canvas ile yeniden boyutlandırma). */
export async function compressImageFile(file: File | Blob, maxDim = 1280, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas bağlamı oluşturulamadı");
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Görsel sıkıştırılamadı"))),
      "image/jpeg",
      quality,
    );
  });
}

export function blobToObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

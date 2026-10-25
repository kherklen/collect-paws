// Shrink a photo in the browser so uploads are quick on mobile data:
// longest side at most 1024 px, saved as JPEG. The result keeps the original's
// lastModified time, so /capture can tell a fresh photo from an old one.
export async function shrinkPhoto(file: File, maxSide = 1024, quality = 0.8): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(new File([blob], "photo.jpg", { type: "image/jpeg", lastModified: file.lastModified }))
          : reject(new Error("Couldn't read that photo")),
      "image/jpeg",
      quality,
    ),
  );
}

// Photos older than this were picked from the gallery or files, not just taken.
const FRESH_MS = 10 * 60 * 1000;

export function isFreshPhoto(photo: Blob) {
  return !(photo instanceof File) || Date.now() - photo.lastModified <= FRESH_MS;
}

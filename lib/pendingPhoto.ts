// Hands the photo taken from the paw button over to /capture.
// Lives in memory, so it survives the in-app navigation but not a reload.
let pending: Blob | null = null;

export function setPendingPhoto(photo: Blob | null) {
  pending = photo;
}

export function peekPendingPhoto() {
  return pending;
}

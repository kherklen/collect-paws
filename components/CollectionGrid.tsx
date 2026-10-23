"use client";

// My Collection: a three-column grid of the person's own captures.
// Captures arrive in slice 2; for now it shows the empty state.
export default function CollectionGrid() {
  return (
    <div className="h-full overflow-y-auto bg-canvas px-4 pb-32 pt-24">
      <div className="mx-auto mt-16 max-w-xs text-center">
        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-5xl">
          🐱
        </div>
        <h2 className="text-xl font-extrabold">No friends yet!</h2>
        <p className="mt-2 text-muted">
          Spot a stray cat or dog and tap the paw button to add it to your collection.
        </p>
      </div>
    </div>
  );
}

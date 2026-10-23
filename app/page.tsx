import { Suspense } from "react";
import MainShell from "@/components/MainShell";

// The main screen. MainShell reads the active tab from the URL,
// which needs a Suspense boundary.
export default function Home() {
  return (
    <Suspense>
      <MainShell />
    </Suspense>
  );
}

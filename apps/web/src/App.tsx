import { Loading } from "@/components/shared";
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
const Workspace = lazy(() => import("@/features/workspace/Workspace"));
const Kiosk = lazy(() =>
  import("@/pages/Kiosk").then((m) => ({ default: m.Kiosk })),
);
export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/k/:slug" element={<Kiosk />} />
        <Route path="*" element={<Workspace />} />
      </Routes>
    </Suspense>
  );
}

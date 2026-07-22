import { lazy, Suspense } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";
import { Route, Routes } from "react-router-dom";

import RouteFallback from "./components/RouteFallback";
import WebsiteLayout from "./layouts/WebsiteLayout";
import loadMotionFeatures from "./utils/loadMotionFeatures";

const HomePage = lazy(() => import("./pages/HomePage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

export default function App() {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route element={<WebsiteLayout />}>
              <Route index element={<HomePage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </MotionConfig>
    </LazyMotion>
  );
}

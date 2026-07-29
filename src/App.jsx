import { lazy, Suspense } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";
import { Navigate, Route, Routes } from "react-router-dom";

import AdminRoute from "./components/auth/AdminRoute";
import RouteFallback from "./components/RouteFallback";
import WebsiteLayout from "./layouts/WebsiteLayout";
import loadMotionFeatures from "./utils/loadMotionFeatures";

const HomePage = lazy(() => import("./pages/HomePage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const OrderSuccessPage = lazy(() => import("./pages/OrderSuccessPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const PasswordResetPage = lazy(() => import("./pages/PasswordResetPage"));
const EmailVerificationPage = lazy(() => import("./pages/EmailVerificationPage"));
const KisanDigitalPage = lazy(() => import("./pages/KisanDigitalPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const FaqPage = lazy(() => import("./pages/FaqPage"));
const LegalPage = lazy(() => import("./pages/LegalPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const BlogArticlePage = lazy(() => import("./pages/BlogArticlePage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminLogoutPage = lazy(() => import("./pages/AdminLogoutPage"));
const AdminPasswordPage = lazy(() => import("./pages/AdminPasswordPage"));

export default function App() {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="admin/login" element={<AdminLoginPage />} />
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<Navigate replace to="/admin/dashboard" />} />
              <Route path="admin/logout" element={<AdminLogoutPage />} />
              <Route path="admin/change-password" element={<AdminPasswordPage />} />
              <Route path="admin/dashboard" element={<AdminPage />} />
              <Route path="admin/content" element={<AdminPage initialModule="content" />} />
            </Route>
            <Route element={<WebsiteLayout />}>
              <Route index element={<HomePage />} />
              <Route path="shop" element={<ShopPage />} />
              <Route path="shop/:slug" element={<ProductPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="category/:categoryId" element={<CategoryPage />} />
              <Route path="features" element={<FeaturesPage />} />
              <Route path="kisan-digital" element={<KisanDigitalPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="policies/:slug" element={<LegalPage />} />
              <Route path="blog" element={<BlogPage />} />
              <Route path="blog/:slug" element={<BlogArticlePage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="order-success/:orderId" element={<OrderSuccessPage />} />
              <Route path="forgot-password" element={<PasswordResetPage />} />
              <Route path="reset-password" element={<PasswordResetPage />} />
              <Route path="verify-email" element={<EmailVerificationPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </MotionConfig>
    </LazyMotion>
  );
}

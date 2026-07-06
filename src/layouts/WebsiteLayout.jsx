import { Outlet } from "react-router-dom";

import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import ScrollToHash from "../components/ScrollToHash";
import { commonContent } from "../data/commonContent";
import useLanguage from "../hooks/useLanguage";

export default function WebsiteLayout() {
  const { language } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <ScrollToHash />
      <a
        className="fixed left-4 top-4 z-[60] -translate-y-24 rounded-control bg-primary-800 px-4 py-2 text-sm font-semibold text-on-primary transition-transform focus:translate-y-0"
        href="#main-content"
      >
        {commonContent[language].skipToContent}
      </a>
      <Navbar />
      <main className="flex-1" id="main-content">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

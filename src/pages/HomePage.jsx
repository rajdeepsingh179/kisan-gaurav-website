import AboutBrandSection from "../components/home/AboutBrandSection";
import AgriculturePlatformSection from "../components/home/AgriculturePlatformSection";
import CommerceHeroSection from "../components/home/CommerceHeroSection";
import FaqSection from "../components/home/FaqSection";
import FeaturedProductsSection from "../components/home/FeaturedProductsSection";
import FoodBenefitsSection from "../components/home/FoodBenefitsSection";
import PackagingSection from "../components/home/PackagingSection";
import ReviewsSection from "../components/home/ReviewsSection";
import ShopByCategorySection from "../components/home/ShopByCategorySection";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useLanguage from "../hooks/useLanguage";

export default function HomePage() {
  const { language } = useLanguage();
  useDocumentTitle(language === "hi" ? "मुखपृष्ठ" : "Home");

  return (
    <>
      <CommerceHeroSection />
      <FeaturedProductsSection />
      <ShopByCategorySection />
      <FoodBenefitsSection />
      <PackagingSection />
      <ReviewsSection />
      <AgriculturePlatformSection />
      <AboutBrandSection />
      <FaqSection />
    </>
  );
}

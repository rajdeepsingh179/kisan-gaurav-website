import CtaSection from "../components/home/CtaSection";
import FaqSection from "../components/home/FaqSection";
import FeaturesSection from "../components/home/FeaturesSection";
import HeroSection from "../components/home/HeroSection";
import StatisticsSection from "../components/home/StatisticsSection";
import WhySection from "../components/home/WhySection";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useLanguage from "../hooks/useLanguage";

export default function HomePage() {
  const { language } = useLanguage();
  useDocumentTitle(language === "hi" ? "मुखपृष्ठ" : "Home");

  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <StatisticsSection />
      <WhySection />
      <CtaSection />
      <FaqSection />
    </>
  );
}

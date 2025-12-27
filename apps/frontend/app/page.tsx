import {
  HeroSection,
  PartnerLogos,
  RoleAccessCards,
  FeatureAccordion,
  SiteFooter,
} from "@/components/landing-page";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <PartnerLogos showLabel={true} />
      <RoleAccessCards />
      <FeatureAccordion />
      <PartnerLogos showLabel={false} />
      <SiteFooter />
    </main>
  );
}

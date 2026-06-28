import { LandingCta } from "@/components/marketing/landing-cta";
import { LandingFeatures } from "@/components/marketing/landing-features";
import { LandingFooter } from "@/components/marketing/landing-footer";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingPlatform } from "@/components/marketing/landing-platform";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingPlatform />
        <LandingCta />
      </main>

      <LandingFooter />
    </div>
  );
}

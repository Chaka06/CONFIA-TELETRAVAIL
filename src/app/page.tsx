import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { TrustBadges } from "@/components/landing/trust-badges";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MissionsSection } from "@/components/landing/missions-section";
import { ReferralSection } from "@/components/landing/referral-section";
import { SecuritySection } from "@/components/landing/security-section";
import { FinalCta } from "@/components/landing/final-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: tiers } = await supabase
    .from("tier_definitions")
    .select("tier_number, required_deposit_amount, mission_reward_amount, missions_per_tier")
    .order("tier_number");

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <TrustBadges />
        <HowItWorks tiers={tiers ?? []} />
        <MissionsSection />
        <ReferralSection />
        <SecuritySection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

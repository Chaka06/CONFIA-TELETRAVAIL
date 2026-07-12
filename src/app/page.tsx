import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { TrustBadges } from "@/components/landing/trust-badges";
import { BasketTypesSection } from "@/components/landing/basket-types-section";
import { SecuritySection } from "@/components/landing/security-section";
import { FinalCta } from "@/components/landing/final-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createClient();
  const { data: basketTypes } = await supabase
    .from("tontine_basket_types")
    .select("id, label, contribution_amount, interval_days, round_length_days, payout_amount")
    .eq("is_active", true)
    .order("contribution_amount");

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <TrustBadges />
        <BasketTypesSection basketTypes={basketTypes ?? []} />
        <SecuritySection />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

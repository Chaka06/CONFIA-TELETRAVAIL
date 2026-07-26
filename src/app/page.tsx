import type { Metadata } from "next";

import { createPublicClient } from "@/lib/supabase/public";
import { SiteHeader } from "@/components/landing/site-header";
import { Hero } from "@/components/landing/hero";
import { TrustBadges } from "@/components/landing/trust-badges";
import { BasketTypesSection } from "@/components/landing/basket-types-section";
import { SecuritySection } from "@/components/landing/security-section";
import { FinalCta } from "@/components/landing/final-cta";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export const revalidate = 300;

export default async function HomePage() {
  const supabase = createPublicClient();
  const { data: paniers } = await supabase
    .from("paniers_public")
    .select("id, formule_amount, gain_net_amount")
    .eq("mode", "normal")
    .order("formule_amount");

  const basketTypes = (paniers ?? []).filter(
    (p): p is { id: string; formule_amount: number; gain_net_amount: number | null } => !!p.id && p.formule_amount != null
  );

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

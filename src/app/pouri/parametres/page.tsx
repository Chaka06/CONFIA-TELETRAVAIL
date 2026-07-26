import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormuleConfigRow } from "@/components/admin/formule-config-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();

  const { data: formuleConfigs } = await admin
    .from("formule_configs")
    .select("mode, formule_amount, capacity, commission_bps, draw_delay_hours")
    .order("mode")
    .order("formule_amount");

  const isSuperAdmin = profile.role === "super_admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres financiers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSuperAdmin
            ? "Ces valeurs pilotent l'ensemble du moteur métier. Toute modification s'applique immédiatement."
            : "Lecture seule — seul un super administrateur peut modifier ces paramètres."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formules de panier</CardTitle>
          <CardDescription>Commission prélevée et délai avant tirage du gagnant, par formule.</CardDescription>
        </CardHeader>
        <CardContent>
          {(formuleConfigs ?? []).map((fc) => (
            <FormuleConfigRow
              key={`${fc.mode}-${fc.formule_amount}`}
              mode={fc.mode}
              formuleAmount={fc.formule_amount}
              capacity={fc.capacity}
              commissionBps={fc.commission_bps}
              drawDelayHours={fc.draw_delay_hours}
              readOnly={!isSuperAdmin}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

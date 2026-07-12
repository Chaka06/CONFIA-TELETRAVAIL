import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { SettingRow } from "@/components/admin/setting-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();

  const [{ data: settings }, { data: tiers }] = await Promise.all([
    admin.from("platform_settings").select("key, value, description").order("key"),
    admin.from("tier_definitions").select("*").order("tier_number"),
  ]);

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
          <CardTitle>Paramètres généraux</CardTitle>
          <CardDescription>Plafonds, seuils et montants de commission.</CardDescription>
        </CardHeader>
        <CardContent>
          {(settings ?? []).map((s) => (
            <SettingRow
              key={s.key}
              settingKey={s.key}
              initialValue={typeof s.value === "string" ? s.value : JSON.stringify(s.value)}
              description={s.description}
              readOnly={!isSuperAdmin}
            />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Paliers</CardTitle>
          <CardDescription>
            Montants des 4 paliers obligatoires (lecture seule ici — modification via la base de
            données par un super administrateur, opération sensible).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(tiers ?? []).map((t) => (
            <div key={t.tier_number} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
              <span className="font-medium">Palier {t.tier_number}</span>
              <span className="text-muted-foreground">
                Dépôt {formatFcfa(t.required_deposit_amount)} · {t.missions_per_tier} missions à{" "}
                {formatFcfa(t.mission_reward_amount)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

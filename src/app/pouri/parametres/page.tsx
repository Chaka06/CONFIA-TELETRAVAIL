import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFcfa } from "@/lib/format";
import { SettingRow } from "@/components/admin/setting-row";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AdminSettingsPage() {
  const { profile } = await requireAdmin();
  const admin = createAdminClient();

  const [{ data: settings }, { data: basketTypes }] = await Promise.all([
    admin.from("platform_settings").select("key, value, description").order("key"),
    admin.from("tontine_basket_types").select("*").order("contribution_amount"),
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

      {settings && settings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Paramètres généraux</CardTitle>
          </CardHeader>
          <CardContent>
            {settings.map((s) => (
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
      )}

      <Card>
        <CardHeader>
          <CardTitle>Formules de portefeuille</CardTitle>
          <CardDescription>
            Les 4 paniers proposés (lecture seule ici — modification via la base de données par un
            super administrateur, opération sensible).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {(basketTypes ?? []).map((bt) => (
            <div key={bt.id} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
              <span className="font-medium">{bt.label}</span>
              <span className="text-muted-foreground">
                Dépôt {formatFcfa(bt.contribution_amount)} · {bt.capacity} places · gain{" "}
                {formatFcfa(bt.payout_amount ?? 0)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

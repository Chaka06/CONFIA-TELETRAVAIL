import { Gift, Users2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { formatFcfa } from "@/lib/format";
import { CopyReferralLink } from "@/components/dashboard/copy-referral-link";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function ParrainagePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: referees }, { data: commissions }] = await Promise.all([
    supabase.from("profiles").select("referral_code").eq("id", user.id).single(),
    supabase
      .from("profiles")
      .select("id, first_name, last_name, created_at")
      .eq("referred_by", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("referral_commissions")
      .select("id, referee_id, trigger_type, amount, created_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const totalCommissions = (commissions ?? []).reduce((sum, c) => sum + c.amount, 0);
  const commissionsByReferee = new Map<string, number>();
  for (const c of commissions ?? []) {
    commissionsByReferee.set(c.referee_id, (commissionsByReferee.get(c.referee_id) ?? 0) + c.amount);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Parrainage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          2 000 FCFA lorsque votre filleul valide son palier 2, puis 3 000 FCFA supplémentaires
          lorsqu&apos;il termine son palier 4 — soit 5 000 FCFA par filleul ayant terminé une
          mission complète.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Filleuls inscrits" value={String(referees?.length ?? 0)} icon={Users2} />
        <StatCard
          label="Commissions perçues"
          value={formatFcfa(totalCommissions)}
          icon={Gift}
          accent="success"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Votre code promo</CardTitle>
          <CardDescription>
            Partagez ce lien : toute personne qui s&apos;inscrit avec sera automatiquement rattachée
            à votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CopyReferralLink referralCode={profile?.referral_code ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mes filleuls</CardTitle>
        </CardHeader>
        <CardContent>
          {!referees || referees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Vous n&apos;avez pas encore de filleul. Partagez votre code promo pour commencer à
              gagner des commissions.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Filleul</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead className="text-right">Commissions générées</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referees.map((r) => {
                  const earned = commissionsByReferee.get(r.id) ?? 0;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{r.first_name} {r.last_name}</TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="text-right">
                        {earned > 0 ? (
                          <Badge className="bg-success/10 text-success">{formatFcfa(earned)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">En attente du palier 2</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

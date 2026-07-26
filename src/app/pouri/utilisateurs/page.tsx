import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/require-admin";
import { UserRowControls } from "@/components/admin/user-row-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { profile } = await requireAdmin();
  const { q } = await searchParams;
  const admin = createAdminClient();

  // profiles n'a ni colonne email ni colonne status (bannissement) : ces
  // deux informations vivent dans auth.users, pas exposé à PostgREST — on
  // les récupère via l'API admin et on recoupe côté serveur avec profiles.
  const [{ data: profiles }, { data: authUsers }, { data: activeMemberships }] = await Promise.all([
    admin.from("profiles").select("id, first_name, last_name, role, created_at").order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("panier_memberships").select("user_id").eq("status", "active"),
  ]);

  const authById = new Map((authUsers?.users ?? []).map((u) => [u.id, u]));
  const activeCountByUser = new Map<string, number>();
  for (const m of activeMemberships ?? []) {
    activeCountByUser.set(m.user_id, (activeCountByUser.get(m.user_id) ?? 0) + 1);
  }

  let users = (profiles ?? []).map((p) => {
    const authUser = authById.get(p.id);
    return {
      ...p,
      email: authUser?.email ?? "",
      banned: !!authUser?.banned_until && new Date(authUser.banned_until) > new Date(),
      activeMemberships: activeCountByUser.get(p.id) ?? 0,
    };
  });

  if (q) {
    const needle = q.toLowerCase();
    users = users.filter(
      (u) =>
        u.first_name.toLowerCase().includes(needle) ||
        u.last_name.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle)
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Utilisateurs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {users.length} compte(s) affiché(s). Seul un super administrateur peut modifier les rôles.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recherche</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex gap-2">
            <Input name="q" defaultValue={q} placeholder="Nom, prénom ou e-mail..." />
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Paniers actifs</TableHead>
                  <TableHead>Inscrit le</TableHead>
                  <TableHead className="text-right">Statut / Rôle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      {u.first_name} {u.last_name}
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>{u.activeMemberships}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <UserRowControls
                          userId={u.id}
                          banned={u.banned}
                          role={u.role}
                          canEditRole={profile.role === "super_admin"}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

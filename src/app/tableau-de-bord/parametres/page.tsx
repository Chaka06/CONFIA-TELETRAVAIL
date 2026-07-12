import { createClient } from "@/lib/supabase/server";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default async function ParametresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email, city, phone_number, created_at")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Vos informations personnelles et la sécurité de votre compte.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations personnelles</CardTitle>
          <CardDescription>
            Pour modifier ces informations, contactez le support.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Nom complet</Label>
            <p className="mt-1 text-sm font-medium">{profile?.first_name} {profile?.last_name}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Adresse e-mail</Label>
            <p className="mt-1 text-sm font-medium">{profile?.email}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ville</Label>
            <p className="mt-1 text-sm font-medium">{profile?.city}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Téléphone</Label>
            <p className="mt-1 text-sm font-medium">{profile?.phone_number}</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Membre depuis</Label>
            <p className="mt-1 text-sm font-medium">
              {profile?.created_at && new Date(profile.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
          <CardDescription>Changez votre mot de passe.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}

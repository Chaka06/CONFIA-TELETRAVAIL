import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { requireAdmin } from "@/lib/admin/require-admin";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Badge } from "@/components/ui/badge";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireAdmin();

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-zinc-800 px-5">
        <ShieldAlert className="size-5 text-red-400" aria-hidden />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-wide text-zinc-100">Administration</span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">Zone restreinte</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <AdminSidebarNav />
      </div>
      <div className="space-y-1 border-t border-zinc-800 p-3">
        <Link
          href="/tableau-de-bord"
          className="block rounded-lg px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        >
          ← Retour à mon compte
        </Link>
        <SignOutButton className="text-red-400/80 hover:bg-red-500/10 hover:text-red-400" />
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/*
        Fond volontairement sombre et fixe (indépendant du thème clair/sombre
        du reste du site) : signal visuel fort qu'on se trouve dans une zone
        distincte et sensible, jamais confondue avec l'espace utilisateur.
      */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 md:flex">
        {sidebarContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-3 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <MobileSidebar>
                <div className="flex h-full flex-col bg-zinc-950">{sidebarContent}</div>
              </MobileSidebar>
            </div>
            <Badge variant="outline" className="hidden uppercase tracking-wide sm:inline-flex">
              {profile.role === "super_admin" ? "Super administrateur" : "Administrateur"}
            </Badge>
            <Badge variant="outline" className="uppercase tracking-wide sm:hidden">
              Admin
            </Badge>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <UserMenu firstName={profile.first_name} lastName={profile.last_name} email={profile.email} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

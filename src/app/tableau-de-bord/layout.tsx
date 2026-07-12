import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Logo } from "@/components/logo";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, email")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/connexion");
  }

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
        <Link href="/">
          <Logo className="h-7" priority />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
      <div className="border-t border-sidebar-border p-3">
        <SignOutButton />
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        {sidebarContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-3 sm:h-16 sm:px-6">
          <div className="flex items-center gap-1 md:hidden">
            <MobileSidebar>{sidebarContent}</MobileSidebar>
            <Link href="/" className="flex items-center">
              <Logo className="h-6" />
            </Link>
          </div>
          <div className="hidden md:block" />
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

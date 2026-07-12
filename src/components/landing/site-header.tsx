"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";

const NAV_LINKS = [
  { href: "#comment-ca-marche", label: "Comment ça marche" },
  { href: "/paniers", label: "Paniers" },
  { href: "#securite", label: "Sécurité" },
];

export function SiteHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = React.useState(pathname);

  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  const logoHref = isAuthenticated ? "/tableau-de-bord" : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={logoHref} className="flex items-center">
          <Logo className="h-7 sm:h-8" priority />
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button render={<Link href="/tableau-de-bord" />} nativeButton={false} className="hidden sm:inline-flex">
              Tableau de bord
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                render={<Link href="/connexion" />}
                nativeButton={false}
                className="hidden sm:inline-flex"
              >
                Connexion
              </Button>
              <Button render={<Link href="/inscription" />} nativeButton={false} className="hidden sm:inline-flex">
                Créer un compte
              </Button>
            </>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" aria-label="Ouvrir le menu" className="md:hidden" />}
            >
              <Menu className="size-5" aria-hidden />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex flex-col gap-1 p-4 pt-10">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                  {isAuthenticated ? (
                    <Button render={<Link href="/tableau-de-bord" />} nativeButton={false}>
                      Tableau de bord
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" render={<Link href="/connexion" />} nativeButton={false}>
                        Connexion
                      </Button>
                      <Button render={<Link href="/inscription" />} nativeButton={false}>
                        Créer un compte
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

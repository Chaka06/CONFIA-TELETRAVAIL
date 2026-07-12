"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  ScrollText,
  Settings,
  Users,
  Wallet,
  WalletCards,
  ClipboardCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/pouri", label: "Aperçu", icon: Gauge, exact: true },
  { href: "/pouri/depots", label: "Dépôts", icon: Wallet },
  { href: "/pouri/missions", label: "Missions", icon: ClipboardCheck },
  { href: "/pouri/retraits", label: "Retraits", icon: WalletCards },
  { href: "/pouri/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/pouri/audit", label: "Journal d'audit", icon: ScrollText },
  { href: "/pouri/parametres", label: "Paramètres", icon: Settings },
];

export function AdminSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-red-500/15 text-red-400"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

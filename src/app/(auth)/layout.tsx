import Link from "next/link";

import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="flex h-14 items-center border-b border-border bg-background px-4 sm:h-16 sm:px-6">
        <Link href="/" className="flex items-center">
          <Logo className="h-7" priority />
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="border-t border-border bg-background px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} Confssa. Plateforme professionnelle de télétravail rémunéré.
      </footer>
    </div>
  );
}

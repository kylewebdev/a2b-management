"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Warehouse, Settings } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/estates", label: "Estates", icon: Warehouse },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-border bg-surface">
        <div className="px-4 py-5">
          <span className="text-sm font-bold tracking-wide text-accent">
            A2B Manager
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent-muted text-accent"
                    : "text-text-secondary hover:bg-surface-raised hover:text-text-primary"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border px-4 py-3">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-18 md:pb-0">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 flex border-t border-border bg-surface md:hidden">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? "text-accent" : "text-text-muted"
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}
        <div className="flex flex-1 flex-col items-center justify-center py-3">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </nav>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Clock,
  CalendarDays,
  Palmtree,
  FileText,
  User,
  LogOut,
  BarChart3,
  MoreHorizontal,
  ClipboardClock,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

const mainLinks = [
  { href: "/employee", label: "Übersicht", icon: Home },
  { href: "/employee/clock", label: "Stempeln", icon: Clock },
  { href: "/employee/times", label: "Zeiten", icon: BarChart3 },
  { href: "/employee/shifts", label: "Schichten", icon: CalendarDays },
];

const moreLinks = [
  {
    href: "/employee/absences",
    label: "Abwesenheiten",
    icon: Palmtree,
  },
  {
    href: "/employee/corrections",
    label: "Korrekturen",
    icon: ClipboardClock,
  },
  {
    href: "/employee/documents",
    label: "Lohndokumente",
    icon: FileText,
  },
  {
    href: "/employee/profile",
    label: "Profil",
    icon: User,
  },
];

const allLinks = [...mainLinks, ...moreLinks];

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/employee" && pathname.startsWith(href));
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#111827] lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden min-h-screen w-72 shrink-0 border-r border-[#E2E8F0] bg-white lg:flex lg:flex-col">
        <div className="px-6 pb-6 pt-8">
          <Image
            src="/logo/dipera-logo-dark.png"
            alt="Dipera"
            width={170}
            height={40}
            priority
          />
          <p className="mt-1 text-sm text-[#64748B]">Mitarbeiterbereich</p>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {allLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                  active
                    ? "bg-[#EFF6FF] text-[#2563EB]"
                    : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E2E8F0] bg-[#FBFCFE] p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A]"
          >
            <LogOut className="h-5 w-5" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Mobile / Content */}
      <div className="min-w-0 flex-1">

        <section className="px-4 pb-28 pt-6 md:px-8 lg:px-10 lg:pb-10">
          {children}
        </section>

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E2E8F0] bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
          <div className="grid grid-cols-5 gap-1">
            {mainLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition",
                    active
                      ? "bg-[#EFF6FF] text-[#2563EB]"
                      : "text-[#64748B] hover:bg-[#F8FAFC]",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={[
                "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition",
                moreLinks.some((link) => isActive(link.href))
                  ? "bg-[#EFF6FF] text-[#2563EB]"
                  : "text-[#64748B] hover:bg-[#F8FAFC]",
              ].join(" ")}
            >
              <MoreHorizontal className="h-5 w-5" />
              Mehr
            </button>
          </div>
        </nav>

        {/* Mobile More Sheet */}
        {moreOpen && (
          <div className="fixed inset-0 z-50 bg-[#0F172A]/40 lg:hidden">
            <button
              type="button"
              className="absolute inset-0"
              onClick={() => setMoreOpen(false)}
              aria-label="Menü schließen"
            />

            <div className="absolute bottom-0 left-0 right-0 rounded-t-[28px] border border-[#E2E8F0] bg-white p-4 shadow-[0_-24px_80px_rgba(15,23,42,0.24)]">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#CBD5E1]" />

              <p className="mb-3 px-2 text-sm font-semibold text-[#0F172A]">
                Weitere Bereiche
              </p>

              <div className="space-y-1">
                {moreLinks.map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMoreOpen(false)}
                      className={[
                        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                        active
                          ? "bg-[#EFF6FF] text-[#2563EB]"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]",
                      ].join(" ")}
                    >
                      <Icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  );
                })}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-[#EF4444] transition hover:bg-[#FEF2F2]"
                >
                  <LogOut className="h-5 w-5" />
                  Abmelden
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
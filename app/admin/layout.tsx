"use client";

import { useState } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { label: "Dashboard", href: "/admin" },
    { label: "Mitarbeiter", href: "/admin/employees" },
    { label: "Dienstplan", href: "/admin/schedule" },
    { label: "Abwesenheiten", href: "/admin/absences" },
    { label: "Arbeitszeiten", href: "/admin/times" },
    { label: "Einstellungen", href: "/admin/settings" },
  ];

  return (
    <main className="min-h-screen bg-gray-100 md:flex">
      <div className="md:hidden bg-blue-950 text-white p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Shiftly</h1>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="text-white text-3xl px-2 py-1"
        >
          ☰
        </button>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden">
          <div className="bg-blue-950 text-white w-72 h-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-3xl font-bold">Shiftly</h2>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="text-white text-4xl px-2 py-1"
              >
                ×
              </button>
            </div>

            <nav className="flex flex-col gap-5">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-lg hover:text-blue-300"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}

      <aside className="hidden md:block w-64 bg-blue-950 text-white p-6 min-h-screen">
        <h1 className="text-3xl font-bold mb-10">Shiftly</h1>

        <nav className="flex flex-col gap-4">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-blue-300">
              {link.label}
            </a>
          ))}
        </nav>
      </aside>

      <section className="flex-1 p-4 md:p-10 overflow-x-auto">
        {children}
      </section>
    </main>
  );
}
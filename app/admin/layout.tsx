"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusiness } from "@/lib/getBusiness";
import { getBusinessId } from "@/lib/getBusinessId";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [pendingRequests, setPendingRequests] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  async function loadBusinessName() {
    const business = await getBusiness();

    if (!business) return;

    setBusinessName(business.name);
  }

  async function loadPendingRequests() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data, error } = await supabase
      .from("absences")
      .select("id")
      .eq("business_id", businessId)
      .eq("request_status", "pending");

    if (error) {
      console.error(error);
      return;
    }

    setPendingRequests(data?.length || 0);
  }

  async function getCurrentUserId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id || null;
  }

  async function loadNotifications() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const userId = await getCurrentUserId();

    if (!userId) return;

    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, type, is_read, created_at")
      .eq("business_id", businessId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error(error);
      return;
    }

    setNotifications((data || []) as Notification[]);
  }

  async function markAllNotificationsAsRead() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const userId = await getCurrentUserId();

    if (!userId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("business_id", businessId)
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error(error);
      return;
    }

    await loadNotifications();
  }

  function formatNotificationDate(dateString: string) {
    return new Date(dateString).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error(profileError);
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      if (profile.role !== "admin") {
        window.location.href = "/employee";
        return;
      }

      setIsLoggedIn(true);

      await loadBusinessName();
      await loadPendingRequests();
      await loadNotifications();

      setCheckingAuth(false);
    }

    checkUser();
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel>;

    async function setupRealtime() {
      const businessId = await getBusinessId();

      if (!businessId) return;

      const userId = await getCurrentUserId();

      if (!userId) return;

      channel = supabase
        .channel(`admin-live-${businessId}-${userId}`)

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          async () => {
            await loadNotifications();
          }
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "absences",
            filter: `business_id=eq.${businessId}`,
          },
          async () => {
            await loadPendingRequests();
          }
        )

        .subscribe();
    }

    if (isLoggedIn) {
      setupRealtime();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isLoggedIn]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const unreadNotifications = notifications.filter(
    (notification) => !notification.is_read
  );

  const navLinks = [
    { label: "Dashboard", href: "/admin" },
    { label: "Mitarbeiter", href: "/admin/employees" },
    { label: "Dienstplan", href: "/admin/schedule" },
    {
      label:
        pendingRequests > 0
          ? `Abwesenheiten (${pendingRequests})`
          : "Abwesenheiten",
      href: "/admin/absences",
    },
    { label: "Arbeitszeiten", href: "/admin/times" },
    { label: "Einstellungen", href: "/admin/settings" },
  ];

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-blue-950 font-semibold">
          Login wird geprüft...
        </p>
      </main>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100 md:flex">
      <div className="md:hidden bg-blue-950 text-white p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shiftly</h1>

          {businessName && (
            <p className="text-base font-semibold text-blue-100 mt-1">
              {businessName}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative text-2xl"
          >
            🔔

            {unreadNotifications.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5">
                {unreadNotifications.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="text-white text-3xl px-2 py-1"
          >
            ☰
          </button>
        </div>
      </div>

      {notificationsOpen && (
        <div className="fixed top-20 right-4 z-50 bg-white text-black rounded-2xl shadow-2xl border w-[calc(100%-2rem)] max-w-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-blue-950">
              Benachrichtigungen
            </h2>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                className="text-sm text-blue-700 font-semibold hover:text-blue-900"
              >
                Alle gelesen
              </button>

              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="text-2xl text-gray-500 hover:text-black leading-none"
              >
                ×
              </button>
            </div>
          </div>

          {notifications.length > 0 ? (
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => {
                    setNotificationsOpen(false);

                    if (notification.type === "vacation_request") {
                      window.location.href = "/admin/absences";
                      return;
                    }

                    window.location.href = "/admin";
                  }}
                  className={`text-left rounded-xl p-3 border w-full hover:bg-blue-100 transition ${
                    notification.is_read ? "bg-gray-50" : "bg-blue-50"
                  }`}
                >
                  <p className="font-bold text-blue-950">
                    {notification.title}
                  </p>

                  <p className="text-sm text-gray-700 mt-1">
                    {notification.message}
                  </p>

                  <p className="text-xs text-gray-400 mt-2">
                    {formatNotificationDate(notification.created_at)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              Keine Benachrichtigungen vorhanden.
            </p>
          )}
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden">
          <div className="bg-blue-950 text-white w-72 h-full p-6 shadow-xl">
            <div className="flex items-start justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold">Shiftly</h2>

                {businessName && (
                  <p className="text-base font-semibold text-blue-100 mt-1">
                    {businessName}
                  </p>
                )}
              </div>

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

              <button
                type="button"
                onClick={handleLogout}
                className="text-left text-lg text-red-300 hover:text-red-200 mt-4"
              >
                Ausloggen
              </button>
            </nav>
          </div>
        </div>
      )}

      <aside className="hidden md:flex w-64 bg-blue-950 text-white p-6 min-h-screen flex-col justify-between">
        <div>
          <div className="mb-10">
            <h1 className="text-3xl font-bold">Shiftly</h1>

            {businessName && (
              <p className="text-base font-semibold text-blue-100 mt-1">
                {businessName}
              </p>
            )}
          </div>

          <div className="mb-8 relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="w-full bg-blue-900 text-white rounded-xl p-3 flex items-center justify-between hover:bg-blue-800 transition"
            >
              <span>🔔 Benachrichtigungen</span>

              {unreadNotifications.length > 0 && (
                <span className="bg-red-600 text-white text-xs rounded-full px-2 py-1">
                  {unreadNotifications.length}
                </span>
              )}
            </button>
          </div>

          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-blue-300"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="text-left text-red-300 hover:text-red-200"
        >
          Ausloggen
        </button>
      </aside>

      <section className="flex-1 p-4 md:p-10 overflow-x-auto">
        {children}
      </section>
    </main>
  );
}
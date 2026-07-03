"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { getBusiness } from "@/lib/getBusiness";
import { getBusinessId } from "@/lib/getBusinessId";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CalendarX,
  Clock3,
  Settings,
  Bell,
  LogOut,
  ArrowUpRight,
  FileText,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

type NavLink = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingCorrectionRequests, setPendingCorrectionRequests] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [accessBlocked, setAccessBlocked] = useState(false);

  function showDiperaPopup(text: string) {
    setPopupMessage(text);
    setShowPopup(true);
  }

  async function loadBusinessName() {
    const business = await getBusiness();

    if (!business) return;

    if (business.status === "suspended") {
      window.location.href = "/account-suspended";
      return;
    }

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

  async function loadPendingCorrectionRequests() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data, error } = await supabase
      .from("time_correction_requests")
      .select("id")
      .eq("business_id", businessId)
      .eq("status", "pending");

    if (error) {
      console.error(error);
      return;
    }

    setPendingCorrectionRequests(data?.length || 0);
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

      if (profile.role !== "admin" && profile.role !== "owner") {
        window.location.href = "/employee";
        return;
      }

      const business = await getBusiness();

      if (!business) {
        await supabase.auth.signOut();
        window.location.href = "/login";
        return;
      }

      if (business.status === "suspended") {
        window.location.href = "/account-suspended";
        return;
      }

      const blockedSubscriptionStatuses = [
        "canceled",
        "unpaid",
        "incomplete_expired",
      ];

      if (
        business.subscription_status &&
        blockedSubscriptionStatuses.includes(business.subscription_status)
      ) {
        setAccessBlocked(true);
        setCheckingAuth(false);
        return;
      }

      setBusinessName(business.name);
      setIsLoggedIn(true);

      await loadPendingRequests();
      await loadPendingCorrectionRequests();
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
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "time_correction_requests",
            filter: `business_id=eq.${businessId}`,
          },
          async () => {
            await loadPendingCorrectionRequests();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "businesses",
            filter: `id=eq.${businessId}`,
          },
          async () => {
            const { data } = await supabase
              .from("businesses")
              .select("status")
              .eq("id", businessId)
              .single();

            if (data?.status === "suspended") {
              await supabase.auth.signOut();

              showDiperaPopup("Der Zugriff auf diesen Betrieb wurde gesperrt.");

              window.location.href = "/login";
            }
          }
        )
        .subscribe();
    }

    function handleCorrectionRequestsChanged() {
      loadPendingCorrectionRequests();
    }

    window.addEventListener(
      "correctionRequestsChanged",
      handleCorrectionRequestsChanged
    );

    if (isLoggedIn) {
      setupRealtime();
    }

    return () => {
      window.removeEventListener(
        "correctionRequestsChanged",
        handleCorrectionRequestsChanged
      );

      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isLoggedIn]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function handleOpenBillingPortal() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/stripe/create-portal-session", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok || !data.url) {
      showDiperaPopup(data.error || "Das Kundenportal konnte nicht geöffnet werden.");
      return;
    }

    window.location.href = data.url;
  }

  const unreadNotifications = notifications.filter(
    (notification) => !notification.is_read
  );

  const overviewLinks: NavLink[] = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
    },
  ];

  const workspaceLinks: NavLink[] = [
    {
      label: "Mitarbeiter",
      href: "/admin/employees",
      icon: Users,
    },
    {
      label: "Arbeitszeiten",
      href: "/admin/times",
      icon: Clock3,
    },
    {
      label: "Schichtplanung",
      href: "/admin/schedule",
      icon: CalendarDays,
    },
    {
      label: "Abwesenheiten",
      href: "/admin/absences",
      icon: CalendarX,
    },
    {
      label: "Korrekturanträge",
      href: "/admin/corrections",
      icon: FileText,
    },
  ];

  const adminLinks: NavLink[] = [
    {
      label: "Einstellungen",
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  function getBadgeCount(href: string) {
    if (href === "/admin/absences") return pendingRequests;
    if (href === "/admin/corrections") return pendingCorrectionRequests;
    return 0;
  }

  function renderNavLink(link: NavLink, options?: { mobile?: boolean }) {
    const Icon = link.icon;
    const badgeCount = getBadgeCount(link.href);
    const isActive = pathname === link.href;
    const isCollapsed = sidebarCollapsed && !options?.mobile;

    return (
      <a
        key={link.href}
        href={link.href}
        title={isCollapsed ? link.label : undefined}
        onClick={() => options?.mobile && setMenuOpen(false)}
        className={`group relative flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
          isCollapsed ? "justify-center" : "justify-between"
        } ${
          isActive
            ? "bg-[#EFF6FF] text-[#2563EB]"
            : "text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#111827]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Icon className="h-5 w-5 shrink-0" />

          {!isCollapsed && <span className="truncate">{link.label}</span>}
        </div>

        {!isCollapsed && badgeCount > 0 && (
          <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-xs font-medium text-white">
            {badgeCount}
          </span>
        )}

        {isCollapsed && badgeCount > 0 && (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
        )}
      </a>
    );
  }

  function renderNotificationsButton(options?: { mobile?: boolean }) {
    const isCollapsed = sidebarCollapsed && !options?.mobile;

    return (
      <button
        type="button"
        title={isCollapsed ? "Benachrichtigungen" : undefined}
        onClick={() => {
          setNotificationsOpen(!notificationsOpen);
          if (options?.mobile) setMenuOpen(false);
        }}
        className={`group relative flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium text-[#6B7280] transition hover:bg-[#F8FAFC] hover:text-[#111827] ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <Bell className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Benachrichtigungen</span>}
        </div>

        {!isCollapsed && unreadNotifications.length > 0 && (
          <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-xs font-medium text-white">
            {unreadNotifications.length}
          </span>
        )}

        {isCollapsed && unreadNotifications.length > 0 && (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
        )}
      </button>
    );
  }

  function renderBillingButton(options?: { mobile?: boolean }) {
    const isCollapsed = sidebarCollapsed && !options?.mobile;

    return (
      <button
        type="button"
        title={isCollapsed ? "Abonnement verwalten" : undefined}
        onClick={() => {
          if (options?.mobile) setMenuOpen(false);
          handleOpenBillingPortal();
        }}
        className={`flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium text-[#6B7280] transition hover:bg-[#F8FAFC] hover:text-[#111827] ${
          isCollapsed ? "justify-center" : "gap-3"
        }`}
      >
        <CreditCard className="h-5 w-5 shrink-0" />
        {!isCollapsed && <span>Abonnement verwalten</span>}
      </button>
    );
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="rounded-3xl border border-[#E5E7EB] bg-white px-8 py-6 text-[#6B7280] shadow-[0_10px_24px_rgba(17,24,39,0.06)]">
          Login wird geprüft...
        </div>
      </main>
    );
  }

  if (accessBlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-lg rounded-3xl border border-[#E5E7EB] bg-white p-8 text-center shadow-[0_24px_70px_rgba(17,24,39,0.12)]">
          <img
            src="/logo/dipera-logo-dark.png"
            alt="Dipera"
            className="mx-auto mb-8 h-auto w-40"
          />

          <h1 className="mb-4 text-3xl font-light tracking-[-0.04em] text-[#111827]">
            Abonnement nicht aktiv
          </h1>

          <p className="mb-8 leading-relaxed text-[#6B7280]">
            Dein Dipera-Abonnement ist derzeit nicht aktiv. Bitte aktualisiere deine Zahlung oder reaktiviere dein Abonnement, um Dipera weiter zu nutzen.
          </p>

          <Button
            type="button"
            onClick={handleOpenBillingPortal}
            size="lg"
            fullWidth
          >
            Abonnement verwalten
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            className="mt-4 w-full text-red-600 hover:text-red-700"
          >
            Abmelden
          </Button>
        </div>
      </main>
    );
  }

  if (!isLoggedIn) {
    return null;
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC] text-[#111827] lg:flex-row">
      <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-3 lg:hidden">
        <img
          src="/logo/dipera-logo-dark.png"
          alt="Dipera"
          className="h-auto w-32"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative rounded-2xl p-3 text-[#6B7280] transition hover:bg-[#F8FAFC] hover:text-[#111827]"
          >
            <Bell className="h-5 w-5" />

            {unreadNotifications.length > 0 && (
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#2563EB]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-2xl p-3 text-[#111827] transition hover:bg-[#F8FAFC]"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {notificationsOpen && (
        <div className="fixed right-4 top-20 z-50 w-[calc(100%-2rem)] max-w-md rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_24px_70px_rgba(17,24,39,0.16)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-medium text-[#111827]">
                Benachrichtigungen
              </h2>
              <p className="text-xs text-[#6B7280]">
                Aktuelle Hinweise aus deinem Betrieb
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                className="rounded-xl px-3 py-2 text-xs font-medium text-[#2563EB] transition hover:bg-[#EFF6FF]"
              >
                Alle gelesen
              </button>

              <button
                type="button"
                onClick={() => setNotificationsOpen(false)}
                className="rounded-xl p-2 text-[#6B7280] transition hover:bg-[#F8FAFC] hover:text-[#111827]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {notifications.length > 0 ? (
            <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
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
                  className={`w-full rounded-2xl border p-4 text-left transition hover:bg-[#F8FAFC] ${
                    notification.is_read
                      ? "border-[#E5E7EB] bg-white"
                      : "border-[#BFDBFE] bg-[#EFF6FF]"
                  }`}
                >
                  <p className="text-sm font-medium text-[#111827]">
                    {notification.title}
                  </p>

                  <p className="mt-1 text-sm text-[#6B7280]">
                    {notification.message}
                  </p>

                  <p className="mt-3 text-xs text-[#94A3B8]">
                    {formatNotificationDate(notification.created_at)}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="rounded-2xl bg-[#F8FAFC] p-4 text-sm text-[#6B7280]">
              Keine Benachrichtigungen vorhanden.
            </p>
          )}
        </div>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-[#111827]/35 backdrop-blur-sm lg:hidden">
          <div className="flex h-full w-80 max-w-[86vw] flex-col border-r border-[#E5E7EB] bg-white p-4 shadow-[0_24px_70px_rgba(17,24,39,0.18)]">
            <div className="mb-6 flex items-center justify-between px-2 py-2">
              <img
                src="/logo/dipera-logo-dark.png"
                alt="Dipera"
                className="h-auto w-32"
              />

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-2xl p-2 text-[#6B7280] transition hover:bg-[#F8FAFC] hover:text-[#111827]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                {overviewLinks.map((link) => renderNavLink(link, { mobile: true }))}
                {renderNotificationsButton({ mobile: true })}
              </div>

              <div className="h-px bg-[#E5E7EB]" />

              <div className="flex flex-col gap-1">
                {workspaceLinks.map((link) => renderNavLink(link, { mobile: true }))}
              </div>

              <div className="h-px bg-[#E5E7EB]" />

              <div className="flex flex-col gap-1">
                {adminLinks.map((link) => renderNavLink(link, { mobile: true }))}
                {renderBillingButton({ mobile: true })}
              </div>
              </div>
            </nav>

            <div className="mt-auto border-t border-[#E5E7EB] pt-4">
              <a
                href="/kiosk"
                onClick={() => setMenuOpen(false)}
                className="mb-3 flex items-center justify-between rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_24px_rgba(17,24,39,0.04)]"
              >
                <div>
                  <p className="text-sm text-[#6B7280]">Terminal</p>
                  <p className="text-sm font-medium text-[#111827]">
                    Stempelterminal öffnen
                  </p>
                </div>

                <ArrowUpRight className="h-5 w-5 text-[#2563EB]" />
              </a>

              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-red-600 hover:text-red-700"
              >
                <LogOut className="h-5 w-5" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      )}

      <aside
        className={`hidden h-screen shrink-0 flex-col overflow-hidden border-r border-[#E5E7EB] bg-white px-4 pt-10 pb-5 transition-[width] duration-200 ease-in-out lg:flex ${
          sidebarCollapsed ? "w-20" : "w-72"
        }`}
      >
        <div className="mb-9 flex items-center justify-between px-2">
          {sidebarCollapsed ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF6FF] text-lg font-semibold text-[#2563EB]">
              D
            </div>
          ) : (
            <img
              src="/logo/dipera-logo-dark.png"
              alt="Dipera"
              className="h-auto w-36"
            />
          )}

          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-2xl p-2 text-[#6B7280] transition hover:bg-[#F8FAFC] hover:text-[#111827]"
            title={sidebarCollapsed ? "Sidebar ausklappen" : "Sidebar einklappen"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            {overviewLinks.map((link) => renderNavLink(link))}
            {renderNotificationsButton()}
          </div>

          <div className="h-px bg-[#E5E7EB]" />

          <div className="flex flex-col gap-1">
            {workspaceLinks.map((link) => renderNavLink(link))}
          </div>

          <div className="h-px bg-[#E5E7EB]" />

          <div className="flex flex-col gap-1">
            {adminLinks.map((link) => renderNavLink(link))}
            {renderBillingButton()}
          </div>
          </div>
        </nav>

        <div className="mt-auto border-t border-[#E5E7EB] bg-white pt-4 space-y-3">
          {!sidebarCollapsed && (
            <a
              href="/kiosk"
              className="flex items-center justify-between rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_10px_24px_rgba(17,24,39,0.04)] transition hover:bg-[#F8FAFC]"
            >
              <div>
                <p className="text-sm text-[#6B7280]">Terminal</p>
                <p className="text-sm font-medium text-[#111827]">
                  Stempelterminal öffnen
                </p>
              </div>

              <ArrowUpRight className="h-5 w-5 text-[#2563EB]" />
            </a>
          )}

          {sidebarCollapsed && (
            <a
              href="/kiosk"
              title="Stempelterminal öffnen"
              className="flex items-center justify-center rounded-2xl p-3 text-[#6B7280] transition hover:bg-[#F8FAFC] hover:text-[#111827]"
            >
              <ArrowUpRight className="h-5 w-5" />
            </a>
          )}

          <div
            className={`rounded-3xl border border-[#E5E7EB] bg-[#F8FAFC] ${
              sidebarCollapsed ? "p-2" : "p-4"
            }`}
          >
            <div
              className={`flex items-center ${
                sidebarCollapsed ? "justify-center" : "gap-3"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-sm font-semibold text-[#2563EB]">
                {businessName ? businessName.charAt(0).toUpperCase() : "D"}
              </div>

              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#111827]">
                    {businessName || "Dipera"}
                  </p>
                  <p className="text-xs text-[#6B7280]">Administrator</p>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            onClick={handleLogout}
            title={sidebarCollapsed ? "Abmelden" : undefined}
            className={`w-full text-red-600 hover:text-red-700 ${
              sidebarCollapsed ? "justify-center px-0" : "justify-start"
            }`}
          >
            <LogOut className="h-5 w-5" />
            {!sidebarCollapsed && <span>Abmelden</span>}
          </Button>
        </div>
      </aside>

      <section className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:px-10 lg:py-10">
          {children}
        </div>
      </section>

      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/35 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] border border-[#E5E7EB] bg-white p-6 text-center shadow-[0_24px_70px_rgba(17,24,39,0.18)]">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              !
            </div>

            <p className="text-xl font-light leading-8 tracking-[-0.02em] text-[#111827]">
              {popupMessage}
            </p>

            <div className="mt-8 flex justify-center">
              <Button
                type="button"
                variant="primary"
                onClick={() => setShowPopup(false)}
              >
                OK
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

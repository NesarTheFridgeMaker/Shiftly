"use client";







import { useEffect, useState } from "react";



import { usePathname } from "next/navigation";

import { Be_Vietnam_Pro } from "next/font/google";



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



  Calculator,



  CreditCard,



  ChevronLeft,



  ChevronRight,



  Menu,



  X,



} from "lucide-react";







const beVietnamPro = Be_Vietnam_Pro({

  subsets: ["latin"],

  weight: ["400", "500", "600", "700", "800"],

});



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



  const [openTimeConflicts, setOpenTimeConflicts] = useState(0);



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







  async function loadOpenTimeConflicts() {



    const businessId = await getBusinessId();







    if (!businessId) return;







    const { count, error } = await supabase



      .from("time_conflicts")



      .select("id", { count: "exact", head: true })



      .eq("business_id", businessId)



      .eq("status", "open");







    if (error) {



      console.error(error);



      return;



    }







    setOpenTimeConflicts(count ?? 0);



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



      await loadOpenTimeConflicts();



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



            event: "*",



            schema: "public",



            table: "time_conflicts",



            filter: `business_id=eq.${businessId}`,



          },



          async () => {



            await loadOpenTimeConflicts();



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



      label: "Zeiten & Löhne",



      href: "/admin/times",



      icon: Clock3,



    },



    {



      label: "Abrechnung",



      href: "/admin/payroll",



      icon: Calculator,



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



      label: "Korrekturen",



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

    if (href === "/admin/corrections") {

      return pendingCorrectionRequests + openTimeConflicts;

    }

    return 0;

  }



  function isNavActive(href: string) {

    return href === "/admin" ? pathname === href : pathname.startsWith(href);

  }



  function renderDesktopNavLink(link: NavLink) {

    const Icon = link.icon;

    const badgeCount = getBadgeCount(link.href);

    const isActive = isNavActive(link.href);



    return (

      <a

        key={link.href}

        href={link.href}

        className={`relative flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-semibold transition ${

          isActive

            ? "bg-[#E7F5FC] text-[#168FD0]"

            : "text-[#323542] hover:bg-[#F2F5F8] hover:text-black"

        }`}

      >

        <Icon className="h-[18px] w-[18px] shrink-0" />

        <span className="whitespace-nowrap">{link.label}</span>



        {badgeCount > 0 && (

          <span

            className={`ml-0.5 flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white ${

              link.href === "/admin/corrections" ? "bg-[#DC2626]" : "bg-[#31AEF0]"

            }`}

          >

            {badgeCount}

          </span>

        )}

      </a>

    );

  }



  function renderMobileNavLink(link: NavLink) {

    const Icon = link.icon;

    const badgeCount = getBadgeCount(link.href);

    const isActive = isNavActive(link.href);



    return (

      <a

        key={link.href}

        href={link.href}

        onClick={() => setMenuOpen(false)}

        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${

          isActive

            ? "bg-[#E7F5FC] text-[#168FD0]"

            : "text-[#323542] hover:bg-[#F2F5F8] hover:text-black"

        }`}

      >

        <div className="flex items-center gap-3">

          <Icon className="h-5 w-5" />

          <span>{link.label}</span>

        </div>



        {badgeCount > 0 && (

          <span

            className={`rounded-full px-2 py-0.5 text-xs font-bold text-white ${

              link.href === "/admin/corrections" ? "bg-[#DC2626]" : "bg-[#31AEF0]"

            }`}

          >

            {badgeCount}

          </span>

        )}

      </a>

    );

  }



  if (checkingAuth) {

    return (

      <main

        className={`${beVietnamPro.className} flex min-h-screen items-center justify-center bg-[#F2F5F8]`}

      >

        <div className="rounded-[28px] bg-white px-8 py-6 text-[#667085] shadow-[0_18px_50px_rgba(17,24,39,0.08)]">

          Login wird geprüft...

        </div>

      </main>

    );

  }



  if (accessBlocked) {

    return (

      <main

        className={`${beVietnamPro.className} flex min-h-screen items-center justify-center bg-[#F2F5F8] p-6`}

      >

        <div className="w-full max-w-lg rounded-[30px] bg-white p-8 text-center shadow-[0_24px_70px_rgba(17,24,39,0.10)]">

          <img

            src="/logo/dipera-logo-dark.png"

            alt="Dipera"

            className="mx-auto mb-8 h-auto w-40"

          />



          <h1 className="mb-4 text-3xl font-bold tracking-[-0.04em] text-black">

            Abonnement nicht aktiv

          </h1>



          <p className="mb-8 leading-relaxed text-[#667085]">

            Dein Dipera-Abonnement ist derzeit nicht aktiv. Bitte aktualisiere deine

            Zahlung oder reaktiviere dein Abonnement, um Dipera weiter zu nutzen.

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

    <main

      className={`${beVietnamPro.className} flex h-screen flex-col overflow-hidden bg-white text-[#323542]`}

    >

      <header className="relative z-40 shrink-0 border-b border-black/[0.06] bg-white/95 backdrop-blur-xl">

        <div className="flex h-[76px] w-full items-center gap-5 px-4 md:px-6 xl:px-8">

          <a href="/admin" className="shrink-0" aria-label="Dipera Dashboard">

            <img

              src="/logo/dipera-logo-dark.png"

              alt="Dipera"

              className="h-auto w-[132px]"

            />

          </a>



          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-1 lg:flex">

            {overviewLinks.map((link) => renderDesktopNavLink(link))}

            {workspaceLinks

              .filter((link) => link.href !== "/admin/corrections")

              .map((link) => renderDesktopNavLink(link))}

          </nav>



          <div className="ml-auto flex shrink-0 items-center gap-2">

            <button

              type="button"

              onClick={() => setNotificationsOpen(!notificationsOpen)}

              className="relative flex h-11 w-11 items-center justify-center rounded-2xl text-[#323542] transition hover:bg-[#F2F5F8] hover:text-black"

              aria-label="Benachrichtigungen"

            >

              <Bell className="h-5 w-5" />

              {unreadNotifications.length > 0 && (

                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#31AEF0]" />

              )}

            </button>



            <button

              type="button"

              onClick={() => setMenuOpen(true)}

              className="flex h-11 items-center gap-3 rounded-2xl px-2.5 text-left transition hover:bg-[#F2F5F8] md:px-3"

              aria-label="Betriebsmenü öffnen"

            >

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#E7F5FC] text-sm font-bold text-[#168FD0]">

                {businessName ? businessName.charAt(0).toUpperCase() : "D"}

              </div>



              <div className="hidden min-w-0 xl:block">

                <p className="max-w-36 truncate text-sm font-semibold text-black">

                  {businessName || "Dipera"}

                </p>

                <p className="text-[11px] text-[#7A8492]">Administrator</p>

              </div>



              <Menu className="h-5 w-5 text-[#667085]" />

            </button>

          </div>

        </div>

      </header>



      {notificationsOpen && (

        <div className="fixed right-4 top-[88px] z-50 w-[calc(100%-2rem)] max-w-md rounded-[28px] bg-white p-4 shadow-[0_24px_70px_rgba(17,24,39,0.16)] md:right-6">

          <div className="mb-4 flex items-center justify-between gap-4">

            <div>

              <h2 className="text-lg font-bold text-black">Benachrichtigungen</h2>

              <p className="text-xs text-[#667085]">

                Aktuelle Hinweise aus deinem Betrieb

              </p>

            </div>



            <div className="flex items-center gap-2">

              <button

                type="button"

                onClick={markAllNotificationsAsRead}

                className="rounded-xl px-3 py-2 text-xs font-semibold text-[#168FD0] transition hover:bg-[#E7F5FC]"

              >

                Alle gelesen

              </button>



              <button

                type="button"

                onClick={() => setNotificationsOpen(false)}

                className="rounded-xl p-2 text-[#667085] transition hover:bg-[#F2F5F8] hover:text-black"

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

                  className={`w-full rounded-2xl p-4 text-left transition hover:bg-[#F2F5F8] ${

                    notification.is_read ? "bg-white" : "bg-[#E7F5FC]"

                  }`}

                >

                  <p className="text-sm font-semibold text-black">

                    {notification.title}

                  </p>

                  <p className="mt-1 text-sm text-[#667085]">

                    {notification.message}

                  </p>

                  <p className="mt-3 text-xs text-[#8A94A3]">

                    {formatNotificationDate(notification.created_at)}

                  </p>

                </button>

              ))}

            </div>

          ) : (

            <p className="rounded-2xl bg-[#F2F5F8] p-4 text-sm text-[#667085]">

              Keine Benachrichtigungen vorhanden.

            </p>

          )}

        </div>

      )}



      {menuOpen && (

        <div

          className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) setMenuOpen(false);

          }}

        >

          <div className="ml-auto flex h-full w-[360px] max-w-[90vw] flex-col bg-white p-5 shadow-[-20px_0_70px_rgba(17,24,39,0.12)]">

            <div className="mb-7 flex items-center justify-between">

              <div className="flex min-w-0 items-center gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#E7F5FC] font-bold text-[#168FD0]">

                  {businessName ? businessName.charAt(0).toUpperCase() : "D"}

                </div>

                <div className="min-w-0">

                  <p className="truncate text-sm font-bold text-black">

                    {businessName || "Dipera"}

                  </p>

                  <p className="text-xs text-[#667085]">Administrator</p>

                </div>

              </div>



              <button

                type="button"

                onClick={() => setMenuOpen(false)}

                className="rounded-2xl p-2 text-[#667085] transition hover:bg-[#F2F5F8] hover:text-black"

              >

                <X className="h-6 w-6" />

              </button>

            </div>



            <nav className="min-h-0 flex-1 overflow-y-auto">

              <div className="flex flex-col gap-1 lg:hidden">

                {[...overviewLinks, ...workspaceLinks].map((link) =>

                  renderMobileNavLink(link)

                )}

              </div>



              <div className="mt-6 lg:mt-0">

                <p className="mb-2 px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8A94A3]">

                  Verwaltung

                </p>



                <div className="flex flex-col gap-1">

                  {workspaceLinks

                    .filter((link) => link.href === "/admin/corrections")

                    .map((link) => renderMobileNavLink(link))}



                  {adminLinks.map((link) => renderMobileNavLink(link))}



                  <button

                    type="button"

                    onClick={() => {

                      setMenuOpen(false);

                      handleOpenBillingPortal();

                    }}

                    className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-[#323542] transition hover:bg-[#F2F5F8] hover:text-black"

                  >

                    <CreditCard className="h-5 w-5" />

                    Abonnement verwalten

                  </button>

                </div>

              </div>

            </nav>



            <div className="mt-5 space-y-3">

              <a

                href="/kiosk"

                onClick={() => setMenuOpen(false)}

                className="flex items-center justify-between rounded-[24px] bg-[#F2F5F8] p-4 transition hover:bg-[#E7EDF1]"

              >

                <div>

                  <p className="text-xs text-[#667085]">Terminal</p>

                  <p className="mt-0.5 text-sm font-semibold text-black">

                    Stempelterminal öffnen

                  </p>

                </div>

                <ArrowUpRight className="h-5 w-5 text-[#168FD0]" />

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



      <section className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-auto">

        <div className="w-full px-4 py-6 md:px-6 lg:px-8 lg:py-8">

          {children}

        </div>

      </section>



      {showPopup && (

        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/25 p-6 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-[28px] bg-white p-6 text-center shadow-[0_24px_70px_rgba(17,24,39,0.18)]">

            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E7F5FC] font-bold text-[#168FD0]">

              !

            </div>



            <p className="text-xl font-semibold leading-8 tracking-[-0.02em] text-black">

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

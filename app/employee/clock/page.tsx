"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, MapPin, ShieldCheck } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { getBusiness } from "@/lib/getBusiness";
import { getBusinessId } from "@/lib/getBusinessId";
import { BUSINESS_TIME_ZONE } from "@/lib/config/businessTime";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CardBody from "@/components/ui/CardBody";
import CardHeader from "@/components/ui/CardHeader";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import StatsSkeleton from "@/components/skeletons/StatsSkeleton";
import { useToast } from "@/components/ui/ToastProvider";

type LocationTrackingMode =
  | "required"
  | "remote_allowed"
  | "disabled";

type Employee = {
  id: string;
  name: string;
  status: "not_checked_in" | "checked_in" | "on_break" | string;
  account_status: string;
  location_tracking_mode: LocationTrackingMode;
};

type Profile = {
  id: string;
  role: string;
  business_id: string;
  employee_id: string;
};

type TimeEntry = {
  id: string;
  employee_id: string;
  employee_name: string;
  action: "check_in" | "break_start" | "break_end" | "check_out" | string;
  created_at: string;
};

type ClockApiSuccess = {
  success: true;

  entry: {
    id: string | null;
    action: string;
    createdAt: string;
  };

  employee: {
    id: string;
    status: string;
  };

  location: {
    trackingMode: LocationTrackingMode;
    checkStatus: "verified" | "outside_allowed" | "disabled";
    verified: boolean;
    locationId: string | null;
    locationName: string | null;
    distanceMeters: number | null;
    accuracyMeters: number | null;
    capturedAt: string | null;
  };
};

type ClockApiError = {
  success: false;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
};

type MeasuredPosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
};

function getBestCurrentPosition(): Promise<MeasuredPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          "Dein Gerät unterstützt keine Standortbestimmung."
        )
      );
      return;
    }

    let bestPosition: GeolocationPosition | null = null;
    let watchId: number | null = null;
    let finished = false;

    function cleanup() {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      window.clearTimeout(timeoutId);
    }

    function finishWithPosition(position: GeolocationPosition) {
      if (finished) return;

      finished = true;
      cleanup();

      resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date(position.timestamp).toISOString(),
      });
    }

    function finishWithError(message: string) {
      if (finished) return;

      finished = true;
      cleanup();
      reject(new Error(message));
    }

    const timeoutId = window.setTimeout(() => {
      if (bestPosition) {
        finishWithPosition(bestPosition);
        return;
      }

      finishWithError(
        "Dein Standort konnte nicht rechtzeitig ermittelt werden."
      );
    }, 12000);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          position.coords.accuracy <
            bestPosition.coords.accuracy
        ) {
          bestPosition = position;
        }

        /*
         * Bei einer Genauigkeit von 25 Metern oder besser
         * müssen wir nicht weiter warten.
         */
        if (position.coords.accuracy <= 25) {
          finishWithPosition(position);
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          finishWithError(
            "Der Standortzugriff wurde abgelehnt. Bitte erlaube ihn in den Browser-Einstellungen."
          );
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          finishWithError(
            "Dein Standort ist momentan nicht verfügbar."
          );
          return;
        }

        if (error.code === error.TIMEOUT) {
          if (bestPosition) {
            finishWithPosition(bestPosition);
          } else {
            finishWithError(
              "Die Standortermittlung hat zu lange gedauert."
            );
          }
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  });
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
  });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: BUSINESS_TIME_ZONE,
  });
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} Min.`;

  return `${hours} Std. ${minutes} Min.`;
}

function getBusinessDateString(date = new Date()) {
  return date.toLocaleDateString("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
  });
}

function calculateWorkedMinutes(entries: TimeEntry[]) {
  const sortedEntries = [...entries].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  let totalMinutes = 0;
  let workStart: Date | null = null;
  let pauseStart: Date | null = null;

  sortedEntries.forEach((entry) => {
    const entryDate = new Date(
      new Date(entry.created_at).toLocaleString("en-US", {
        timeZone: BUSINESS_TIME_ZONE,
      })
    );

    if (entry.action === "check_in") {
      workStart = entryDate;
      pauseStart = null;
    }

    if (entry.action === "break_start" && workStart) {
      totalMinutes += (entryDate.getTime() - workStart.getTime()) / 60000;
      workStart = null;
      pauseStart = entryDate;
    }

    if (entry.action === "break_end" && pauseStart) {
      workStart = entryDate;
      pauseStart = null;
    }

    if (entry.action === "check_out" && workStart) {
      totalMinutes += (entryDate.getTime() - workStart.getTime()) / 60000;
      workStart = null;
      pauseStart = null;
    }
  });

  return Math.max(0, Math.round(totalMinutes));
}

function getNextStatus(action: string) {
  if (action === "check_in") return "checked_in";
  if (action === "break_start") return "on_break";
  if (action === "break_end") return "checked_in";
  if (action === "check_out") return "not_checked_in";
  return "not_checked_in";
}

function getActionLabel(action: string) {
  if (action === "check_in") return "Eingestempelt";
  if (action === "break_start") return "Pause gestartet";
  if (action === "break_end") return "Pause beendet";
  if (action === "check_out") return "Ausgestempelt";
  return action;
}

export default function EmployeeClockPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [now, setNow] = useState(new Date());

  async function loadEmployeeClockData() {
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, business_id, employee_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error(profileError);
        window.location.href = "/login";
        return;
      }

      const typedProfile = profile as Profile;

      if (typedProfile.role !== "employee") {
        window.location.href = "/admin";
        return;
      }

      if (!typedProfile.employee_id) {
        window.location.href = "/login";
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

      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select(
          "id, name, status, account_status, location_tracking_mode"
        )
        .eq("id", typedProfile.employee_id)
        .eq("business_id", typedProfile.business_id)
        .single();

      if (employeeError || !employeeData) {
        console.error(employeeError);
        window.location.href = "/login";
        return;
      }

      setBusinessName(business.name);
      setEmployee(employeeData as Employee);
      setEmployeeId(typedProfile.employee_id);

      await loadTimeEntries(typedProfile.employee_id);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTimeEntries(selectedEmployeeId: string) {
    if (!selectedEmployeeId) return;

    const businessId = await getBusinessId();

    if (!businessId) return;

    const today = getBusinessDateString();

    const { data, error } = await supabase
      .from("time_entries")
      .select("id, employee_id, employee_name, action, created_at")
      .eq("business_id", businessId)
      .eq("employee_id", selectedEmployeeId)
      .gte("created_at", `${today}T00:00:00`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Arbeitszeiten konnten nicht geladen werden",
        description: "Bitte versuche es erneut.",
      });
      return;
    }

    setTimeEntries((data || []) as TimeEntry[]);
  }

async function handleClockAction(
  action: TimeEntry["action"]
) {
  if (isProcessing || !employee || !employeeId) return;

  setIsProcessing(true);

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      showToast({
        type: "error",
        title: "Anmeldung abgelaufen",
        description:
          "Bitte melde dich erneut an und versuche es noch einmal.",
      });

      return;
    }

    let positionPayload: Partial<MeasuredPosition> = {};

    /*
     * Bei deaktivierter Standortprüfung wird keine
     * GPS-Berechtigung angefordert.
     */
    if (employee.location_tracking_mode !== "disabled") {
      try {
        positionPayload = await getBestCurrentPosition();
      } catch (error) {
        showToast({
          type: "error",
          title: "Standort konnte nicht geprüft werden",
          description:
            error instanceof Error
              ? error.message
              : "Bitte versuche es erneut.",
        });

        return;
      }
    }

    const response = await fetch(
      "/api/time-entries/clock",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action,

          ...(employee.location_tracking_mode !== "disabled"
            ? {
                latitude: positionPayload.latitude,
                longitude: positionPayload.longitude,
                accuracy: positionPayload.accuracy,
                capturedAt: positionPayload.capturedAt,
              }
            : {}),
        }),
      }
    );

    const payload = (await response.json()) as
      | ClockApiSuccess
      | ClockApiError;

    if (!response.ok || !payload.success) {
      const apiError = payload as ClockApiError;

      showToast({
        type: "error",
        title: "Stempelung nicht möglich",
        description:
          apiError.error?.message ??
          "Die Stempelung konnte nicht gespeichert werden.",
      });

      return;
    }

    const result = payload as ClockApiSuccess;

    setEmployee((current) =>
      current
        ? {
            ...current,
            status: result.employee.status,
          }
        : current
    );

    const createdAt =
      result.entry.createdAt || new Date().toISOString();

    const newEntry: TimeEntry = {
      id: result.entry.id ?? `temp-${Date.now()}`,
      employee_id: employee.id,
      employee_name: employee.name,
      action,
      created_at: createdAt,
    };

    const updatedEntries = [...timeEntries, newEntry];

    setTimeEntries(updatedEntries);

    /*
     * Danach noch einmal aus der Datenbank synchronisieren.
     * Der unmittelbare lokale Eintrag verhindert, dass die UI
     * bis dahin veraltet wirkt.
     */
    await loadTimeEntries(employee.id);

    const currentTime = new Date(
      createdAt
    ).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: BUSINESS_TIME_ZONE,
    });

    if (action === "check_in") {
      showToast({
        type: "success",
        title: "Eingestempelt",
        description: `Viel Spaß bei der Arbeit! Du hast dich um ${currentTime} Uhr eingestempelt.`,
      });
    }

    if (action === "break_start") {
      showToast({
        type: "success",
        title: "Pause gestartet",
        description: `Gute Pause! Du hast deine Pause um ${currentTime} Uhr gestartet.`,
      });
    }

    if (action === "break_end") {
      showToast({
        type: "success",
        title: "Pause beendet",
        description: `Willkommen zurück! Du hast deine Pause um ${currentTime} Uhr beendet.`,
      });
    }

    if (action === "check_out") {
      showToast({
        type: "success",
        title: "Ausgestempelt",
        description: `Schönen Feierabend! Du hast dich um ${currentTime} Uhr ausgestempelt und heute ${formatMinutes(
          calculateWorkedMinutes(updatedEntries)
        )} gearbeitet.`,
      });
    }
  } catch (error) {
    console.error("CLOCK ACTION ERROR:", error);

    showToast({
      type: "error",
      title: "Stempelung fehlgeschlagen",
      description:
        "Es ist ein unerwarteter Fehler aufgetreten. Bitte versuche es erneut.",
    });
  } finally {
    setIsProcessing(false);
  }
}

  useEffect(() => {
    loadEmployeeClockData();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const todayWorkedMinutes = useMemo(
    () => calculateWorkedMinutes(timeEntries),
    [timeEntries]
  );

  const lastEntry = timeEntries[timeEntries.length - 1];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Arbeitszeit erfassen"
          description="Lade deine Stempelübersicht."
        />

        <StatsSkeleton count={3} />
      </div>
    );
  }

  if (!employee) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-[#64748B]">
            Mitarbeiter konnte nicht geladen werden.
          </p>
        </CardBody>
      </Card>
    );
  }

  const isCheckedIn = employee.status === "checked_in";
  const isOnBreak = employee.status === "on_break";
  const isNotCheckedIn = !isCheckedIn && !isOnBreak;

  return (
    <div className="space-y-8">
      <div className="hidden md:block">
      <PageHeader
        title="Arbeitszeit erfassen"
        description="Stempele deine Arbeitszeit direkt über dein Mitarbeiter-Dashboard."
      />
    </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardBody className="p-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-[#64748B]">{businessName}</p>
                <h1 className="mt-2 text-4xl font-light tracking-[-0.04em] text-[#0F172A]">
                  Hallo, {employee.name}
                </h1>
              </div>

              <Badge
                variant={
                  isCheckedIn ? "success" : isOnBreak ? "warning" : "muted"
                }
                dot
              >
                {isCheckedIn
                  ? "Eingestempelt"
                  : isOnBreak
                  ? "In Pause"
                  : "Nicht eingestempelt"}
              </Badge>
            </div>

            <div className="mb-8 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 text-center">
              <p className="text-sm font-medium text-[#64748B]">
                Aktuelle Uhrzeit
              </p>
              <p className="mt-2 text-5xl font-light tracking-[-0.06em] text-[#0F172A]">
                {now.toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: BUSINESS_TIME_ZONE,
                })}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {isNotCheckedIn && (
                <Button
                  size="lg"
                  fullWidth
                  loading={isProcessing}
                  onClick={() => handleClockAction("check_in")}
                >
                  Einstempeln
                </Button>
              )}

              {isCheckedIn && (
                <>
                  <Button
                    size="lg"
                    variant="secondary"
                    fullWidth
                    loading={isProcessing}
                    onClick={() => handleClockAction("break_start")}
                  >
                    Pause starten
                  </Button>

                  <Button
                    size="lg"
                    variant="primary"
                    fullWidth
                    loading={isProcessing}
                    onClick={() => handleClockAction("check_out")}
                  >
                    Ausstempeln
                  </Button>
                </>
              )}

              {isOnBreak && (
                <Button
                  size="lg"
                  fullWidth
                  loading={isProcessing}
                  onClick={() => handleClockAction("break_end")}
                >
                  Pause beenden
                </Button>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">
                    Standortprüfung
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">
                    Die Zeiterfassung ist an deinen Standort gekoppelt.
                    Wir prüfen diesen ausschließlich, wenn du eine Stempelung tätigst.
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <Clock className="h-5 w-5" />
              </div>

              <p className="text-sm text-[#64748B]">Heute gearbeitet</p>
              <p className="mt-2 text-4xl font-light tracking-[-0.04em] text-[#0F172A]">
                {formatMinutes(todayWorkedMinutes)}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <p className="text-sm text-[#64748B]">Letzte Stempelung</p>
              {lastEntry ? (
                <>
                  <p className="mt-2 text-xl font-semibold text-[#0F172A]">
                    {getActionLabel(lastEntry.action)}
                  </p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    {formatDateTime(lastEntry.created_at)}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-[#64748B]">
                  Heute wurde noch keine Stempelung erfasst.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Section
        title="Heutige Stempelungen"
        description="Deine erfassten Aktionen des aktuellen Tages."
      >
        {timeEntries.length > 0 ? (
          <div className="flex flex-col gap-3">
            {timeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:border-[#CBD5E1] md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold text-[#0F172A]">
                    {getActionLabel(entry.action)}
                  </p>
                  <p className="text-sm text-[#64748B]">
                    {formatDateTime(entry.created_at)}
                  </p>
                </div>

                <Badge variant="primary">
                  {formatTime(entry.created_at)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-10 text-center">
            <p className="text-lg font-semibold text-[#0F172A]">
              Noch keine Stempelungen heute
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">
              Sobald du dich ein- oder ausstempelst, erscheinen deine heutigen
              Aktionen hier.
            </p>
          </div>
        )}
      </Section>
    </div>
  );
}

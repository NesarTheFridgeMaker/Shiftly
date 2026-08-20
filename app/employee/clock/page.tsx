"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, MapPin, ShieldCheck } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { getBusiness } from "@/lib/getBusiness";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import CardBody from "@/components/ui/CardBody";
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
  local_created_at: string;
};

type TodayClockData = {
  employee: {
    id: string;
    name: string;
    business_id: string;
    status: string;
  };
  business_timezone: string;
  local_date: string;
  business_local_now: string;
  worked_minutes: number;
  last_entry: TimeEntry | null;
  entries: TimeEntry[];
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

function formatLocalTime(localDateTime: string) {
  const match = localDateTime.match(
    /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2})/
  );

  if (!match) return "--:--";

  return `${match[1]}:${match[2]}`;
}

function formatLocalDateTime(localDateTime: string) {
  const match = localDateTime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
  );

  if (!match) return localDateTime;

  const [, year, month, day, hour, minute] = match;

  return `${day}.${month}.${year.slice(-2)}, ${hour}:${minute}`;
}

function formatMinutes(totalMinutes: number) {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours <= 0) return `${minutes} Min.`;

  return `${hours} Std. ${minutes.toString().padStart(2, "0")} Min.`;
}

function parseBusinessWallClock(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/
  );

  if (!match) {
    throw new Error(`Ungültige Betriebszeit: ${value}`);
  }

  const [, year, month, day, hour, minute, second, fraction = ""] = match;
  const milliseconds = Number(fraction.padEnd(3, "0").slice(0, 3));

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      milliseconds
    )
  );
}

function formatBusinessClock(date: Date) {
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");
  const second = date.getUTCSeconds().toString().padStart(2, "0");

  return `${hour}:${minute}:${second}`;
}

function getActionLabel(action: string) {
  if (action === "check_in") return "Eingestempelt";
  if (action === "break_start") return "Pause gestartet";
  if (action === "break_end") return "Pause beendet";
  if (action === "check_out") return "Ausgestempelt";
  return action;
}

function isTodayClockData(value: unknown): value is TodayClockData {
  if (!value || typeof value !== "object") return false;

  const data = value as Partial<TodayClockData>;

  return (
    !!data.employee &&
    typeof data.employee === "object" &&
    typeof data.business_timezone === "string" &&
    typeof data.local_date === "string" &&
    typeof data.business_local_now === "string" &&
    typeof data.worked_minutes === "number" &&
    Array.isArray(data.entries)
  );
}

export default function EmployeeClockPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [lastEntry, setLastEntry] = useState<TimeEntry | null>(null);
  const [todayWorkedMinutes, setTodayWorkedMinutes] = useState(0);
  const [businessTimezone, setBusinessTimezone] = useState("Europe/Berlin");
  const [businessNow, setBusinessNow] = useState<Date | null>(null);

  const businessClockBaseRef = useRef<Date | null>(null);
  const businessClockPerformanceBaseRef = useRef<number | null>(null);

  function syncBusinessClock(businessLocalNow: string) {
    const parsed = parseBusinessWallClock(businessLocalNow);

    businessClockBaseRef.current = parsed;
    businessClockPerformanceBaseRef.current = performance.now();
    setBusinessNow(parsed);
  }

  async function fetchTodayClockData(): Promise<TodayClockData> {
    const { data, error } = await supabase.rpc(
      "get_my_today_clock_data"
    );

    if (error) {
      throw error;
    }

    if (!isTodayClockData(data)) {
      throw new Error(
        "Die heutigen Zeiterfassungsdaten sind ungültig."
      );
    }

    return data;
  }

  function applyTodayClockData(clockData: TodayClockData) {
    setTimeEntries(clockData.entries);
    setLastEntry(clockData.last_entry);
    setTodayWorkedMinutes(clockData.worked_minutes);
    setBusinessTimezone(clockData.business_timezone);
    syncBusinessClock(clockData.business_local_now);

    setEmployee((current) =>
      current
        ? {
            ...current,
            status: clockData.employee.status,
          }
        : current
    );
  }

  async function refreshTodayClockData() {
    if (!employeeId) return;

    try {
      const clockData = await fetchTodayClockData();
      applyTodayClockData(clockData);
    } catch (error) {
      console.error("TODAY CLOCK REFRESH ERROR:", error);
    }
  }

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

      const clockData = await fetchTodayClockData();

      setBusinessName(business.name);
      setEmployeeId(typedProfile.employee_id);

      setEmployee({
        ...(employeeData as Employee),
        status: clockData.employee.status,
      });

      setTimeEntries(clockData.entries);
      setLastEntry(clockData.last_entry);
      setTodayWorkedMinutes(clockData.worked_minutes);
      setBusinessTimezone(clockData.business_timezone);
      syncBusinessClock(clockData.business_local_now);
    } catch (error) {
      console.error("EMPLOYEE CLOCK LOAD ERROR:", error);

      showToast({
        type: "error",
        title: "Zeiterfassung konnte nicht geladen werden",
        description:
          "Bitte lade die Seite neu und versuche es erneut.",
      });
    } finally {
      setIsLoading(false);
    }
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

      const clockData = await fetchTodayClockData();
      applyTodayClockData(clockData);

      const currentTime =
        clockData.last_entry?.local_created_at
          ? formatLocalTime(clockData.last_entry.local_created_at)
          : "--:--";

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
            clockData.worked_minutes
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
      const base = businessClockBaseRef.current;
      const performanceBase =
        businessClockPerformanceBaseRef.current;

      if (!base || performanceBase === null) return;

      const elapsedMilliseconds =
        performance.now() - performanceBase;

      setBusinessNow(
        new Date(base.getTime() + elapsedMilliseconds)
      );
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!employeeId) return;

    const interval = window.setInterval(() => {
      void refreshTodayClockData();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [employeeId]);

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
                {businessNow
                  ? formatBusinessClock(businessNow)
                  : "--:--:--"}
              </p>
              <p className="mt-2 text-xs text-[#94A3B8]">
                {businessTimezone}
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
                    {employee.location_tracking_mode === "disabled"
                      ? "Für deine Stempelungen wird derzeit kein Standort benötigt."
                      : "Die Zeiterfassung ist an deinen Standort gekoppelt. Wir prüfen diesen ausschließlich, wenn du eine Stempelung tätigst."}
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
                    {formatLocalDateTime(lastEntry.local_created_at)}
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
                    {formatLocalDateTime(entry.local_created_at)}
                  </p>
                </div>

                <Badge variant="primary">
                  {formatLocalTime(entry.local_created_at)}
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

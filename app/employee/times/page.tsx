"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import StatsSkeleton from "@/components/skeletons/StatsSkeleton";
import { useToast } from "@/components/ui/ToastProvider";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";

type Profile = {
  employee_id: string | null;
};

type TimeEntry = {
  id: string;
  employee_id: string;
  employee_name: string;
  action: string;
  created_at: string;
  business_id: string;
};

type DaySummary = {
  date: string;
  entries: TimeEntry[];
  firstCheckIn: TimeEntry | null;
  lastCheckOut: TimeEntry | null;
  breakMinutes: number;
  workedMinutes: number;
  isOpen: boolean;
};

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);

  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonth(date: Date) {
  return date.toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

function formatTime(created_at?: string | null) {
  if (!created_at) return "—";

  return new Date(created_at).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}:${String(minutes).padStart(2, "0")} Std.`;
}

function getEntryLabel(type: string) {
  if (type === "check_in") return "Arbeitsbeginn";
  if (type === "break_start") return "Pause gestartet";
  if (type === "break_end") return "Pause beendet";
  if (type === "check_out") return "Arbeitsende";
  return type;
}

function groupEntriesByDay(entries: TimeEntry[]) {
  const grouped = new Map<string, TimeEntry[]>();

  entries.forEach((entry) => {
    const dateKey = new Date(entry.created_at).toLocaleDateString("en-CA");
    const current = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...current, entry]);
  });

  return Array.from(grouped.entries())
    .map(([date, dayEntries]) => {
      const sortedEntries = [...dayEntries].sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      const firstCheckIn =
        sortedEntries.find((entry) => entry.action === "check_in") || null;

      const checkOuts = sortedEntries.filter(
        (entry) => entry.action === "check_out"
      );
      const lastCheckOut = checkOuts[checkOuts.length - 1] || null;

      let breakMinutes = 0;
      let currentBreakStart: TimeEntry | null = null;

      sortedEntries.forEach((entry) => {
        if (entry.action === "break_start") {
          currentBreakStart = entry;
        }

        if (entry.action === "break_end" && currentBreakStart) {
          breakMinutes += Math.max(
            0,
            Math.round(
              (new Date(entry.created_at).getTime() -
                new Date(currentBreakStart.created_at).getTime()) /
                60000
            )
          );
          currentBreakStart = null;
        }
      });

      const grossMinutes =
        firstCheckIn && lastCheckOut
          ? Math.max(
              0,
              Math.round(
                (new Date(lastCheckOut.created_at).getTime() -
                  new Date(firstCheckIn.created_at).getTime()) /
                  60000
              )
            )
          : 0;

      const workedMinutes = Math.max(0, grossMinutes - breakMinutes);
      const isOpen = Boolean(firstCheckIn && !lastCheckOut);

      return {
        date,
        entries: sortedEntries,
        firstCheckIn,
        lastCheckOut,
        breakMinutes,
        workedMinutes,
        isOpen,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export default function EmployeeTimesPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  const summaries = useMemo(() => groupEntriesByDay(entries), [entries]);

  const totalWorkedMinutes = summaries.reduce(
    (sum, day) => sum + day.workedMinutes,
    0
  );

  const completedDays = summaries.filter((day) => !day.isOpen).length;
  const openDays = summaries.filter((day) => day.isOpen).length;

  async function loadEntries() {
    setIsLoading(true);

    try {
      const businessId = await getBusinessId();

      if (!businessId) {
        showToast({
          type: "error",
          title: "Betrieb nicht gefunden",
          description: "Deine Arbeitszeiten konnten nicht geladen werden.",
        });
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showToast({
          type: "error",
          title: "Nicht angemeldet",
          description: "Bitte melde dich erneut an.",
        });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("employee_id")
        .eq("id", user.id)
        .single<Profile>();

      if (profileError || !profile?.employee_id) {
        console.error(profileError);
        showToast({
          type: "error",
          title: "Mitarbeiterprofil fehlt",
          description: "Deine Arbeitszeiten konnten nicht zugeordnet werden.",
        });
        return;
      }

      const { startIso, endIso } = getMonthRange(currentMonth);

      const { data, error } = await supabase
        .from("time_entries")
        .select("id, employee_id, employee_name, action, created_at, business_id")
        .eq("business_id", businessId)
        .eq("employee_id", profile.employee_id)
        .gte("created_at", startIso)
        .lt("created_at", endIso)
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Arbeitszeiten konnten nicht geladen werden",
          description: error.message,
        });
        return;
      }

      setEntries((data || []) as TimeEntry[]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, [currentMonth]);

  function goToPreviousMonth() {
    setCurrentMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
    );
  }

  function goToNextMonth() {
    setCurrentMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Arbeitszeiten"
          description="Hier erscheinen deine gestempelten Arbeitstage im aktuellen Monat."
        />

        <StatsSkeleton count={3} />

        <Section
          title="Monatsübersicht"
          description="Deine Arbeitstage werden geladen."
        >
          <TableSkeleton rows={6} columns={5} />
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Arbeitszeiten"
        description="Sieh dir deine vollständig gestempelten Arbeitstage und die gearbeitete Gesamtzeit an."
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard
          title="Monat"
          value={formatMonth(currentMonth)}
          badge="Zeitraum"
          badgeVariant="primary"
        />

        <StatCard
          title="Gesamt gearbeitet"
          value={formatMinutes(totalWorkedMinutes)}
          badge="Monat"
          badgeVariant="success"
        />

        <StatCard
          title="Arbeitstage"
          value={completedDays}
          badge={openDays > 0 ? `${openDays} offen` : "vollständig"}
          badgeVariant={openDays > 0 ? "warning" : "success"}
        />
      </div>

      <Section
        title="Monatsübersicht"
        description="Alle gestempelten Tage des ausgewählten Monats."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goToPreviousMonth}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            >
              Zurück
            </button>

            <button
              type="button"
              onClick={goToNextMonth}
              className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            >
              Weiter
            </button>
          </div>
        }
      >
        {summaries.length === 0 ? (
          <EmptyState
            title="Keine Arbeitszeiten vorhanden"
            description="Für diesen Monat wurden noch keine Arbeitszeiten gestempelt."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHead>
                  <tr>
                    <TableHeaderCell>Datum</TableHeaderCell>
                    <TableHeaderCell>Beginn</TableHeaderCell>
                    <TableHeaderCell>Pause</TableHeaderCell>
                    <TableHeaderCell>Ende</TableHeaderCell>
                    <TableHeaderCell>Gesamt</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                  </tr>
                </TableHead>

                <TableBody>
                  {summaries.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell>{formatDate(day.date)}</TableCell>
                      <TableCell>{formatTime(day.firstCheckIn?.created_at)}</TableCell>
                      <TableCell>{formatMinutes(day.breakMinutes)}</TableCell>
                      <TableCell>{formatTime(day.lastCheckOut?.created_at)}</TableCell>
                      <TableCell>
                        {day.isOpen ? "—" : formatMinutes(day.workedMinutes)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={day.isOpen ? "warning" : "success"}
                          dot
                        >
                          {day.isOpen ? "Offen" : "Vollständig"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col gap-4 md:hidden">
              {summaries.map((day) => (
                <div
                  key={day.date}
                  className="rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[#0F172A]">
                        {formatDate(day.date)}
                      </p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        {day.entries.map((entry) => getEntryLabel(entry.action)).join(" · ")}
                      </p>
                    </div>

                    <Badge variant={day.isOpen ? "warning" : "success"} dot>
                      {day.isOpen ? "Offen" : "Vollständig"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-[#F8FAFC] p-3">
                      <p className="text-[#64748B]">Beginn</p>
                      <p className="mt-1 font-semibold text-[#0F172A]">
                        {formatTime(day.firstCheckIn?.created_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#F8FAFC] p-3">
                      <p className="text-[#64748B]">Ende</p>
                      <p className="mt-1 font-semibold text-[#0F172A]">
                        {formatTime(day.lastCheckOut?.created_at)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#F8FAFC] p-3">
                      <p className="text-[#64748B]">Pause</p>
                      <p className="mt-1 font-semibold text-[#0F172A]">
                        {formatMinutes(day.breakMinutes)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-[#F8FAFC] p-3">
                      <p className="text-[#64748B]">Gesamt</p>
                      <p className="mt-1 font-semibold text-[#0F172A]">
                        {day.isOpen ? "—" : formatMinutes(day.workedMinutes)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>
    </div>
  );
}

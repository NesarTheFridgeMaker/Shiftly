"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

type TimeEntry = {
  id: string;
  employee_id: string;
  employee_name: string;
  action: string;
  created_at: string;
};

type WorkSummary = {
  key: string;
  employee_id: string;
  employee_name: string;
  date: string;
  start: string;
  end: string;
  workMinutes: number;
  pauseMinutes: number;
  workDuration: string;
  pauseDuration: string;
  entries: TimeEntry[];
};

type PeriodSummary = {
  key: string;
  employee_name: string;
  period: string;
  workMinutes: number;
  pauseMinutes: number;
};

function formatAction(action: string) {
  if (action === "check_in") return "Einstempeln";
  if (action === "break_start") return "Pausenbeginn";
  if (action === "break_end") return "Pausenende";
  if (action === "check_out") return "Ausstempeln";
  return action;
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE");
}

function formatMonth(dateString: string) {
  return new Date(dateString).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
}

function getWeekNumber(date: Date) {
  const copiedDate = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNumber = copiedDate.getUTCDay() || 7;

  copiedDate.setUTCDate(copiedDate.getUTCDate() + 4 - dayNumber);

  const yearStart = new Date(Date.UTC(copiedDate.getUTCFullYear(), 0, 1));

  return Math.ceil(
    ((copiedDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
}

function formatWeek(dateString: string) {
  const date = new Date(dateString);
  const week = getWeekNumber(date);
  const year = date.getFullYear();

  return `KW ${week} / ${year}`;
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes} Min.`;
  }

  return `${hours} Std. ${minutes} Min.`;
}

function buildDailySummaries(entries: TimeEntry[]): WorkSummary[] {
  const groups: Record<string, TimeEntry[]> = {};

  entries.forEach((entry) => {
    const date = formatDate(entry.created_at);
    const key = `${entry.employee_id}-${date}`;

    if (!groups[key]) {
      groups[key] = [];
    }

    groups[key].push(entry);
  });

  return Object.entries(groups).map(([key, groupEntries]) => {
    const sortedEntries = [...groupEntries].sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );

    const checkIn = sortedEntries.find(
      (entry) => entry.action === "check_in"
    );

    const checkOut = [...sortedEntries]
      .reverse()
      .find((entry) => entry.action === "check_out");

    let pauseMinutes = 0;
    let currentPauseStart: Date | null = null;

    sortedEntries.forEach((entry) => {
      if (entry.action === "break_start") {
        currentPauseStart = new Date(entry.created_at);
      }

      if (entry.action === "break_end" && currentPauseStart) {
        const pauseEnd = new Date(entry.created_at);

        pauseMinutes += Math.round(
          (pauseEnd.getTime() - currentPauseStart.getTime()) / 60000
        );

        currentPauseStart = null;
      }
    });

    let workMinutes = 0;

    if (checkIn && checkOut) {
      const start = new Date(checkIn.created_at);
      const end = new Date(checkOut.created_at);

      workMinutes = Math.round(
        (end.getTime() - start.getTime()) / 60000
      );

      workMinutes = workMinutes - pauseMinutes;
    }

    return {
      key,
      employee_id: sortedEntries[0].employee_id,
      employee_name: sortedEntries[0].employee_name,
      date: formatDate(sortedEntries[0].created_at),
      start: checkIn ? formatTime(checkIn.created_at) : "Offen",
      end: checkOut ? formatTime(checkOut.created_at) : "Offen",
      workMinutes,
      pauseMinutes,
      workDuration:
        checkIn && checkOut ? formatMinutes(workMinutes) : "Noch offen",
      pauseDuration: formatMinutes(pauseMinutes),
      entries: sortedEntries,
    };
  });
}

function buildPeriodSummaries(
  dailySummaries: WorkSummary[],
  periodType: "week" | "month"
): PeriodSummary[] {
  const groups: Record<string, PeriodSummary> = {};

  dailySummaries.forEach((summary) => {
    const firstEntry = summary.entries[0];

    const period =
      periodType === "week"
        ? formatWeek(firstEntry.created_at)
        : formatMonth(firstEntry.created_at);

    const key = `${summary.employee_id}-${period}`;

    if (!groups[key]) {
      groups[key] = {
        key,
        employee_name: summary.employee_name,
        period,
        workMinutes: 0,
        pauseMinutes: 0,
      };
    }

    groups[key].workMinutes += summary.workMinutes;
    groups[key].pauseMinutes += summary.pauseMinutes;
  });

  return Object.values(groups);
}

export default function TimesPage() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [openDetails, setOpenDetails] = useState<string | null>(null);

async function loadTimeEntries() {
  const businessId = await getBusinessId();

  if (!businessId) {
    console.error("Keine Business-ID gefunden.");
    return;
  }

  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    alert(JSON.stringify(error, null, 2));
    return;
  }

  setTimeEntries(data || []);
}

  useEffect(() => {
    loadTimeEntries();
  }, []);

  const dailySummaries = buildDailySummaries(timeEntries);
  const weeklySummaries = buildPeriodSummaries(dailySummaries, "week");
  const monthlySummaries = buildPeriodSummaries(dailySummaries, "month");

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold text-blue-950 mb-6 md:mb-8">
        Arbeitszeiten
      </h1>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Tagesübersicht
        </h2>

        <div className="md:hidden flex flex-col gap-4">
          {dailySummaries.map((summary) => (
            <div
              key={summary.key}
              className="bg-gray-50 rounded-2xl p-4 border shadow-sm"
            >
              <div className="mb-4">
                <h3 className="text-lg font-bold text-blue-950">
                  {summary.employee_name}
                </h3>
                <p className="text-sm text-gray-500">{summary.date}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Arbeitszeit</p>
                  <p className="font-semibold text-black">
                    {summary.start} - {summary.end}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Gesamt</p>
                  <p className="font-bold text-green-700">
                    {summary.workDuration}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3 col-span-2">
                  <p className="text-gray-500 mb-1">Pause</p>
                  <p className="font-bold text-yellow-600">
                    {summary.pauseDuration}
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  setOpenDetails(
                    openDetails === summary.key ? null : summary.key
                  )
                }
                className="w-full bg-blue-950 text-white px-4 py-3 rounded-xl hover:bg-blue-900 transition"
              >
                Stempelverlauf
              </button>

              {openDetails === summary.key && (
                <div className="mt-4 bg-white rounded-xl p-4">
                  <h4 className="font-bold text-blue-950 mb-3">
                    Stempelverlauf
                  </h4>

                  <div className="flex flex-col gap-2">
                    {summary.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex justify-between border-b py-2 text-black text-sm"
                      >
                        <span>{formatAction(entry.action)}</span>
                        <span>{formatTime(entry.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-3">Mitarbeiter</th>
                <th className="py-3 px-3">Datum</th>
                <th className="py-3 px-3">Arbeitszeit</th>
                <th className="py-3 px-3">Gesamt</th>
                <th className="py-3 px-3">Pause</th>
                <th className="py-3 px-3">Details</th>
              </tr>
            </thead>

            <tbody>
              {dailySummaries.map((summary) => (
                <React.Fragment key={summary.key}>
                  <tr className="border-b">
                    <td className="py-3 px-3 text-black">
                      {summary.employee_name}
                    </td>

                    <td className="py-3 px-3 text-black">
                      {summary.date}
                    </td>

                    <td className="py-3 px-3 text-black">
                      {summary.start} - {summary.end}
                    </td>

                    <td className="py-3 px-3 font-bold text-green-700">
                      {summary.workDuration}
                    </td>

                    <td className="py-3 px-3 text-yellow-600 font-bold">
                      {summary.pauseDuration}
                    </td>

                    <td className="py-3 px-3">
                      <button
                        onClick={() =>
                          setOpenDetails(
                            openDetails === summary.key ? null : summary.key
                          )
                        }
                        className="bg-blue-950 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition"
                      >
                        Stempelverlauf
                      </button>
                    </td>
                  </tr>

                  {openDetails === summary.key && (
                    <tr>
                      <td colSpan={6} className="bg-gray-100 p-4">
                        <div className="rounded-xl bg-white p-4">
                          <h3 className="font-bold text-blue-950 mb-3">
                            Stempelverlauf
                          </h3>

                          <div className="flex flex-col gap-2">
                            {summary.entries.map((entry) => (
                              <div
                                key={entry.id}
                                className="flex justify-between border-b py-2 text-black"
                              >
                                <span>{formatAction(entry.action)}</span>
                                <span>{formatTime(entry.created_at)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {dailySummaries.length === 0 && (
          <p className="text-gray-500 mt-4">
            Noch keine Arbeitszeiten vorhanden.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-8">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Wochenübersicht
        </h2>

        <div className="md:hidden flex flex-col gap-4">
          {weeklySummaries.map((summary) => (
            <div
              key={summary.key}
              className="bg-gray-50 rounded-2xl p-4 border shadow-sm"
            >
              <h3 className="text-lg font-bold text-blue-950">
                {summary.employee_name}
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                {summary.period}
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Arbeitsstunden</p>
                  <p className="font-bold text-green-700">
                    {formatMinutes(summary.workMinutes)}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Pausenzeit</p>
                  <p className="font-bold text-yellow-600">
                    {formatMinutes(summary.pauseMinutes)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-3">Mitarbeiter</th>
                <th className="py-3 px-3">Woche</th>
                <th className="py-3 px-3">Arbeitsstunden</th>
                <th className="py-3 px-3">Pausenzeit</th>
              </tr>
            </thead>

            <tbody>
              {weeklySummaries.map((summary) => (
                <tr key={summary.key} className="border-b">
                  <td className="py-3 px-3 text-black">
                    {summary.employee_name}
                  </td>

                  <td className="py-3 px-3 text-black">
                    {summary.period}
                  </td>

                  <td className="py-3 px-3 font-bold text-green-700">
                    {formatMinutes(summary.workMinutes)}
                  </td>

                  <td className="py-3 px-3 font-bold text-yellow-600">
                    {formatMinutes(summary.pauseMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {weeklySummaries.length === 0 && (
          <p className="text-gray-500 mt-4">
            Noch keine Wochenwerte vorhanden.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6">
        <h2 className="text-2xl font-semibold text-blue-950 mb-4">
          Monatsübersicht
        </h2>

        <div className="md:hidden flex flex-col gap-4">
          {monthlySummaries.map((summary) => (
            <div
              key={summary.key}
              className="bg-gray-50 rounded-2xl p-4 border shadow-sm"
            >
              <h3 className="text-lg font-bold text-blue-950">
                {summary.employee_name}
              </h3>

              <p className="text-sm text-gray-500 mb-4">
                {summary.period}
              </p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Arbeitsstunden</p>
                  <p className="font-bold text-green-700">
                    {formatMinutes(summary.workMinutes)}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Pausenzeit</p>
                  <p className="font-bold text-yellow-600">
                    {formatMinutes(summary.pauseMinutes)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-3">Mitarbeiter</th>
                <th className="py-3 px-3">Monat</th>
                <th className="py-3 px-3">Arbeitsstunden</th>
                <th className="py-3 px-3">Pausenzeit</th>
              </tr>
            </thead>

            <tbody>
              {monthlySummaries.map((summary) => (
                <tr key={summary.key} className="border-b">
                  <td className="py-3 px-3 text-black">
                    {summary.employee_name}
                  </td>

                  <td className="py-3 px-3 text-black">
                    {summary.period}
                  </td>

                  <td className="py-3 px-3 font-bold text-green-700">
                    {formatMinutes(summary.workMinutes)}
                  </td>

                  <td className="py-3 px-3 font-bold text-yellow-600">
                    {formatMinutes(summary.pauseMinutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {monthlySummaries.length === 0 && (
          <p className="text-gray-500 mt-4">
            Noch keine Monatswerte vorhanden.
          </p>
        )}
      </div>
    </div>
  );
}
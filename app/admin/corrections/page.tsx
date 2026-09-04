"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Input from "@/components/ui/Input";
import TimeInput from "@/components/ui/TimeInput";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/ToastProvider";
import StatsSkeleton from "@/components/skeletons/StatsSkeleton";
import TableSkeleton from "@/components/skeletons/TableSkeleton";

type CorrectionRequest = {
  id: string;
  business_id: string;
  employee_id: string;
  employee_name: string;
  correction_date: string;
  requested_start_time: string | null;
  requested_end_time: string | null;
  reason: string | null;
  status: string;
  created_at: string;
};

type EmployeeOption = {
  id: string;
  name: string;
};

type TimeConflict = {
  conflict_id: string;
  business_id: string;
  employee_id: string;
  employee_name: string;
  conflict_date: string;
  conflict_type: string;
  source_entry_id: string | null;
  check_in_at: string | null;
  check_in_local: string | null;
  resolution_entry_id: string | null;
  corrected_checkout_at: string | null;
  corrected_checkout_local: string | null;
  detected_at: string;
  status: "open" | "resolved" | "ignored";
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_by_role: string | null;
  resolution_reason: string | null;
};

type ComplianceWarning = {
  id: string;
  business_id: string;
  employee_id: string;
  employee_name: string;
  warning_date: string;
  warning_type:
    | "daily_net_over_10h"
    | "rest_period_under_11h"
    | "insufficient_break"
    | "continuous_work_over_6h"
    | string;
  status: "open" | "resolved" | "ignored" | string;
  details: Record<string, unknown> | null;
  detected_at: string;
  resolved_at: string | null;
  resolution_reason: string | null;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  acknowledgement_note: string | null;
  created_at: string;
  updated_at: string;
};

const HISTORY_PAGE_SIZE = 25;

const monthOptions = [
  { value: 1, label: "Januar" },
  { value: 2, label: "Februar" },
  { value: 3, label: "März" },
  { value: 4, label: "April" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Dezember" },
];

function buildDateOnly(year: number, month: number, day: number) {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function getMonthRange(year: number, month: number) {
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    fromDate: buildDateOnly(year, month, 1),
    toDateExclusive: buildDateOnly(nextYear, nextMonth, 1),
  };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("de-DE");
}

function formatTime(time: string | null) {
  if (!time) return "—";
  return time.slice(0, 5);
}

function formatLocalDateTime(value: string | null) {
  if (!value) return "—";

  const normalized = value.replace(" ", "T");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    const [datePart, timePart] = value.split(/[ T]/);
    if (!datePart || !timePart) return value;

    const [year, month, day] = datePart.split("-");
    return `${day}.${month}.${year}, ${timePart.slice(0, 5)} Uhr`;
  }

  return (
    date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }) + " Uhr"
  );
}

function formatStatus(status: string) {
  if (status === "pending") return "Offen";
  if (status === "approved") return "Genehmigt";
  if (status === "rejected") return "Abgelehnt";
  return status;
}

function getStatusVariant(status: string) {
  if (status === "approved") return "success" as const;
  if (status === "rejected") return "danger" as const;
  if (status === "pending") return "warning" as const;
  return "muted" as const;
}

function formatConflictType(conflictType: string) {
  if (conflictType === "missing_check_out") return "Ausstempeln fehlt";
  if (conflictType === "open_break") return "Pause nicht beendet";
  if (conflictType === "duplicate_check_in") return "Doppeltes Einstempeln";
  if (conflictType === "orphan_check_out") {
    return "Ausstempeln ohne Einstempeln";
  }
  if (conflictType === "orphan_break_start") {
    return "Pause ohne aktive Arbeitszeit";
  }
  if (conflictType === "orphan_break_end") {
    return "Pausenende ohne Pausenbeginn";
  }
  if (conflictType === "invalid_sequence") return "Ungültige Stempelfolge";
  return conflictType;
}

function formatComplianceType(warningType: string) {
  if (warningType === "daily_net_over_10h") {
    return "Arbeitszeit über 10 Stunden";
  }

  if (warningType === "rest_period_under_11h") {
    return "Ruhezeit unter 11 Stunden";
  }

  if (warningType === "insufficient_break") {
    return "Pausenzeit unterschritten";
  }

  if (warningType === "continuous_work_over_6h") {
    return "Mehr als 6 Stunden ohne ausreichende Pause";
  }

  return warningType;
}

function formatComplianceStatus(status: string) {
  if (status === "acknowledged") return "Geprüft";
  if (status === "resolved") return "Behoben";
  if (status === "open") return "Offen";
  return status;
}

function formatMinutes(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  const totalMinutes = Math.max(0, Math.round(value));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} Min.`;
  if (minutes === 0) return `${hours} Std.`;

  return `${hours} Std. ${minutes} Min.`;
}

export default function CorrectionsPage() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<"open" | "history">("open");

  const currentDate = useMemo(() => new Date(), []);
  const [historyYear, setHistoryYear] = useState(currentDate.getFullYear());
  const [historyMonth, setHistoryMonth] = useState(currentDate.getMonth() + 1);
  const [historyEmployeeId, setHistoryEmployeeId] = useState("all");
  const [historyEmployees, setHistoryEmployees] = useState<EmployeeOption[]>([]);

  const [openRequests, setOpenRequests] = useState<CorrectionRequest[]>([]);
  const [openConflicts, setOpenConflicts] = useState<TimeConflict[]>([]);
  const [openComplianceWarnings, setOpenComplianceWarnings] = useState<
    ComplianceWarning[]
  >([]);

  const [historyRequests, setHistoryRequests] = useState<CorrectionRequest[]>(
    []
  );
  const [historyConflicts, setHistoryConflicts] = useState<TimeConflict[]>([]);
  const [historyComplianceWarnings, setHistoryComplianceWarnings] = useState<
    ComplianceWarning[]
  >([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [requestHistoryPage, setRequestHistoryPage] = useState(0);
  const [conflictHistoryPage, setConflictHistoryPage] = useState(0);
  const [complianceHistoryPage, setComplianceHistoryPage] = useState(0);
  const [requestHistoryHasMore, setRequestHistoryHasMore] = useState(false);
  const [conflictHistoryHasMore, setConflictHistoryHasMore] = useState(false);
  const [complianceHistoryHasMore, setComplianceHistoryHasMore] =
    useState(false);

  const [selectedConflict, setSelectedConflict] = useState<TimeConflict | null>(
    null
  );
  const [checkoutDate, setCheckoutDate] = useState("");
  const [checkoutTime, setCheckoutTime] = useState("");
  const [resolutionReason, setResolutionReason] = useState("");
  const [isResolvingConflict, setIsResolvingConflict] = useState(false);

  const [selectedComplianceWarning, setSelectedComplianceWarning] =
    useState<ComplianceWarning | null>(null);
  const [acknowledgementNote, setAcknowledgementNote] = useState("");
  const [isAcknowledgingWarning, setIsAcknowledgingWarning] = useState(false);

  const totalOpen =
    openRequests.length +
    openConflicts.length +
    openComplianceWarnings.length;

  const historyYearOptions = useMemo(() => {
    const currentYear = currentDate.getFullYear();
    const years: number[] = [];

    for (let year = currentYear; year >= currentYear - 10; year -= 1) {
      years.push(year);
    }

    return years;
  }, [currentDate]);

  async function loadHistoryEmployees() {
    const businessId = await getBusinessId();
    if (!businessId) return;

    const { data, error } = await supabase
      .from("employees")
      .select("id, name")
      .eq("business_id", businessId)
      .order("name", { ascending: true });

    if (error) {
      console.error("LOAD HISTORY EMPLOYEES ERROR:", error);
      showToast({
        type: "error",
        title: "Mitarbeiterfilter konnte nicht geladen werden",
        description: error.message,
      });
      return;
    }

    setHistoryEmployees((data || []) as EmployeeOption[]);
  }

  async function loadOpenData() {
    setLoading(true);

    try {
      const businessId = await getBusinessId();

      if (!businessId) {
        showToast({
          type: "error",
          title: "Betrieb nicht gefunden",
          description: "Korrekturen konnten nicht geladen werden.",
        });
        return;
      }

      const [
        requestsResult,
        conflictsResult,
        complianceResult,
        employeesResult,
      ] = await Promise.all([
        supabase
          .from("time_correction_requests")
          .select("*")
          .eq("business_id", businessId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),

        supabase
          .from("admin_time_conflicts")
          .select("*")
          .eq("business_id", businessId)
          .eq("status", "open")
          .order("detected_at", { ascending: false }),

        supabase
          .from("time_compliance_warnings")
          .select("*")
          .eq("business_id", businessId)
          .eq("status", "open")
          .order("warning_date", { ascending: false })
          .order("created_at", { ascending: false }),

        supabase
          .from("employees")
          .select("id, name")
          .eq("business_id", businessId),
      ]);

      if (requestsResult.error) {
        console.error(
          "LOAD OPEN CORRECTION REQUESTS ERROR:",
          requestsResult.error
        );
        showToast({
          type: "error",
          title: "Korrekturanträge konnten nicht geladen werden",
          description: requestsResult.error.message,
        });
      } else {
        setOpenRequests((requestsResult.data || []) as CorrectionRequest[]);
      }

      if (conflictsResult.error) {
        console.error("LOAD OPEN TIME CONFLICTS ERROR:", conflictsResult.error);
        showToast({
          type: "error",
          title: "Zeitkonflikte konnten nicht geladen werden",
          description: conflictsResult.error.message,
        });
      } else {
        setOpenConflicts((conflictsResult.data || []) as TimeConflict[]);
      }

      if (complianceResult.error) {
        console.error(
          "LOAD OPEN COMPLIANCE WARNINGS ERROR:",
          complianceResult.error
        );
        showToast({
          type: "error",
          title: "Arbeitszeit-Warnungen konnten nicht geladen werden",
          description: complianceResult.error.message,
        });
      } else if (employeesResult.error) {
        console.error(
          "LOAD COMPLIANCE EMPLOYEE NAMES ERROR:",
          employeesResult.error
        );
        showToast({
          type: "error",
          title: "Mitarbeiternamen konnten nicht geladen werden",
          description: employeesResult.error.message,
        });

        setOpenComplianceWarnings(
          ((complianceResult.data || []) as Omit<
            ComplianceWarning,
            "employee_name"
          >[]).map((warning) => ({
            ...warning,
            employee_name: "Unbekannter Mitarbeiter",
          }))
        );
      } else {
        const employeeNames = new Map(
          ((employeesResult.data || []) as EmployeeOption[]).map((employee) => [
            employee.id,
            employee.name,
          ])
        );

        setOpenComplianceWarnings(
          ((complianceResult.data || []) as Omit<
            ComplianceWarning,
            "employee_name"
          >[]).map((warning) => ({
            ...warning,
            employee_name:
              employeeNames.get(warning.employee_id) ||
              "Unbekannter Mitarbeiter",
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadRequestHistory(page = 0) {
    const businessId = await getBusinessId();
    if (!businessId) return;

    const { fromDate, toDateExclusive } = getMonthRange(
      historyYear,
      historyMonth
    );

    const from = page * HISTORY_PAGE_SIZE;
    const to = from + HISTORY_PAGE_SIZE;

    let query = supabase
      .from("time_correction_requests")
      .select("*")
      .eq("business_id", businessId)
      .in("status", ["approved", "rejected"])
      .gte("correction_date", fromDate)
      .lt("correction_date", toDateExclusive);

    if (historyEmployeeId !== "all") {
      query = query.eq("employee_id", historyEmployeeId);
    }

    const { data, error } = await query
      .order("correction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("LOAD CORRECTION HISTORY ERROR:", error);
      showToast({
        type: "error",
        title: "Antragshistorie konnte nicht geladen werden",
        description: error.message,
      });
      return;
    }

    const rows = (data || []) as CorrectionRequest[];
    setHistoryRequests(rows.slice(0, HISTORY_PAGE_SIZE));
    setRequestHistoryHasMore(rows.length > HISTORY_PAGE_SIZE);
    setRequestHistoryPage(page);
  }

  async function loadConflictHistory(page = 0) {
    const businessId = await getBusinessId();
    if (!businessId) return;

    const { fromDate, toDateExclusive } = getMonthRange(
      historyYear,
      historyMonth
    );

    const from = page * HISTORY_PAGE_SIZE;
    const to = from + HISTORY_PAGE_SIZE;

    let query = supabase
      .from("admin_time_conflicts")
      .select("*")
      .eq("business_id", businessId)
      .in("status", ["resolved", "ignored"])
      .gte("conflict_date", fromDate)
      .lt("conflict_date", toDateExclusive);

    if (historyEmployeeId !== "all") {
      query = query.eq("employee_id", historyEmployeeId);
    }

    const { data, error } = await query
      .order("conflict_date", { ascending: false })
      .order("resolved_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("LOAD TIME CONFLICT HISTORY ERROR:", error);
      showToast({
        type: "error",
        title: "Konflikthistorie konnte nicht geladen werden",
        description: error.message,
      });
      return;
    }

    const rows = (data || []) as TimeConflict[];
    setHistoryConflicts(rows.slice(0, HISTORY_PAGE_SIZE));
    setConflictHistoryHasMore(rows.length > HISTORY_PAGE_SIZE);
    setConflictHistoryPage(page);
  }

  async function loadComplianceHistory(page = 0) {
    const businessId = await getBusinessId();
    if (!businessId) return;

    const { fromDate, toDateExclusive } = getMonthRange(
      historyYear,
      historyMonth
    );

    const from = page * HISTORY_PAGE_SIZE;
    const to = from + HISTORY_PAGE_SIZE;

    let warningsQuery = supabase
      .from("time_compliance_warnings")
      .select("*")
      .eq("business_id", businessId)
      .in("status", ["acknowledged", "resolved"])
      .gte("warning_date", fromDate)
      .lt("warning_date", toDateExclusive);

    if (historyEmployeeId !== "all") {
      warningsQuery = warningsQuery.eq("employee_id", historyEmployeeId);
    }

    const [warningsResult, employeesResult] = await Promise.all([
      warningsQuery
        .order("warning_date", { ascending: false })
        .order("updated_at", { ascending: false })
        .range(from, to),

      supabase
        .from("employees")
        .select("id, name")
        .eq("business_id", businessId),
    ]);

    if (warningsResult.error) {
      console.error(
        "LOAD COMPLIANCE HISTORY ERROR:",
        warningsResult.error
      );
      showToast({
        type: "error",
        title: "Warnungshistorie konnte nicht geladen werden",
        description: warningsResult.error.message,
      });
      return;
    }

    const employeeNames = new Map(
      ((employeesResult.data || []) as EmployeeOption[]).map((employee) => [
        employee.id,
        employee.name,
      ])
    );

    const rows = ((warningsResult.data || []) as Omit<
      ComplianceWarning,
      "employee_name"
    >[]).map((warning) => ({
      ...warning,
      employee_name:
        employeeNames.get(warning.employee_id) || "Unbekannter Mitarbeiter",
    }));

    setHistoryComplianceWarnings(rows.slice(0, HISTORY_PAGE_SIZE));
    setComplianceHistoryHasMore(rows.length > HISTORY_PAGE_SIZE);
    setComplianceHistoryPage(page);
  }

  async function loadHistory(
    pageRequests = 0,
    pageConflicts = 0,
    pageCompliance = 0
  ) {
    setHistoryLoading(true);

    try {
      await Promise.all([
        loadRequestHistory(pageRequests),
        loadConflictHistory(pageConflicts),
        loadComplianceHistory(pageCompliance),
      ]);
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadOpenData();
    loadHistoryEmployees();
  }, []);

  useEffect(() => {
    if (activeView !== "history") return;

    loadHistory(0, 0, 0);
  }, [historyYear, historyMonth, historyEmployeeId]);

  function openConflictCorrection(conflict: TimeConflict) {
    setSelectedConflict(conflict);
    setCheckoutDate(conflict.conflict_date);
    setCheckoutTime("");
    setResolutionReason("");
  }

  function closeConflictCorrection() {
    if (isResolvingConflict) return;

    setSelectedConflict(null);
    setCheckoutDate("");
    setCheckoutTime("");
    setResolutionReason("");
  }

  async function handleResolveConflict() {
    if (!selectedConflict || isResolvingConflict) return;

    if (!checkoutDate || !checkoutTime) {
      showToast({
        type: "warning",
        title: "Endzeit fehlt",
        description:
          "Bitte gib Datum und Uhrzeit des tatsächlichen Arbeitsendes an.",
      });
      return;
    }

    if (!resolutionReason.trim()) {
      showToast({
        type: "warning",
        title: "Begründung fehlt",
        description:
          "Bitte dokumentiere kurz, warum die Zeit korrigiert wird.",
      });
      return;
    }

    setIsResolvingConflict(true);

    try {
      const checkoutLocal = `${checkoutDate}T${checkoutTime}:00`;

      const { error } = await supabase.rpc(
        "resolve_missing_checkout_conflict",
        {
          p_conflict_id: selectedConflict.conflict_id,
          p_checkout_local: checkoutLocal,
          p_reason: resolutionReason.trim(),
        }
      );

      if (error) {
        console.error("RESOLVE TIME CONFLICT ERROR:", error);

        showToast({
          type: "error",
          title: "Konflikt konnte nicht korrigiert werden",
          description: error.message,
        });

        return;
      }

      await loadOpenData();

      window.dispatchEvent(new Event("timeConflictsChanged"));
      window.dispatchEvent(new Event("correctionRequestsChanged"));

      showToast({
        type: "success",
        title: "Arbeitszeit korrigiert",
        description: `Der fehlende Checkout von ${selectedConflict.employee_name} wurde ergänzt.`,
      });

      setSelectedConflict(null);
      setCheckoutDate("");
      setCheckoutTime("");
      setResolutionReason("");
    } finally {
      setIsResolvingConflict(false);
    }
  }

  function openComplianceAcknowledgement(warning: ComplianceWarning) {
    setSelectedComplianceWarning(warning);
    setAcknowledgementNote("");
  }

  function closeComplianceAcknowledgement() {
    if (isAcknowledgingWarning) return;

    setSelectedComplianceWarning(null);
    setAcknowledgementNote("");
  }

  async function handleAcknowledgeComplianceWarning() {
    if (!selectedComplianceWarning || isAcknowledgingWarning) return;

    setIsAcknowledgingWarning(true);

    try {
      const { error } = await supabase.rpc(
        "acknowledge_compliance_warning",
        {
          p_warning_id: selectedComplianceWarning.id,
          p_note: acknowledgementNote.trim() || null,
        }
      );

      if (error) {
        console.error("ACKNOWLEDGE COMPLIANCE WARNING ERROR:", error);

        showToast({
          type: "error",
          title: "Warnung konnte nicht als geprüft markiert werden",
          description: error.message,
        });

        return;
      }

      await loadOpenData();

      showToast({
        type: "success",
        title: "Warnung als geprüft markiert",
        description: `${selectedComplianceWarning.employee_name}: ${formatComplianceType(
          selectedComplianceWarning.warning_type
        )}.`,
      });

      setSelectedComplianceWarning(null);
      setAcknowledgementNote("");
    } finally {
      setIsAcknowledgingWarning(false);
    }
  }

  async function notifyEmployee(
    request: CorrectionRequest,
    title: string,
    message: string
  ) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("employee_id", request.employee_id)
      .maybeSingle();

    if (error) {
      console.error("PROFILE LOOKUP ERROR:", error);
      return;
    }

    if (!profile?.id) return;

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert([
        {
          business_id: request.business_id,
          user_id: profile.id,
          employee_id: request.employee_id,
          title,
          message,
          type: "time_correction",
          is_read: false,
        },
      ]);

    if (notificationError) {
      console.error("NOTIFICATION ERROR:", notificationError);
    }
  }

  async function handleRejectRequest(request: CorrectionRequest) {
    if (actionLoadingId) return;

    setActionLoadingId(request.id);

    try {
      const { error } = await supabase.rpc(
        "reject_time_correction_request",
        {
          p_request_id: request.id,
        }
      );

      if (error) {
        console.error("REJECT CORRECTION REQUEST ERROR:", error);

        showToast({
          type: "error",
          title: "Antrag konnte nicht abgelehnt werden",
          description: error.message,
        });

        return;
      }

      await notifyEmployee(
        request,
        "Korrekturantrag abgelehnt",
        `Dein Korrekturantrag für den ${formatDate(
          request.correction_date
        )} wurde abgelehnt.`
      );

      await loadOpenData();
      window.dispatchEvent(new Event("correctionRequestsChanged"));

      showToast({
        type: "success",
        title: "Antrag abgelehnt",
        description: `Der Antrag von ${request.employee_name} wurde abgelehnt.`,
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleApproveRequest(request: CorrectionRequest) {
    if (actionLoadingId) return;

    setActionLoadingId(request.id);

    try {
      const { error } = await supabase.rpc(
        "approve_time_correction_request",
        {
          p_request_id: request.id,
        }
      );

      if (error) {
        console.error("APPROVE CORRECTION REQUEST ERROR:", error);

        showToast({
          type: "error",
          title: "Antrag konnte nicht genehmigt werden",
          description: error.message,
        });

        return;
      }

      await notifyEmployee(
        request,
        "Korrekturantrag genehmigt",
        `Dein Korrekturantrag für den ${formatDate(
          request.correction_date
        )} wurde genehmigt.`
      );

      await loadOpenData();
      window.dispatchEvent(new Event("correctionRequestsChanged"));

      showToast({
        type: "success",
        title: "Antrag genehmigt",
        description: `Die Arbeitszeit von ${request.employee_name} wurde erstellt.`,
      });
    } finally {
      setActionLoadingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Korrekturen"
          description="Prüfe offene Zeitprobleme und Korrekturanträge."
        />

        <StatsSkeleton />

        <Section
          title="Offene Vorgänge"
          description="Aktuell zu prüfende Korrekturen."
        >
          <TableSkeleton rows={5} columns={5} />
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Korrekturen"
        description="Prüfe offene Zeitprobleme und greife bei Bedarf auf die paginierte Historie zu."
      />

      <div className="rounded-3xl border border-[#DCE5F2] bg-white p-2 shadow-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="tablist" aria-label="Korrekturansicht">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "open"}
            onClick={() => setActiveView("open")}
            className={[
              "rounded-2xl border px-5 py-4 text-left transition-all duration-200",
              activeView === "open"
                ? "border-[#2563EB] bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.20)]"
                : "border-transparent bg-[#F8FAFC] text-[#0F172A] hover:border-[#BFDBFE] hover:bg-[#EFF6FF]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-semibold">Offene Vorgänge</span>
              <span className={[
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                activeView === "open"
                  ? "bg-white/20 text-white"
                  : totalOpen > 0
                    ? "bg-[#FEF3C7] text-[#B45309]"
                    : "bg-[#E2E8F0] text-[#64748B]",
              ].join(" ")}>
                {totalOpen}
              </span>
            </div>
            <p className={["mt-1 text-sm", activeView === "open" ? "text-white/80" : "text-[#64748B]"].join(" ")}>
              Konflikte, Warnungen und Anträge, die noch geprüft werden müssen.
            </p>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeView === "history"}
            onClick={() => {
              setActiveView("history");
              loadHistory(0, 0, 0);
            }}
            className={[
              "rounded-2xl border px-5 py-4 text-left transition-all duration-200",
              activeView === "history"
                ? "border-[#2563EB] bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.20)]"
                : "border-transparent bg-[#F8FAFC] text-[#0F172A] hover:border-[#BFDBFE] hover:bg-[#EFF6FF]",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-semibold">Erledigt & Historie</span>
              <span className={[
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                activeView === "history"
                  ? "bg-white/20 text-white"
                  : "bg-[#DBEAFE] text-[#1D4ED8]",
              ].join(" ")}>
                Archiv
              </span>
            </div>
            <p className={["mt-1 text-sm", activeView === "history" ? "text-white/80" : "text-[#64748B]"].join(" ")}>
              Geprüfte Warnungen sowie erledigte Korrekturen und Anträge.
            </p>
          </button>
        </div>
      </div>

      {activeView === "open" && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Systemkonflikte"
              value={openConflicts.length}
              badge="Prüfen"
              badgeVariant={openConflicts.length > 0 ? "warning" : "muted"}
            />

            <StatCard
              title="Arbeitszeit-Warnungen"
              value={openComplianceWarnings.length}
              badge="Prüfen"
              badgeVariant={
                openComplianceWarnings.length > 0 ? "warning" : "muted"
              }
            />

            <StatCard
              title="Mitarbeiteranträge"
              value={openRequests.length}
              badge="Offen"
              badgeVariant={openRequests.length > 0 ? "warning" : "muted"}
            />

            <StatCard
              title="Gesamt offen"
              value={totalOpen}
              badge="Aufgaben"
              badgeVariant={totalOpen > 0 ? "warning" : "success"}
            />
          </div>

          <Section
            title="Systemkonflikte"
            description="Automatisch erkannte Probleme bei der Zeiterfassung."
            action={
              <Badge
                variant={openConflicts.length > 0 ? "warning" : "muted"}
                dot
              >
                {openConflicts.length} offen
              </Badge>
            }
          >
            {openConflicts.length === 0 ? (
              <EmptyState
                title="Keine offenen Systemkonflikte"
                description="Aktuell wurden keine ungelösten Probleme bei der Zeiterfassung erkannt."
                compact
              />
            ) : (
              <div className="space-y-4">
                {openConflicts.map((conflict) => (
                  <div
                    key={conflict.conflict_id}
                    className="rounded-3xl border border-[#FDE68A] bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-semibold text-[#0F172A]">
                            {conflict.employee_name}
                          </h2>
                          <Badge variant="warning" dot>
                            Prüfung erforderlich
                          </Badge>
                        </div>

                        <p className="mt-1 text-sm font-medium text-[#B45309]">
                          {formatConflictType(conflict.conflict_type)}
                        </p>
                      </div>

                      {conflict.conflict_type === "missing_check_out" && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => openConflictCorrection(conflict)}
                        >
                          Korrigieren
                        </Button>
                      )}
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-[#F8FAFC] p-4">
                        <p className="text-xs font-medium text-[#64748B]">
                          Arbeitstag
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                          {formatDate(
                            `${conflict.conflict_date}T12:00:00`
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#F8FAFC] p-4">
                        <p className="text-xs font-medium text-[#64748B]">
                          Eingestempelt
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                          {formatLocalDateTime(conflict.check_in_local)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#F8FAFC] p-4">
                        <p className="text-xs font-medium text-[#64748B]">
                          Konflikt erkannt
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                          {formatLocalDateTime(conflict.detected_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Arbeitszeit-Warnungen"
            description="Arbeitszeitrechtlich auffällige, technisch vollständige Zeitdaten. Diese Hinweise sind keine Stempelfehler."
            action={
              <Badge
                variant={
                  openComplianceWarnings.length > 0 ? "warning" : "muted"
                }
                dot
              >
                {openComplianceWarnings.length} offen
              </Badge>
            }
          >
            {openComplianceWarnings.length === 0 ? (
              <EmptyState
                title="Keine offenen Arbeitszeit-Warnungen"
                description="Aktuell wurden keine offenen Überschreitungen der täglichen Arbeitszeit oder zu kurzen Ruhezeiten erkannt."
                compact
              />
            ) : (
              <div className="space-y-4">
                {openComplianceWarnings.map((warning) => {
                  const details = warning.details || {};
                  const isDailyLimit =
                    warning.warning_type === "daily_net_over_10h";
                  const isRestPeriod =
                    warning.warning_type === "rest_period_under_11h";
                  const isInsufficientBreak =
                    warning.warning_type === "insufficient_break";
                  const isContinuousWork =
                    warning.warning_type === "continuous_work_over_6h";

                  return (
                    <div
                      key={warning.id}
                      className="rounded-3xl border border-[#FDE68A] bg-white p-5 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-xl font-semibold text-[#0F172A]">
                              {warning.employee_name}
                            </h2>

                            <Badge variant="warning" dot>
                              Prüfung erforderlich
                            </Badge>
                          </div>

                          <p className="mt-1 text-sm font-medium text-[#B45309]">
                            {formatComplianceType(warning.warning_type)}
                          </p>
                        </div>

                        <div className="flex flex-col items-start gap-3 xl:items-end">
                          <p className="text-sm text-[#64748B]">
                            Erkannt am {formatDate(warning.created_at)}
                          </p>

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              openComplianceAcknowledgement(warning)
                            }
                          >
                            Als geprüft markieren
                          </Button>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="rounded-2xl bg-[#F8FAFC] p-4">
                          <p className="text-xs font-medium text-[#64748B]">
                            Arbeitstag
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                            {formatDate(
                              `${warning.warning_date}T12:00:00`
                            )}
                          </p>
                        </div>

                        {isDailyLimit && (
                          <>
                            <div className="rounded-2xl bg-[#F8FAFC] p-4">
                              <p className="text-xs font-medium text-[#64748B]">
                                Nettoarbeitszeit
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                {formatMinutes(details.net_minutes)}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-[#F8FAFC] p-4">
                              <p className="text-xs font-medium text-[#64748B]">
                                Über 10 Stunden
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#B45309]">
                                {formatMinutes(details.excess_minutes)}
                              </p>
                            </div>
                          </>
                        )}

                        {isRestPeriod && (
                          <>
                            <div className="rounded-2xl bg-[#F8FAFC] p-4">
                              <p className="text-xs font-medium text-[#64748B]">
                                Tatsächliche Ruhezeit
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                {formatMinutes(details.rest_minutes)}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-[#F8FAFC] p-4">
                              <p className="text-xs font-medium text-[#64748B]">
                                Fehlende Ruhezeit
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#B45309]">
                                {formatMinutes(details.missing_minutes)}
                              </p>
                            </div>
                          </>
                        )}

                        {isInsufficientBreak && (
                          <>
                            <div className="rounded-2xl bg-[#F8FAFC] p-4">
                              <p className="text-xs font-medium text-[#64748B]">
                                Erfasste Pause
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                {formatMinutes(details.break_minutes)}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-[#F8FAFC] p-4">
                              <p className="text-xs font-medium text-[#64748B]">
                                Fehlende Pausenzeit
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#B45309]">
                                {formatMinutes(details.missing_break_minutes)}
                              </p>
                            </div>
                          </>
                        )}

                        {isContinuousWork && (
                          <>
                            <div className="rounded-2xl bg-[#F8FAFC] p-4">
                              <p className="text-xs font-medium text-[#64748B]">
                                Längste Arbeitsphase
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                {formatMinutes(details.max_continuous_minutes)}
                              </p>
                            </div>

                            <div className="rounded-2xl bg-[#F8FAFC] p-4">
                              <p className="text-xs font-medium text-[#64748B]">
                                Über 6 Stunden
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#B45309]">
                                {formatMinutes(details.excess_minutes)}
                              </p>
                            </div>
                          </>
                        )}

                        {!isDailyLimit &&
                          !isRestPeriod &&
                          !isInsufficientBreak &&
                          !isContinuousWork && (
                          <div className="rounded-2xl bg-[#F8FAFC] p-4 md:col-span-2">
                            <p className="text-xs font-medium text-[#64748B]">
                              Hinweis
                            </p>
                            <p className="mt-1 text-sm leading-6 text-[#0F172A]">
                              Für diesen Warnungstyp ist noch keine spezielle
                              Detaildarstellung hinterlegt.
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 rounded-2xl bg-[#FFFBEB] p-4">
                        <p className="text-xs font-medium text-[#92400E]">
                          Einordnung
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#78350F]">
                          {isDailyLimit
                            ? "Die erfasste Nettoarbeitszeit liegt über 10 Stunden. Prüfe den Arbeitstag und die zugrunde liegenden Zeitdaten."
                            : isRestPeriod
                              ? "Zwischen zwei abgeschlossenen Arbeitseinsätzen wurden weniger als 11 Stunden Ruhezeit ermittelt."
                              : isInsufficientBreak
                                ? "Die erfasste Gesamtpausenzeit liegt unter der für diesen Arbeitstag erforderlichen Pausenzeit."
                                : isContinuousWork
                                  ? "Es wurde eine ununterbrochene Arbeitsphase von mehr als 6 Stunden ohne qualifizierende Pause erkannt."
                                  : "Die Arbeitszeitdaten wurden als compliance-relevant markiert und sollten geprüft werden."}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          <Section
            title="Mitarbeiteranträge"
            description="Offene Korrekturanträge von Mitarbeitern."
            action={
              <Badge variant={openRequests.length > 0 ? "warning" : "muted"}>
                {openRequests.length} offen
              </Badge>
            }
          >
            {openRequests.length === 0 ? (
              <EmptyState
                title="Keine offenen Korrekturanträge"
                description="Aktuell wartet kein Mitarbeiterantrag auf Prüfung."
                compact
              />
            ) : (
              <div className="space-y-4">
                {openRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-semibold text-[#0F172A]">
                            {request.employee_name}
                          </h2>
                          <Badge variant="warning" dot>
                            Offen
                          </Badge>
                        </div>

                        <p className="mt-1 text-sm text-[#64748B]">
                          Antrag vom {formatDate(request.created_at)}
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          loading={actionLoadingId === request.id}
                          onClick={() => handleApproveRequest(request)}
                        >
                          Genehmigen
                        </Button>

                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={actionLoadingId === request.id}
                          onClick={() => handleRejectRequest(request)}
                        >
                          Ablehnen
                        </Button>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-[#F8FAFC] p-4">
                        <p className="text-xs font-medium text-[#64748B]">
                          Datum
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                          {formatDate(request.correction_date)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#F8FAFC] p-4">
                        <p className="text-xs font-medium text-[#64748B]">
                          Arbeitsbeginn
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                          {formatTime(request.requested_start_time)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#F8FAFC] p-4">
                        <p className="text-xs font-medium text-[#64748B]">
                          Arbeitsende
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                          {formatTime(request.requested_end_time)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-[#F8FAFC] p-4">
                      <p className="text-xs font-medium text-[#64748B]">
                        Begründung
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[#0F172A]">
                        {request.reason || "Keine Begründung angegeben."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {activeView === "history" && (
        <>
          <div className="rounded-3xl border border-[#BFDBFE] bg-[#EFF6FF] px-6 py-5">
            <h2 className="text-xl font-semibold text-[#0F172A]">Erledigt & Historie</h2>
            <p className="mt-1 text-sm leading-6 text-[#475569]">
              Hier findest du geprüfte Arbeitszeit-Warnungen, erledigte Systemkorrekturen und bearbeitete Mitarbeiteranträge.
            </p>
          </div>
          <Section
            title="Historienfilter"
            description="Die Historie wird serverseitig nach Monat gefiltert und anschließend paginiert."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:max-w-4xl">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#334155]">
                  Monat
                </label>

                <select
                  value={historyMonth}
                  onChange={(event) => {
                    setHistoryMonth(Number(event.target.value));
                    setRequestHistoryPage(0);
                    setConflictHistoryPage(0);
                    setComplianceHistoryPage(0);
                  }}
                  className="w-full rounded-2xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                >
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#334155]">
                  Jahr
                </label>

                <select
                  value={historyYear}
                  onChange={(event) => {
                    setHistoryYear(Number(event.target.value));
                    setRequestHistoryPage(0);
                    setConflictHistoryPage(0);
                    setComplianceHistoryPage(0);
                  }}
                  className="w-full rounded-2xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                >
                  {historyYearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#334155]">
                  Mitarbeiter
                </label>

                <select
                  value={historyEmployeeId}
                  onChange={(event) => {
                    setHistoryEmployeeId(event.target.value);
                    setRequestHistoryPage(0);
                    setConflictHistoryPage(0);
                    setComplianceHistoryPage(0);
                  }}
                  className="w-full rounded-2xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                >
                  <option value="all">Alle Mitarbeiter</option>
                  {historyEmployees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-4 text-sm text-[#64748B]">
              Angezeigt wird {monthOptions.find((month) => month.value === historyMonth)?.label}{" "}
              {historyYear}
              {historyEmployeeId !== "all"
                ? ` für ${
                    historyEmployees.find(
                      (employee) => employee.id === historyEmployeeId
                    )?.name || "den ausgewählten Mitarbeiter"
                  }`
                : ""}. Pro Bereich werden maximal {HISTORY_PAGE_SIZE} Einträge pro Seite geladen.
            </p>
          </Section>

          <Section
            title="Systemkorrekturen"
            description={`Maximal ${HISTORY_PAGE_SIZE} Einträge pro Seite. Details werden erst beim Öffnen angezeigt.`}
            action={
              <Badge variant="muted">
                Seite {conflictHistoryPage + 1}
              </Badge>
            }
          >
            {historyLoading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : historyConflicts.length === 0 ? (
              <EmptyState
                title="Keine Systemkorrekturen auf dieser Seite"
                description="Für den gewählten Monat wurden keine erledigten oder ignorierten Konflikte gefunden."
                compact
              />
            ) : (
              <>
                <div className="space-y-3">
                  {historyConflicts.map((conflict) => (
                    <details
                      key={conflict.conflict_id}
                      className="rounded-2xl border border-[#E2E8F0] bg-white"
                    >
                      <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[#0F172A]">
                              {conflict.employee_name}
                            </span>
                            <Badge
                              variant={
                                conflict.status === "resolved"
                                  ? "success"
                                  : "muted"
                              }
                              dot
                            >
                              {conflict.status === "resolved"
                                ? "Erledigt"
                                : "Ignoriert"}
                            </Badge>
                          </div>

                          <p className="mt-1 text-sm text-[#64748B]">
                            {formatDate(
                              `${conflict.conflict_date}T12:00:00`
                            )}{" "}
                            · {formatConflictType(conflict.conflict_type)}
                          </p>
                        </div>

                        <span className="text-sm font-medium text-[#2563EB]">
                          Details öffnen
                        </span>
                      </summary>

                      <div className="border-t border-[#E2E8F0] p-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl bg-[#F8FAFC] p-4">
                            <p className="text-xs font-medium text-[#64748B]">
                              Eingestempelt
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                              {formatLocalDateTime(conflict.check_in_local)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-[#F8FAFC] p-4">
                            <p className="text-xs font-medium text-[#64748B]">
                              Korrigiertes Arbeitsende
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                              {formatLocalDateTime(
                                conflict.corrected_checkout_local
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-[#F8FAFC] p-4">
                            <p className="text-xs font-medium text-[#64748B]">
                              Erledigt am
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                              {formatLocalDateTime(conflict.resolved_at)}
                            </p>
                          </div>

                          <div className="rounded-2xl bg-[#F8FAFC] p-4">
                            <p className="text-xs font-medium text-[#64748B]">
                              Bearbeiter
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                              {conflict.resolved_by_role === "owner"
                                ? "Owner"
                                : conflict.resolved_by_role === "admin"
                                  ? "Admin"
                                  : conflict.resolved_by_role || "—"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl bg-[#F8FAFC] p-4">
                          <p className="text-xs font-medium text-[#64748B]">
                            Begründung
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[#0F172A]">
                            {conflict.resolution_reason ||
                              "Keine Begründung hinterlegt."}
                          </p>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#E2E8F0] pt-5">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={conflictHistoryPage === 0 || historyLoading}
                    onClick={async () => {
                      setHistoryLoading(true);
                      try {
                        await loadConflictHistory(
                          Math.max(0, conflictHistoryPage - 1)
                        );
                      } finally {
                        setHistoryLoading(false);
                      }
                    }}
                  >
                    Zurück
                  </Button>

                  <span className="text-sm text-[#64748B]">
                    Seite {conflictHistoryPage + 1}
                  </span>

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!conflictHistoryHasMore || historyLoading}
                    onClick={async () => {
                      setHistoryLoading(true);
                      try {
                        await loadConflictHistory(conflictHistoryPage + 1);
                      } finally {
                        setHistoryLoading(false);
                      }
                    }}
                  >
                    Weiter
                  </Button>
                </div>
              </>
            )}
          </Section>

          <Section
            title="Arbeitszeit-Warnungen"
            description={`Geprüfte und automatisch behobene Warnungen, maximal ${HISTORY_PAGE_SIZE} pro Seite.`}
            action={
              <Badge variant="muted">
                Seite {complianceHistoryPage + 1}
              </Badge>
            }
          >
            {historyLoading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : historyComplianceWarnings.length === 0 ? (
              <EmptyState
                title="Keine Arbeitszeit-Warnungen auf dieser Seite"
                description="Für den gewählten Monat wurden keine geprüften oder automatisch behobenen Warnungen gefunden."
                compact
              />
            ) : (
              <>
                <div className="space-y-3">
                  {historyComplianceWarnings.map((warning) => {
                    const details = warning.details || {};
                    const isAcknowledged =
                      warning.status === "acknowledged";
                    const isResolved = warning.status === "resolved";
                    const isDailyLimit =
                      warning.warning_type === "daily_net_over_10h";
                    const isRestPeriod =
                      warning.warning_type === "rest_period_under_11h";
                    const isInsufficientBreak =
                      warning.warning_type === "insufficient_break";
                    const isContinuousWork =
                      warning.warning_type === "continuous_work_over_6h";

                    return (
                      <details
                        key={warning.id}
                        className="rounded-2xl border border-[#E2E8F0] bg-white"
                      >
                        <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-[#0F172A]">
                                {warning.employee_name}
                              </span>

                              <Badge
                                variant={
                                  isResolved ? "success" : "muted"
                                }
                                dot
                              >
                                {formatComplianceStatus(warning.status)}
                              </Badge>
                            </div>

                            <p className="mt-1 text-sm text-[#64748B]">
                              {formatDate(
                                `${warning.warning_date}T12:00:00`
                              )}{" "}
                              · {formatComplianceType(warning.warning_type)}
                            </p>
                          </div>

                          <span className="text-sm font-medium text-[#2563EB]">
                            Details öffnen
                          </span>
                        </summary>

                        <div className="border-t border-[#E2E8F0] p-4">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-2xl bg-[#F8FAFC] p-4">
                              <p className="text-xs font-medium text-[#64748B]">
                                Arbeitstag
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                {formatDate(
                                  `${warning.warning_date}T12:00:00`
                                )}
                              </p>
                            </div>

                            {isDailyLimit && (
                              <>
                                <div className="rounded-2xl bg-[#F8FAFC] p-4">
                                  <p className="text-xs font-medium text-[#64748B]">
                                    Nettoarbeitszeit
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                    {formatMinutes(details.net_minutes)}
                                  </p>
                                </div>

                                <div className="rounded-2xl bg-[#F8FAFC] p-4">
                                  <p className="text-xs font-medium text-[#64748B]">
                                    Über 10 Stunden
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-[#B45309]">
                                    {formatMinutes(details.excess_minutes)}
                                  </p>
                                </div>
                              </>
                            )}

                            {isRestPeriod && (
                              <>
                                <div className="rounded-2xl bg-[#F8FAFC] p-4">
                                  <p className="text-xs font-medium text-[#64748B]">
                                    Tatsächliche Ruhezeit
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                    {formatMinutes(details.rest_minutes)}
                                  </p>
                                </div>

                                <div className="rounded-2xl bg-[#F8FAFC] p-4">
                                  <p className="text-xs font-medium text-[#64748B]">
                                    Fehlende Ruhezeit
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-[#B45309]">
                                    {formatMinutes(details.missing_minutes)}
                                  </p>
                                </div>
                              </>
                            )}

                            {isInsufficientBreak && (
                              <>
                                <div className="rounded-2xl bg-[#F8FAFC] p-4">
                                  <p className="text-xs font-medium text-[#64748B]">
                                    Erfasste Pause
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                    {formatMinutes(details.break_minutes)}
                                  </p>
                                </div>

                                <div className="rounded-2xl bg-[#F8FAFC] p-4">
                                  <p className="text-xs font-medium text-[#64748B]">
                                    Fehlende Pausenzeit
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-[#B45309]">
                                    {formatMinutes(details.missing_break_minutes)}
                                  </p>
                                </div>
                              </>
                            )}

                            {isContinuousWork && (
                              <>
                                <div className="rounded-2xl bg-[#F8FAFC] p-4">
                                  <p className="text-xs font-medium text-[#64748B]">
                                    Längste Arbeitsphase
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                    {formatMinutes(details.max_continuous_minutes)}
                                  </p>
                                </div>

                                <div className="rounded-2xl bg-[#F8FAFC] p-4">
                                  <p className="text-xs font-medium text-[#64748B]">
                                    Über 6 Stunden
                                  </p>
                                  <p className="mt-1 text-sm font-semibold text-[#B45309]">
                                    {formatMinutes(details.excess_minutes)}
                                  </p>
                                </div>
                              </>
                            )}

                            <div className="rounded-2xl bg-[#F8FAFC] p-4">
                              <p className="text-xs font-medium text-[#64748B]">
                                Statuszeitpunkt
                              </p>
                              <p className="mt-1 text-sm font-semibold text-[#0F172A]">
                                {formatLocalDateTime(
                                  isAcknowledged
                                    ? warning.acknowledged_at
                                    : warning.resolved_at
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 rounded-2xl bg-[#F8FAFC] p-4">
                            <p className="text-xs font-medium text-[#64748B]">
                              {isAcknowledged
                                ? "Bemerkung zur Prüfung"
                                : "Auflösungsgrund"}
                            </p>

                            <p className="mt-1 text-sm leading-6 text-[#0F172A]">
                              {isAcknowledged
                                ? warning.acknowledgement_note ||
                                  "Keine Bemerkung hinterlegt."
                                : warning.resolution_reason ||
                                  "Die Warnung wurde nach einer Änderung der zugrunde liegenden Zeitdaten automatisch behoben."}
                            </p>
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#E2E8F0] pt-5">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      complianceHistoryPage === 0 || historyLoading
                    }
                    onClick={async () => {
                      setHistoryLoading(true);
                      try {
                        await loadComplianceHistory(
                          Math.max(0, complianceHistoryPage - 1)
                        );
                      } finally {
                        setHistoryLoading(false);
                      }
                    }}
                  >
                    Zurück
                  </Button>

                  <span className="text-sm text-[#64748B]">
                    Seite {complianceHistoryPage + 1}
                  </span>

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      !complianceHistoryHasMore || historyLoading
                    }
                    onClick={async () => {
                      setHistoryLoading(true);
                      try {
                        await loadComplianceHistory(
                          complianceHistoryPage + 1
                        );
                      } finally {
                        setHistoryLoading(false);
                      }
                    }}
                  >
                    Weiter
                  </Button>
                </div>
              </>
            )}
          </Section>

          <Section
            title="Mitarbeiteranträge"
            description={`Genehmigte und abgelehnte Anträge, maximal ${HISTORY_PAGE_SIZE} pro Seite.`}
            action={
              <Badge variant="muted">
                Seite {requestHistoryPage + 1}
              </Badge>
            }
          >
            {historyLoading ? (
              <TableSkeleton rows={5} columns={5} />
            ) : historyRequests.length === 0 ? (
              <EmptyState
                title="Keine Anträge auf dieser Seite"
                description="Für den gewählten Monat wurden keine genehmigten oder abgelehnten Mitarbeiteranträge gefunden."
                compact
              />
            ) : (
              <>
                <div className="space-y-3">
                  {historyRequests.map((request) => (
                    <details
                      key={request.id}
                      className="rounded-2xl border border-[#E2E8F0] bg-white"
                    >
                      <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[#0F172A]">
                              {request.employee_name}
                            </span>
                            <Badge
                              variant={getStatusVariant(request.status)}
                              dot
                            >
                              {formatStatus(request.status)}
                            </Badge>
                          </div>

                          <p className="mt-1 text-sm text-[#64748B]">
                            {formatDate(request.correction_date)} ·{" "}
                            {formatTime(request.requested_start_time)} –{" "}
                            {formatTime(request.requested_end_time)}
                          </p>
                        </div>

                        <span className="text-sm font-medium text-[#2563EB]">
                          Details öffnen
                        </span>
                      </summary>

                      <div className="border-t border-[#E2E8F0] p-4">
                        <div className="rounded-2xl bg-[#F8FAFC] p-4">
                          <p className="text-xs font-medium text-[#64748B]">
                            Begründung
                          </p>
                          <p className="mt-1 text-sm leading-6 text-[#0F172A]">
                            {request.reason || "Keine Begründung angegeben."}
                          </p>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-[#E2E8F0] pt-5">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={requestHistoryPage === 0 || historyLoading}
                    onClick={async () => {
                      setHistoryLoading(true);
                      try {
                        await loadRequestHistory(
                          Math.max(0, requestHistoryPage - 1)
                        );
                      } finally {
                        setHistoryLoading(false);
                      }
                    }}
                  >
                    Zurück
                  </Button>

                  <span className="text-sm text-[#64748B]">
                    Seite {requestHistoryPage + 1}
                  </span>

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!requestHistoryHasMore || historyLoading}
                    onClick={async () => {
                      setHistoryLoading(true);
                      try {
                        await loadRequestHistory(requestHistoryPage + 1);
                      } finally {
                        setHistoryLoading(false);
                      }
                    }}
                  >
                    Weiter
                  </Button>
                </div>
              </>
            )}
          </Section>
        </>
      )}

      {selectedComplianceWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-xl rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compliance-acknowledgement-title"
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2
                  id="compliance-acknowledgement-title"
                  className="text-xl font-semibold text-[#0F172A]"
                >
                  Arbeitszeit-Warnung prüfen
                </h2>

                <Badge variant="warning" dot>
                  {selectedComplianceWarning.employee_name}
                </Badge>
              </div>

              <p className="text-sm leading-6 text-[#64748B]">
                {formatComplianceType(
                  selectedComplianceWarning.warning_type
                )}{" "}
                am{" "}
                <span className="font-medium text-[#0F172A]">
                  {formatDate(
                    `${selectedComplianceWarning.warning_date}T12:00:00`
                  )}
                </span>
              </p>

              <p className="text-sm leading-6 text-[#64748B]">
                Markiere die Warnung nur dann als geprüft, wenn die
                zugrunde liegenden Zeitdaten korrekt sind und unverändert
                bestehen bleiben sollen. Eine spätere Zeitkorrektur kann
                die Warnung weiterhin automatisch auflösen.
              </p>
            </div>

            <div className="mt-5 rounded-2xl bg-[#FFFBEB] p-4">
              <p className="text-xs font-medium text-[#92400E]">
                Hinweis
              </p>
              <p className="mt-1 text-sm leading-6 text-[#78350F]">
                Mit dieser Aktion wird die Warnung nicht als behoben
                markiert. Sie wird als geprüft dokumentiert und bleibt
                historisch nachvollziehbar.
              </p>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-medium text-[#334155]">
                Bemerkung{" "}
                <span className="font-normal text-[#94A3B8]">
                  (optional)
                </span>
              </label>

              <textarea
                value={acknowledgementNote}
                onChange={(event) =>
                  setAcknowledgementNote(event.target.value)
                }
                placeholder="z. B. Arbeitszeit geprüft; tatsächlicher Sondereinsatz."
                rows={4}
                className="w-full resize-none rounded-2xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={isAcknowledgingWarning}
                onClick={closeComplianceAcknowledgement}
              >
                Abbrechen
              </Button>

              <Button
                type="button"
                variant="primary"
                loading={isAcknowledgingWarning}
                onClick={handleAcknowledgeComplianceWarning}
              >
                Prüfung bestätigen
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0F172A]/40 p-4 backdrop-blur-sm">
          <div
            className="w-full max-w-xl rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="conflict-correction-title"
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2
                  id="conflict-correction-title"
                  className="text-xl font-semibold text-[#0F172A]"
                >
                  Fehlendes Ausstempeln korrigieren
                </h2>

                <Badge variant="warning" dot>
                  {selectedConflict.employee_name}
                </Badge>
              </div>

              <p className="text-sm leading-6 text-[#64748B]">
                Eingestempelt:{" "}
                <span className="font-medium text-[#0F172A]">
                  {formatLocalDateTime(selectedConflict.check_in_local)}
                </span>
              </p>

              <p className="text-sm leading-6 text-[#64748B]">
                Trage das tatsächliche Arbeitsende ein. Der bestehende Check-in
                bleibt unverändert.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Enddatum"
                type="date"
                value={checkoutDate}
                onChange={(event) => setCheckoutDate(event.target.value)}
              />

              <TimeInput
                label="Endzeit"
                value={checkoutTime}
                onChange={setCheckoutTime}
              />
            </div>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-[#334155]">
                Begründung
              </label>

              <textarea
                value={resolutionReason}
                onChange={(event) => setResolutionReason(event.target.value)}
                placeholder="z. B. Mitarbeiter hat das Ausstempeln nach Schichtende vergessen."
                rows={4}
                className="w-full resize-none rounded-2xl border border-[#CBD5E1] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                disabled={isResolvingConflict}
                onClick={closeConflictCorrection}
              >
                Abbrechen
              </Button>

              <Button
                type="button"
                variant="primary"
                loading={isResolvingConflict}
                onClick={handleResolveConflict}
              >
                Korrektur speichern
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

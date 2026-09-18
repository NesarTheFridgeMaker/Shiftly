"use client";

import { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

import PageHeader from "@/components/ui/PageHeader";
import PageActions from "@/components/ui/PageActions";
import Section from "@/components/ui/Section";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";

import { useToast } from "@/components/ui/ToastProvider";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import StatsSkeleton from "@/components/skeletons/StatsSkeleton";

type PayrollPeriodStatus = "open" | "closed";

type PayrollPeriod = {
  id: string;
  business_id: string;
  period_year: number;
  period_month: number;
  status: PayrollPeriodStatus;
  closed_at: string | null;
  closed_by: string | null;
  reopened_at: string | null;
  reopened_by: string | null;
  reopen_reason: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CloseValidationRow = {
  employee_id: string | null;
  employee_name: string | null;
  is_valid: boolean;
  error_code: string | null;
  error_message: string | null;
};

type PayrollSnapshot = {
  id: string;
  payroll_period_id: string;
  employee_id: string;
  target_minutes: number | null;
  worked_minutes: number | null;
  vacation_minutes: number | null;
  sick_minutes: number | null;
  other_absence_minutes: number | null;
  credited_minutes: number | null;
  paid_absence_minutes: number | null;
  accountable_minutes: number | null;
  raw_difference_minutes: number | null;
  balance_minutes: number | null;
  overtime_minutes: number | null;
  payout_overtime_minutes: number | null;
  carried_balance_minutes: number | null;
  wage_type: string | null;
  hourly_rate: number | null;
  monthly_salary: number | null;
  overtime_hourly_rate: number | null;
  surcharge_hourly_rate: number | null;
  eligible_for_surcharges: boolean | null;
  base_gross: number | null;
  hourly_allowance_gross: number | null;
  overtime_gross: number | null;
  night_surcharge_gross: number | null;
  sunday_surcharge_gross: number | null;
  holiday_surcharge_gross: number | null;
  other_surcharge_gross: number | null;
  total_surcharge_gross: number | null;
  estimated_gross: number | null;
  datev_personnel_number: string | null;
  cost_center: string | null;
  target_minutes_requires_review: boolean | null;
  target_minutes_override_reason: string | null;
  target_minutes_confirmed_at: string | null;
  target_minutes_confirmed_by: string | null;
  employee_name?: string | null;
  time_account_period?: string | null;
};

type PayrollAuditEntry = {
  id: string;
  payroll_period_id: string;
  action: string;
  actor_id: string | null;
  reason: string | null;
  previous_status: string | null;
  new_status: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type LedgerTransaction = {
  id: string;
  payroll_period_id: string | null;
  employee_id: string;
  transaction_date: string;
  transaction_type: string;
  minutes: number;
  source_type: string | null;
  source_id: string | null;
  note: string | null;
  created_at?: string | null;
  employee_name?: string | null;
};


type ExcelTimeEntry = {
  id: string;
  employee_id: string | null;
  employee_name: string;
  action: string;
  created_at: string;
  source: string | null;
  location_verified: boolean | null;
  location_check_status: string | null;
  location_exception_reason: string | null;
};

type ExcelAbsenceDetail = {
  snapshot_id: string;
  employee_id: string;
  absence_id: string;
  absence_type_name: string | null;
  absence_type_code: string | null;
  absence_category: string | null;
  request_status: string | null;
  local_date: string;
  evaluation_source: string | null;
  scheduled_minutes: number | null;
  calculated_minutes: number | null;
  override_minutes: number | null;
  credited_minutes: number | null;
  paid_minutes: number | null;
  affects_time_account: boolean | null;
  affects_payroll: boolean | null;
  override_reason: string | null;
};

type DatevPreflightRow = {
  is_valid: boolean;
  error_code: string | null;
  message: string | null;
  employee_id: string | null;
  source_id: string | null;
};

type DatevPreflightResponse = {
  ok: boolean;
  error?: string;
  payrollSystem?: string;
  payrollPeriodId?: string;
  periodStatus?: string | null;
  isValid?: boolean;
  results?: DatevPreflightRow[];
};

type DatevGenerateResponse = {
  ok: boolean;
  error?: string;
  payrollSystem?: string;
  payrollPeriodId?: string;
  exportId?: string;
  isValid?: boolean;
  results?: DatevPreflightRow[];
};

type DatevExportEvent = {
  id: string;
  export_id: string;
  event_type: "generated" | "downloaded" | "invalidated_after_reopen";
  event_reason: string | null;
  created_at: string;
  created_by: string | null;
};

type DatevExport = {
  id: string;
  payroll_period_id: string;
  payroll_system: "datev_lug" | "datev_lodas";
  render_profile: string;
  export_version: number;
  source_period_closed_at: string;
  file_name: string;
  payload_sha256: string;
  encoding_name: string;
  line_ending: string;
  line_count: number;
  payload_character_count: number;
  generated_at: string;
  generated_by: string | null;
  events: DatevExportEvent[];
};

type DatevPayrollSystem = "datev_lug" | "datev_lodas";

type DatevPayrollSettings = {
  id: string | null;
  business_id: string;
  payroll_system: DatevPayrollSystem;
  consultant_number: string | null;
  client_number: string | null;
  regular_hours_wage_type: string | null;
  minijob_hours_wage_type: string | null;
  hourly_allowance_wage_type: string | null;
  vacation_hours_wage_type: string | null;
  sick_hours_wage_type: string | null;
  overtime_wage_type: string | null;
  export_hourly_rate: boolean;
  export_surcharge_percentage: boolean;
  export_cost_center: boolean;
  daily_working_time_mode: string;
  daily_working_time_wage_type: string | null;
  is_active: boolean;
};

const MONTHS = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

function formatMonth(period: PayrollPeriod) {
  return `${MONTHS[period.period_month - 1]} ${period.period_year}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(value: number | null | undefined) {
  const minutes = value ?? 0;
  const sign = minutes < 0 ? "-" : "";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;

  return `${sign}${hours}:${String(rest).padStart(2, "0")} h`;
}

function formatMoney(value: number | null | undefined) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value ?? 0);
}



const EXCEL_NAVY = "0F172A";
const EXCEL_BLUE = "2563EB";
const EXCEL_LIGHT_BLUE = "DBEAFE";
const EXCEL_LIGHT_GRAY = "EEF2F6";
const EXCEL_BORDER = "CBD5E1";
const EXCEL_GREEN = "047857";
const EXCEL_RED = "B91C1C";

function excelWageTypeLabel(value: string | null) {
  if (value === "salary") return "Monatsgehalt";
  if (value === "fixed_hourly") return "Fixer Monatslohn auf Stundenbasis";
  if (value === "hourly") return "Stundenlohn";
  return value || "—";
}

function excelActionLabel(value: string) {
  if (value === "check_in") return "Einstempeln";
  if (value === "break_start") return "Pausenbeginn";
  if (value === "break_end") return "Pausenende";
  if (value === "check_out") return "Ausstempeln";
  return value;
}

function excelSourceLabel(value: string | null) {
  if (value === "terminal") return "Terminal";
  if (value === "employee_app") return "Mitarbeiter-App";
  if (value === "admin") return "Admin";
  if (value === "kiosk") return "Kiosk";
  return value || "—";
}

function excelStatusLabel(status: PayrollPeriodStatus) {
  return status === "closed" ? "Abgeschlossen" : "Offen";
}

function formatExcelLocalDateTime(
  value: string,
  timezone: string,
) {
  const date = new Date(value);

  return {
    date: new Intl.DateTimeFormat("de-DE", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("de-DE", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date),
    monthKey: new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
    }).format(date),
  };
}

function addExcelTitle(
  sheet: ExcelJS.Worksheet,
  title: string,
  subtitle: string,
  lastColumn: number,
) {
  sheet.mergeCells(1, 1, 1, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = {
    bold: true,
    size: 20,
    color: { argb: EXCEL_NAVY },
  };
  titleCell.alignment = {
    vertical: "middle",
    horizontal: "left",
  };
  sheet.getRow(1).height = 30;

  sheet.mergeCells(2, 1, 2, lastColumn);
  const subtitleCell = sheet.getCell(2, 1);
  subtitleCell.value = subtitle;
  subtitleCell.font = {
    size: 10,
    color: { argb: "64748B" },
  };
  subtitleCell.alignment = {
    vertical: "middle",
    horizontal: "left",
  };
  sheet.getRow(2).height = 20;
}

function styleExcelHeader(
  row: ExcelJS.Row,
) {
  row.height = 23;

  row.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFF" },
      size: 10,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: EXCEL_NAVY },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "left",
      wrapText: true,
    };
    cell.border = {
      bottom: {
        style: "thin",
        color: { argb: EXCEL_BORDER },
      },
    };
  });
}

function styleExcelTable(
  sheet: ExcelJS.Worksheet,
  firstDataRow: number,
  lastDataRow: number,
  lastColumn: number,
) {
  for (let rowNumber = firstDataRow; rowNumber <= lastDataRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);

    if (rowNumber % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F8FAFC" },
        };
      });
    }

    for (let column = 1; column <= lastColumn; column += 1) {
      const cell = row.getCell(column);
      cell.alignment = {
        vertical: "top",
        horizontal: "left",
        wrapText: true,
      };
      cell.border = {
        bottom: {
          style: "hair",
          color: { argb: "E2E8F0" },
        },
      };
    }
  }
}

function setMoneyFormat(
  sheet: ExcelJS.Worksheet,
  columns: number[],
  firstRow: number,
  lastRow: number,
) {
  for (const column of columns) {
    for (let row = firstRow; row <= lastRow; row += 1) {
      sheet.getCell(row, column).numFmt = '#,##0.00 [$€-407]';
    }
  }
}

function setHoursFormat(
  sheet: ExcelJS.Worksheet,
  columns: number[],
  firstRow: number,
  lastRow: number,
) {
  for (const column of columns) {
    for (let row = firstRow; row <= lastRow; row += 1) {
      sheet.getCell(row, column).numFmt = '0.00';
    }
  }
}

function getValidationLabel(code: string | null) {
  switch (code) {
    case "period_not_ended":
      return "Periode noch nicht beendet";
    case "missing_payroll_snapshot":
      return "Payroll-Snapshot fehlt";
    case "target_minutes_requires_review":
      return "Sollzeit prüfen";
    case "time_entry_conflict":
      return "Zeitstempelkonflikt";
    case "surcharge_rate_missing":
      return "Zuschlagsbasis fehlt";
    case "overtime_rate_missing":
      return "Überstundensatz fehlt";
    default:
      return code || "Prüfung";
  }
}

function getAuditActionLabel(action: string) {
  switch (action) {
    case "close":
      return "Abgeschlossen";
    case "reopen":
      return "Wieder geöffnet";
    case "reclose":
      return "Erneut abgeschlossen";
    default:
      return action;
  }
}

function getDatevExportState(datevExport: DatevExport) {
  if (
    datevExport.events.some(
      (event) => event.event_type === "invalidated_after_reopen",
    )
  ) {
    return {
      label: "Ungültig nach Wiederöffnung",
      variant: "warning" as const,
      downloadable: false,
    };
  }

  if (datevExport.events.some((event) => event.event_type === "downloaded")) {
    return {
      label: "Heruntergeladen",
      variant: "success" as const,
      downloadable: true,
    };
  }

  return {
    label: "Erstellt",
    variant: "primary" as const,
    downloadable: true,
  };
}

export default function PayrollPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [downloadingExportId, setDownloadingExportId] = useState<string | null>(
    null,
  );
  const [isCheckingDatev, setIsCheckingDatev] = useState(false);
  const [isGeneratingDatev, setIsGeneratingDatev] = useState(false);
  const [datevPreflight, setDatevPreflight] =
    useState<DatevPreflightResponse | null>(null);
  const [datevPayrollSystem, setDatevPayrollSystem] =
    useState<DatevPayrollSystem>("datev_lug");
  const [datevSettingsBySystem, setDatevSettingsBySystem] = useState<
    Record<DatevPayrollSystem, DatevPayrollSettings | null>
  >({
    datev_lug: null,
    datev_lodas: null,
  });
  const [isSavingDatevSettings, setIsSavingDatevSettings] = useState(false);

  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState("");

  const [validationRows, setValidationRows] = useState<CloseValidationRow[]>([]);
  const [snapshots, setSnapshots] = useState<PayrollSnapshot[]>([]);
  const [auditEntries, setAuditEntries] = useState<PayrollAuditEntry[]>([]);
  const [ledgerTransactions, setLedgerTransactions] = useState<LedgerTransaction[]>([]);
  const [datevExports, setDatevExports] = useState<DatevExport[]>([]);
  const [, setTimeAccountPeriods] = useState<Record<string, string | null>>({});

  const [showReopenDialog, setShowReopenDialog] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  const [targetReviewSnapshot, setTargetReviewSnapshot] =
    useState<PayrollSnapshot | null>(null);
  const [targetReviewHours, setTargetReviewHours] = useState("");
  const [targetReviewReason, setTargetReviewReason] = useState("");
  const [isConfirmingTargetMinutes, setIsConfirmingTargetMinutes] =
    useState(false);

  const selectedPeriod = useMemo(
    () => periods.find((period) => period.id === selectedPeriodId) ?? null,
    [periods, selectedPeriodId],
  );

  const selectedDatevSettings =
    datevSettingsBySystem[datevPayrollSystem];

  const blockers = useMemo(
    () => validationRows.filter((row) => !row.is_valid),
    [validationRows],
  );

  const validEmployees = useMemo(
    () =>
      validationRows.filter(
        (row) => row.is_valid && row.employee_id !== null,
      ).length,
    [validationRows],
  );

  const estimatedGrossTotal = useMemo(
    () =>
      snapshots.reduce(
        (sum, snapshot) => sum + Number(snapshot.estimated_gross ?? 0),
        0,
      ),
    [snapshots],
  );

  const totalAccountableMinutes = useMemo(
    () =>
      snapshots.reduce(
        (sum, snapshot) => sum + Number(snapshot.accountable_minutes ?? 0),
        0,
      ),
    [snapshots],
  );

  const canManagePayroll =
    currentUserRole === "owner" || currentUserRole === "admin";

  function createEmptyDatevSettings(
    businessId: string,
    payrollSystem: DatevPayrollSystem,
  ): DatevPayrollSettings {
    return {
      id: null,
      business_id: businessId,
      payroll_system: payrollSystem,
      consultant_number: "",
      client_number: "",
      regular_hours_wage_type: "",
      minijob_hours_wage_type: "",
      hourly_allowance_wage_type: "",
      vacation_hours_wage_type: "",
      sick_hours_wage_type: "",
      overtime_wage_type: "",
      export_hourly_rate: true,
      export_surcharge_percentage: true,
      export_cost_center: false,
      daily_working_time_mode: "none",
      daily_working_time_wage_type: null,
      is_active: true,
    };
  }

  async function loadDatevSettings(businessId: string) {
    const { data, error } = await supabase
      .from("business_datev_payroll_settings")
      .select(`
        id,
        business_id,
        payroll_system,
        consultant_number,
        client_number,
        regular_hours_wage_type,
        minijob_hours_wage_type,
        hourly_allowance_wage_type,
        vacation_hours_wage_type,
        sick_hours_wage_type,
        overtime_wage_type,
        export_hourly_rate,
        export_surcharge_percentage,
        export_cost_center,
        daily_working_time_mode,
        daily_working_time_wage_type,
        is_active
      `)
      .eq("business_id", businessId)
      .in("payroll_system", ["datev_lug", "datev_lodas"]);

    if (error) {
      console.error("DATEV SETTINGS LOAD ERROR:", error);
      showToast({
        type: "warning",
        title: "DATEV-Konfiguration konnte nicht geladen werden",
        description: error.message,
      });
      return;
    }

    const nextSettings: Record<
      DatevPayrollSystem,
      DatevPayrollSettings | null
    > = {
      datev_lug: createEmptyDatevSettings(businessId, "datev_lug"),
      datev_lodas: createEmptyDatevSettings(businessId, "datev_lodas"),
    };

    for (const row of data || []) {
  if (
    row.payroll_system !== "datev_lug" &&
    row.payroll_system !== "datev_lodas"
  ) {
    continue;
  }

  const payrollSystem = row.payroll_system as DatevPayrollSystem;

  nextSettings[payrollSystem] = row as DatevPayrollSettings;
}

    setDatevSettingsBySystem(nextSettings);
  }

  function updateSelectedDatevSettings<K extends keyof DatevPayrollSettings>(
    field: K,
    value: DatevPayrollSettings[K],
  ) {
    setDatevSettingsBySystem((current) => {
      const settings = current[datevPayrollSystem];
      if (!settings) return current;

      return {
        ...current,
        [datevPayrollSystem]: {
          ...settings,
          [field]: value,
        },
      };
    });

    setDatevPreflight(null);
  }

  async function handleSaveDatevSettings() {
    if (!selectedDatevSettings || isSavingDatevSettings) return;

    if (!canManagePayroll) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Nur Admins und Owner dürfen DATEV-Einstellungen ändern.",
      });
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Die DATEV-Konfiguration konnte nicht gespeichert werden.",
      });
      return;
    }

    if (
      !selectedDatevSettings.consultant_number?.trim() ||
      !selectedDatevSettings.client_number?.trim()
    ) {
      showToast({
        type: "warning",
        title: "DATEV-Stammdaten fehlen",
        description: "Bitte gib Beraternummer und Mandantennummer ein.",
      });
      return;
    }

    const payload = {
      business_id: businessId,
      payroll_system: datevPayrollSystem,
      consultant_number: selectedDatevSettings.consultant_number.trim(),
      client_number: selectedDatevSettings.client_number.trim(),
      regular_hours_wage_type:
        selectedDatevSettings.regular_hours_wage_type?.trim() || null,
      minijob_hours_wage_type:
        selectedDatevSettings.minijob_hours_wage_type?.trim() || null,
      hourly_allowance_wage_type:
        selectedDatevSettings.hourly_allowance_wage_type?.trim() || null,
      vacation_hours_wage_type:
        selectedDatevSettings.vacation_hours_wage_type?.trim() || null,
      sick_hours_wage_type:
        selectedDatevSettings.sick_hours_wage_type?.trim() || null,
      overtime_wage_type:
        selectedDatevSettings.overtime_wage_type?.trim() || null,
      export_hourly_rate: selectedDatevSettings.export_hourly_rate,
      export_surcharge_percentage:
        selectedDatevSettings.export_surcharge_percentage,
      export_cost_center: selectedDatevSettings.export_cost_center,
    };

    setIsSavingDatevSettings(true);

    try {
      if (selectedDatevSettings.id) {
        const { error } = await supabase
          .from("business_datev_payroll_settings")
          .update(payload)
          .eq("id", selectedDatevSettings.id)
          .eq("business_id", businessId);

        if (error) {
          console.error("DATEV SETTINGS UPDATE ERROR:", error);
          showToast({
            type: "error",
            title: "DATEV-Konfiguration konnte nicht gespeichert werden",
            description: error.message,
          });
          return;
        }
      } else {
        const { error } = await supabase
          .from("business_datev_payroll_settings")
          .insert([
            {
              ...payload,
              daily_working_time_mode: "none",
              daily_working_time_wage_type: null,
              is_active: true,
            },
          ]);

        if (error) {
          console.error("DATEV SETTINGS INSERT ERROR:", error);
          showToast({
            type: "error",
            title: "DATEV-Konfiguration konnte nicht angelegt werden",
            description: error.message,
          });
          return;
        }
      }

      setDatevPreflight(null);
      await loadDatevSettings(businessId);

      showToast({
        type: "success",
        title: "DATEV-Konfiguration gespeichert",
        description:
          datevPayrollSystem === "datev_lug"
            ? "Die Einstellungen für DATEV Lohn & Gehalt wurden aktualisiert."
            : "Die Einstellungen für DATEV LODAS wurden aktualisiert.",
      });
    } finally {
      setIsSavingDatevSettings(false);
    }
  }

  async function getAccessToken() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      return null;
    }

    return session.access_token;
  }

  async function handleCheckDatev() {
    if (!selectedPeriod || isCheckingDatev) return;

    if (!canManagePayroll) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Nur Admins und Owner dürfen den DATEV-Export prüfen.",
      });
      return;
    }

    setIsCheckingDatev(true);
    setDatevPreflight(null);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        showToast({
          type: "error",
          title: "Anmeldung erforderlich",
          description: "Bitte melde dich erneut an.",
        });
        return;
      }

      const response = await fetch(
        `/api/datev/periods/${selectedPeriod.id}/export?system=${datevPayrollSystem}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      let payload: DatevPreflightResponse;

      try {
        payload = (await response.json()) as DatevPreflightResponse;
      } catch {
        showToast({
          type: "error",
          title: "DATEV-Prüfung fehlgeschlagen",
          description: "Der Server hat keine gültige Antwort geliefert.",
        });
        return;
      }

      setDatevPreflight(payload);

      if (!response.ok) {
        showToast({
          type: "error",
          title: "DATEV-Prüfung fehlgeschlagen",
          description: payload.error || "Die DATEV-Prüfung konnte nicht durchgeführt werden.",
        });
        return;
      }

      if (payload.isValid) {
        showToast({
          type: "success",
          title: "DATEV-Prüfung erfolgreich",
          description:
          datevPayrollSystem === "datev_lug"
            ? "Der ausgewählte Abrechnungszeitraum ist für den DATEV Lohn & Gehalt-Export bereit."
            : "Der ausgewählte Abrechnungszeitraum ist für den DATEV LODAS-Export bereit.",
        });
      } else {
        const blockers = (payload.results || []).filter((row) => !row.is_valid);
        showToast({
          type: "warning",
          title: "DATEV-Export noch nicht möglich",
          description: `${blockers.length} DATEV-Problem(e) müssen zuerst behoben werden.`,
        });
      }
    } catch (error) {
      console.error("DATEV PREFLIGHT ERROR:", error);
      showToast({
        type: "error",
        title: "DATEV-Prüfung fehlgeschlagen",
        description: "Die DATEV-Prüfung konnte nicht durchgeführt werden.",
      });
    } finally {
      setIsCheckingDatev(false);
    }
  }

  async function handleGenerateDatevExport() {
    if (!selectedPeriod || isGeneratingDatev) return;

    if (!canManagePayroll) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Nur Admins und Owner dürfen DATEV-Exporte erstellen.",
      });
      return;
    }

    if (selectedPeriod.status !== "closed") {
      showToast({
        type: "warning",
        title: "Abrechnungsperiode ist noch offen",
        description:
          "Ein DATEV-Export kann nur für einen abgeschlossenen Monat erstellt werden.",
      });
      return;
    }

    if (
  !datevPreflight?.isValid ||
  datevPreflight.payrollSystem !== datevPayrollSystem ||
  datevPreflight.payrollPeriodId !== selectedPeriod.id
) {
  showToast({
    type: "warning",
    title: "DATEV-Prüfung erforderlich",
    description:
      "Bitte führe zuerst eine erfolgreiche DATEV-Prüfung für den aktuell ausgewählten Abrechnungszeitraum und das gewählte DATEV-System durch.",
  });
  return;
}

    setIsGeneratingDatev(true);

    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        showToast({
          type: "error",
          title: "Anmeldung erforderlich",
          description: "Bitte melde dich erneut an.",
        });
        return;
      }

      const response = await fetch(
        `/api/datev/periods/${selectedPeriod.id}/export?system=${datevPayrollSystem}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          cache: "no-store",
        },
      );

      let payload: DatevGenerateResponse;

      try {
        payload = (await response.json()) as DatevGenerateResponse;
      } catch {
        showToast({
          type: "error",
          title: "DATEV-Export fehlgeschlagen",
          description: "Der Server hat keine gültige Antwort geliefert.",
        });
        return;
      }

      if (!response.ok || !payload.ok || !payload.exportId) {
        if (payload.results) {
          setDatevPreflight({
            ok: payload.ok,
            error: payload.error,
            payrollSystem: payload.payrollSystem,
            payrollPeriodId: payload.payrollPeriodId,
            isValid: payload.isValid ?? false,
            results: payload.results,
          });
        }

        showToast({
          type: "error",
          title: "DATEV-Export fehlgeschlagen",
          description:
            payload.error || "Der DATEV-Export konnte nicht erstellt werden.",
        });
        return;
      }

      showToast({
        type: "success",
        title: "DATEV-Export erstellt",
        description:
          "Die neue Exportversion wurde unveränderlich gespeichert und steht zum Download bereit.",
      });

      await loadDatevExports(selectedPeriod.id);
    } catch (error) {
      console.error("DATEV GENERATION ERROR:", error);
      showToast({
        type: "error",
        title: "DATEV-Export fehlgeschlagen",
        description: "Der DATEV-Export konnte nicht erstellt werden.",
      });
    } finally {
      setIsGeneratingDatev(false);
    }
  }

  async function loadDatevExports(periodId: string) {
    const { data: exportData, error: exportError } = await supabase
      .from("datev_payroll_exports")
      .select(`
        id,
        payroll_period_id,
        payroll_system,
        render_profile,
        export_version,
        source_period_closed_at,
        file_name,
        payload_sha256,
        encoding_name,
        line_ending,
        line_count,
        payload_character_count,
        generated_at,
        generated_by
      `)
      .eq("payroll_period_id", periodId)
      .order("export_version", { ascending: false });

    if (exportError) {
      console.error("DATEV EXPORT HISTORY LOAD ERROR:", exportError);
      setDatevExports([]);
      return;
    }

    const exports = (exportData || []) as Omit<DatevExport, "events">[];

    if (exports.length === 0) {
      setDatevExports([]);
      return;
    }

    const { data: eventData, error: eventError } = await supabase
      .from("datev_payroll_export_events")
      .select(`
        id,
        export_id,
        event_type,
        event_reason,
        created_at,
        created_by
      `)
      .in(
        "export_id",
        exports.map((datevExport) => datevExport.id),
      )
      .order("created_at", { ascending: true });

    if (eventError) {
      console.error("DATEV EXPORT EVENTS LOAD ERROR:", eventError);
    }

    const events = (eventData || []) as DatevExportEvent[];

    setDatevExports(
      exports.map((datevExport) => ({
        ...datevExport,
        events: events.filter((event) => event.export_id === datevExport.id),
      })),
    );
  }

  async function handleExcelExport() {
    if (!selectedPeriod || snapshots.length === 0) {
      showToast({
        type: "warning",
        title: "Kein Export möglich",
        description:
          "Für diese Abrechnungsperiode sind keine Payroll-Snapshots vorhanden.",
      });
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Excel-Export konnte nicht erstellt werden.",
      });
      return;
    }

    showToast({
      type: "info",
      title: "Excel-Export wird erstellt",
      description:
        "Arbeitszeiten, Abwesenheiten und Abrechnungsdaten werden zusammengestellt.",
    });

    try {
      const periodStart = new Date(
        Date.UTC(
          selectedPeriod.period_year,
          selectedPeriod.period_month - 1,
          1,
        ),
      );
      const periodEndExclusive = new Date(
        Date.UTC(
          selectedPeriod.period_year,
          selectedPeriod.period_month,
          1,
        ),
      );

      const bufferedStart = new Date(periodStart);
      bufferedStart.setUTCDate(bufferedStart.getUTCDate() - 2);

      const bufferedEnd = new Date(periodEndExclusive);
      bufferedEnd.setUTCDate(bufferedEnd.getUTCDate() + 2);

      const [
        businessResult,
        timeEntriesResult,
        absenceDetailsResult,
      ] = await Promise.all([
        supabase
          .from("businesses")
          .select("name, timezone")
          .eq("id", businessId)
          .single(),

        supabase
          .from("time_entries")
          .select(`
            id,
            employee_id,
            employee_name,
            action,
            created_at,
            source,
            location_verified,
            location_check_status,
            location_exception_reason
          `)
          .eq("business_id", businessId)
          .gte("created_at", bufferedStart.toISOString())
          .lt("created_at", bufferedEnd.toISOString())
          .order("created_at", { ascending: true }),

        supabase
          .from("payroll_snapshot_absence_details")
          .select(`
            snapshot_id,
            employee_id,
            absence_id,
            absence_type_name,
            absence_type_code,
            absence_category,
            request_status,
            local_date,
            evaluation_source,
            scheduled_minutes,
            calculated_minutes,
            override_minutes,
            credited_minutes,
            paid_minutes,
            affects_time_account,
            affects_payroll,
            override_reason
          `)
          .eq("payroll_period_id", selectedPeriod.id)
          .order("local_date", { ascending: true }),
      ]);

      if (businessResult.error) {
        throw businessResult.error;
      }

      if (timeEntriesResult.error) {
        throw timeEntriesResult.error;
      }

      if (absenceDetailsResult.error) {
        console.warn(
          "EXCEL ABSENCE DETAILS LOAD ERROR:",
          absenceDetailsResult.error,
        );
      }

      const businessName =
        businessResult.data?.name || "Dipera Betrieb";
      const businessTimezone =
        businessResult.data?.timezone || "Europe/Berlin";

      const selectedMonthKey =
        `${selectedPeriod.period_year}-${String(
          selectedPeriod.period_month,
        ).padStart(2, "0")}`;

      const timeEntries = (
        (timeEntriesResult.data || []) as ExcelTimeEntry[]
      ).filter((entry) => {
        const local = formatExcelLocalDateTime(
          entry.created_at,
          businessTimezone,
        );

        return local.monthKey === selectedMonthKey;
      });

      const absenceDetails =
        (absenceDetailsResult.data || []) as ExcelAbsenceDetail[];

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Dipera";
      workbook.company = "Dipera";
      workbook.created = new Date();
      workbook.modified = new Date();

      const periodLabel = formatMonth(selectedPeriod);
      const generatedAt = new Date().toLocaleString("de-DE");

      /*
       * ==================================================
       * BLATT 1: ÜBERSICHT
       * ==================================================
       */
      const overviewSheet = workbook.addWorksheet("Übersicht", {
        views: [{ showGridLines: false }],
      });

      overviewSheet.columns = [
        { width: 31 },
        { width: 25 },
        { width: 25 },
        { width: 25 },
      ];

      addExcelTitle(
        overviewSheet,
        "DIPERA – Monatsabrechnung",
        `${businessName} · ${periodLabel}`,
        4,
      );

      overviewSheet.getCell("A4").value = "Abrechnungsperiode";
      overviewSheet.getCell("B4").value = periodLabel;
      overviewSheet.getCell("A5").value = "Status";
      overviewSheet.getCell("B5").value =
        excelStatusLabel(selectedPeriod.status);
      overviewSheet.getCell("A6").value = "Erstellt am";
      overviewSheet.getCell("B6").value = generatedAt;
      overviewSheet.getCell("A7").value = "Zeitzone";
      overviewSheet.getCell("B7").value = businessTimezone;

      for (let row = 4; row <= 7; row += 1) {
        overviewSheet.getCell(row, 1).font = {
          bold: true,
          color: { argb: "475569" },
        };
      }

      overviewSheet.mergeCells("A9:D9");
      overviewSheet.getCell("A9").value = "Monatskennzahlen";
      overviewSheet.getCell("A9").font = {
        bold: true,
        size: 13,
        color: { argb: EXCEL_NAVY },
      };

      const summaryHeader = overviewSheet.getRow(10);
      summaryHeader.values = [
        "Kennzahl",
        "Wert",
        "Kennzahl",
        "Wert",
      ];
      styleExcelHeader(summaryHeader);

      const totalTargetMinutes = snapshots.reduce(
        (sum, snapshot) =>
          sum + Number(snapshot.target_minutes ?? 0),
        0,
      );
      const totalWorkedMinutes = snapshots.reduce(
        (sum, snapshot) =>
          sum + Number(snapshot.worked_minutes ?? 0),
        0,
      );
      const totalVacationMinutes = snapshots.reduce(
        (sum, snapshot) =>
          sum + Number(snapshot.vacation_minutes ?? 0),
        0,
      );
      const totalSickMinutes = snapshots.reduce(
        (sum, snapshot) =>
          sum + Number(snapshot.sick_minutes ?? 0),
        0,
      );
      const totalOtherAbsenceMinutes = snapshots.reduce(
        (sum, snapshot) =>
          sum + Number(snapshot.other_absence_minutes ?? 0),
        0,
      );
      const totalCreditedMinutes = snapshots.reduce(
        (sum, snapshot) =>
          sum + Number(snapshot.credited_minutes ?? 0),
        0,
      );
      const totalBaseGross = snapshots.reduce(
        (sum, snapshot) =>
          sum + Number(snapshot.base_gross ?? 0),
        0,
      );
      const totalHourlyAllowanceGross = snapshots.reduce(
        (sum, snapshot) =>
          sum + Number(snapshot.hourly_allowance_gross ?? 0),
        0,
      );
      const totalOvertimeGross = snapshots.reduce(
        (sum, snapshot) =>
          sum + Number(snapshot.overtime_gross ?? 0),
        0,
      );
      const totalSurchargeGross = snapshots.reduce(
        (sum, snapshot) =>
          sum + Number(snapshot.total_surcharge_gross ?? 0),
        0,
      );

      const summaryRows: Array<
        [string, string | number, string, string | number]
      > = [
        [
          "Mitarbeiter",
          snapshots.length,
          "Stempelereignisse",
          timeEntries.length,
        ],
        [
          "Sollzeit gesamt",
          formatMinutes(totalTargetMinutes),
          "Arbeitszeit gesamt",
          formatMinutes(totalWorkedMinutes),
        ],
        [
          "Urlaub",
          formatMinutes(totalVacationMinutes),
          "Krankheit",
          formatMinutes(totalSickMinutes),
        ],
        [
          "Sonstige Abwesenheit",
          formatMinutes(totalOtherAbsenceMinutes),
          "Gutgeschriebene Abwesenheit",
          formatMinutes(totalCreditedMinutes),
        ],
        [
          "Abrechenbare Zeit",
          formatMinutes(totalAccountableMinutes),
          "Abwesenheitstage",
          absenceDetails.length,
        ],
        [
          "Grundvergütung",
          totalBaseGross,
          "Stundenzulagen",
          totalHourlyAllowanceGross,
        ],
        [
          "Überstundenvergütung",
          totalOvertimeGross,
          "Zuschläge",
          totalSurchargeGross,
        ],
        [
          "Bruttovergütung gesamt",
          estimatedGrossTotal,
          "Abschlussblocker",
          blockers.length,
        ],
      ];

      summaryRows.forEach((values) => {
        overviewSheet.addRow(values);
      });

      for (let row = 11; row <= 18; row += 1) {
        overviewSheet.getCell(row, 1).font = { bold: true };
        overviewSheet.getCell(row, 3).font = { bold: true };
      }

      for (const row of [16, 17, 18]) {
        overviewSheet.getCell(row, 2).numFmt =
          '#,##0.00 [$€-407]';
      }
      for (const row of [16, 17]) {
        overviewSheet.getCell(row, 4).numFmt =
          '#,##0.00 [$€-407]';
      }

      overviewSheet.getCell("B18").font = {
        bold: true,
        color: { argb: EXCEL_BLUE },
        size: 12,
      };

      overviewSheet.mergeCells("A20:D20");
      overviewSheet.getCell("A20").value =
        "Hinweis: Die ausgewiesenen Beträge sind Bruttolohn-/Bruttovergütungswerte ohne Arbeitgeberanteile und sonstige Lohnnebenkosten.";
      overviewSheet.getCell("A20").font = {
        italic: true,
        size: 10,
        color: { argb: "64748B" },
      };
      overviewSheet.getCell("A20").alignment = {
        wrapText: true,
      };
      overviewSheet.getRow(20).height = 34;

      /*
       * ==================================================
       * BLATT 2: MITARBEITER
       * ==================================================
       */
      const employeeSheet = workbook.addWorksheet("Mitarbeiter", {
        views: [
          {
            state: "frozen",
            ySplit: 4,
            showGridLines: false,
          },
        ],
      });

      const employeeHeaders = [
        "Mitarbeiter",
        "Personalnummer",
        "Kostenstelle",
        "Lohnmodell",
        "Stundenkonto",
        "Soll (h)",
        "Ist (h)",
        "Urlaub (h)",
        "Krankheit (h)",
        "Sonstige Abwesenheit (h)",
        "Gutgeschrieben (h)",
        "Bezahlt abwesend (h)",
        "Abrechenbar (h)",
        "Monatsdifferenz (h)",
        "Saldo (h)",
        "Überstunden (h)",
        "Auszahlung Überstunden (h)",
        "Übertrag (h)",
        "Stundenlohn",
        "Monatsgehalt",
        "Überstundensatz",
        "Zuschlagsbasis",
        "Grundvergütung",
        "Stundenzulage",
        "Überstundenvergütung",
        "Nachtzuschlag",
        "Sonntagszuschlag",
        "Feiertagszuschlag",
        "Sonstige Zuschläge",
        "Zuschläge gesamt",
        "Brutto gesamt",
        "Sollzeit geprüft?",
        "Sollzeit-Begründung",
      ];

      employeeSheet.columns = employeeHeaders.map((header, index) => ({
        header,
        key: `c${index + 1}`,
        width:
          index === 0
            ? 24
            : index === 32
              ? 34
              : index >= 22 && index <= 30
                ? 18
                : 16,
      }));

      addExcelTitle(
        employeeSheet,
        "DIPERA – Mitarbeiterabrechnung",
        `${businessName} · ${periodLabel}`,
        employeeHeaders.length,
      );

      const employeeHeaderRow = employeeSheet.getRow(4);
      employeeHeaderRow.values = employeeHeaders;
      styleExcelHeader(employeeHeaderRow);

      for (const snapshot of snapshots) {
        const hasTimeAccount =
          snapshot.time_account_period !== "none";

        employeeSheet.addRow([
          snapshot.employee_name || snapshot.employee_id,
          snapshot.datev_personnel_number || "—",
          snapshot.cost_center || "—",
          excelWageTypeLabel(snapshot.wage_type),
          hasTimeAccount
            ? snapshot.time_account_period || "Aktiv"
            : "Kein Stundenkonto",
          hasTimeAccount
            ? Number(snapshot.target_minutes ?? 0) / 60
            : null,
          Number(snapshot.worked_minutes ?? 0) / 60,
          Number(snapshot.vacation_minutes ?? 0) / 60,
          Number(snapshot.sick_minutes ?? 0) / 60,
          Number(snapshot.other_absence_minutes ?? 0) / 60,
          Number(snapshot.credited_minutes ?? 0) / 60,
          Number(snapshot.paid_absence_minutes ?? 0) / 60,
          Number(snapshot.accountable_minutes ?? 0) / 60,
          hasTimeAccount
            ? Number(snapshot.raw_difference_minutes ?? 0) / 60
            : null,
          hasTimeAccount
            ? Number(snapshot.balance_minutes ?? 0) / 60
            : null,
          hasTimeAccount
            ? Number(snapshot.overtime_minutes ?? 0) / 60
            : null,
          hasTimeAccount
            ? Number(snapshot.payout_overtime_minutes ?? 0) / 60
            : null,
          hasTimeAccount
            ? Number(snapshot.carried_balance_minutes ?? 0) / 60
            : null,
          Number(snapshot.hourly_rate ?? 0),
          Number(snapshot.monthly_salary ?? 0),
          Number(snapshot.overtime_hourly_rate ?? 0),
          Number(snapshot.surcharge_hourly_rate ?? 0),
          Number(snapshot.base_gross ?? 0),
          Number(snapshot.hourly_allowance_gross ?? 0),
          Number(snapshot.overtime_gross ?? 0),
          Number(snapshot.night_surcharge_gross ?? 0),
          Number(snapshot.sunday_surcharge_gross ?? 0),
          Number(snapshot.holiday_surcharge_gross ?? 0),
          Number(snapshot.other_surcharge_gross ?? 0),
          Number(snapshot.total_surcharge_gross ?? 0),
          Number(snapshot.estimated_gross ?? 0),
          snapshot.target_minutes_requires_review
            ? "Prüfung erforderlich"
            : "Nein",
          snapshot.target_minutes_override_reason || "—",
        ]);
      }

      const employeeLastRow =
        Math.max(4, employeeSheet.rowCount);

      styleExcelTable(
        employeeSheet,
        5,
        employeeLastRow,
        employeeHeaders.length,
      );
      setHoursFormat(
        employeeSheet,
        [
          6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
        ],
        5,
        employeeLastRow,
      );
      setMoneyFormat(
        employeeSheet,
        [
          19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
          31,
        ],
        5,
        employeeLastRow,
      );

      employeeSheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: {
          row: employeeLastRow,
          column: employeeHeaders.length,
        },
      };

      /*
       * ==================================================
       * BLATT 3: STEMPELUNGEN
       * ==================================================
       */
      const timeSheet = workbook.addWorksheet("Stempelungen", {
        views: [
          {
            state: "frozen",
            ySplit: 4,
            showGridLines: false,
          },
        ],
      });

      const timeHeaders = [
        "Datum",
        "Uhrzeit",
        "Mitarbeiter",
        "Aktion",
        "Quelle",
        "Standort geprüft",
        "Standortstatus",
        "Ausnahme / Hinweis",
      ];

      timeSheet.columns = [
        { width: 15 },
        { width: 11 },
        { width: 25 },
        { width: 19 },
        { width: 18 },
        { width: 17 },
        { width: 22 },
        { width: 38 },
      ];

      addExcelTitle(
        timeSheet,
        "DIPERA – Stempelungen",
        `${businessName} · ${periodLabel}`,
        timeHeaders.length,
      );

      const timeHeaderRow = timeSheet.getRow(4);
      timeHeaderRow.values = timeHeaders;
      styleExcelHeader(timeHeaderRow);

      for (const entry of timeEntries) {
        const local = formatExcelLocalDateTime(
          entry.created_at,
          businessTimezone,
        );

        timeSheet.addRow([
          local.date,
          local.time,
          entry.employee_name,
          excelActionLabel(entry.action),
          excelSourceLabel(entry.source),
          entry.location_verified ? "Ja" : "Nein",
          entry.location_check_status || "—",
          entry.location_exception_reason || "—",
        ]);
      }

      const timeLastRow = Math.max(4, timeSheet.rowCount);
      styleExcelTable(
        timeSheet,
        5,
        timeLastRow,
        timeHeaders.length,
      );
      timeSheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: timeLastRow, column: timeHeaders.length },
      };

      /*
       * ==================================================
       * BLATT 4: ABWESENHEITEN
       * ==================================================
       */
      const absenceSheet = workbook.addWorksheet("Abwesenheiten", {
        views: [
          {
            state: "frozen",
            ySplit: 4,
            showGridLines: false,
          },
        ],
      });

      const absenceHeaders = [
        "Datum",
        "Mitarbeiter",
        "Abwesenheitsart",
        "Code",
        "Kategorie",
        "Status",
        "Geplant (h)",
        "Berechnet (h)",
        "Override (h)",
        "Gutgeschrieben (h)",
        "Bezahlt (h)",
        "Zeitkonto relevant",
        "Payroll relevant",
        "Berechnungsquelle",
        "Override-Begründung",
      ];

      absenceSheet.columns = absenceHeaders.map(
        (header, index) => ({
          header,
          key: `a${index + 1}`,
          width:
            index === 1
              ? 25
              : index === 2
                ? 24
                : index === 14
                  ? 38
                  : 18,
        }),
      );

      addExcelTitle(
        absenceSheet,
        "DIPERA – Abwesenheiten",
        `${businessName} · ${periodLabel} · eingefrorene Payroll-Daten`,
        absenceHeaders.length,
      );

      const absenceHeaderRow = absenceSheet.getRow(4);
      absenceHeaderRow.values = absenceHeaders;
      styleExcelHeader(absenceHeaderRow);

      const employeeNamesById = new Map(
        snapshots.map((snapshot) => [
          snapshot.employee_id,
          snapshot.employee_name || snapshot.employee_id,
        ]),
      );

      for (const detail of absenceDetails) {
        absenceSheet.addRow([
          new Date(
            `${detail.local_date}T12:00:00`,
          ).toLocaleDateString("de-DE"),
          employeeNamesById.get(detail.employee_id) ||
            detail.employee_id,
          detail.absence_type_name ||
            detail.absence_type_code ||
            "—",
          detail.absence_type_code || "—",
          detail.absence_category || "—",
          detail.request_status || "—",
          Number(detail.scheduled_minutes ?? 0) / 60,
          Number(detail.calculated_minutes ?? 0) / 60,
          detail.override_minutes === null
            ? null
            : Number(detail.override_minutes) / 60,
          Number(detail.credited_minutes ?? 0) / 60,
          Number(detail.paid_minutes ?? 0) / 60,
          detail.affects_time_account ? "Ja" : "Nein",
          detail.affects_payroll ? "Ja" : "Nein",
          detail.evaluation_source || "—",
          detail.override_reason || "—",
        ]);
      }

      const absenceLastRow =
        Math.max(4, absenceSheet.rowCount);

      styleExcelTable(
        absenceSheet,
        5,
        absenceLastRow,
        absenceHeaders.length,
      );
      setHoursFormat(
        absenceSheet,
        [7, 8, 9, 10, 11],
        5,
        absenceLastRow,
      );
      absenceSheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: {
          row: absenceLastRow,
          column: absenceHeaders.length,
        },
      };

      /*
       * ==================================================
       * BLATT 5: ZEITKONTO
       * ==================================================
       */
      const ledgerSheet = workbook.addWorksheet("Zeitkonto", {
        views: [
          {
            state: "frozen",
            ySplit: 4,
            showGridLines: false,
          },
        ],
      });

      const ledgerHeaders = [
        "Datum",
        "Mitarbeiter",
        "Buchung",
        "Stunden",
        "Quelle",
        "Hinweis",
      ];

      ledgerSheet.columns = [
        { width: 15 },
        { width: 25 },
        { width: 28 },
        { width: 14 },
        { width: 20 },
        { width: 48 },
      ];

      addExcelTitle(
        ledgerSheet,
        "DIPERA – Zeitkonto-Buchungen",
        `${businessName} · ${periodLabel}`,
        ledgerHeaders.length,
      );

      const ledgerHeaderRow = ledgerSheet.getRow(4);
      ledgerHeaderRow.values = ledgerHeaders;
      styleExcelHeader(ledgerHeaderRow);

      for (const transaction of ledgerTransactions) {
        ledgerSheet.addRow([
          new Date(
            `${transaction.transaction_date}T12:00:00`,
          ).toLocaleDateString("de-DE"),
          transaction.employee_name ||
            transaction.employee_id,
          transaction.transaction_type,
          Number(transaction.minutes ?? 0) / 60,
          transaction.source_type || "—",
          transaction.note || "—",
        ]);
      }

      const ledgerLastRow =
        Math.max(4, ledgerSheet.rowCount);

      styleExcelTable(
        ledgerSheet,
        5,
        ledgerLastRow,
        ledgerHeaders.length,
      );
      setHoursFormat(
        ledgerSheet,
        [4],
        5,
        ledgerLastRow,
      );
      ledgerSheet.autoFilter = {
        from: { row: 4, column: 1 },
        to: {
          row: ledgerLastRow,
          column: ledgerHeaders.length,
        },
      };

      /*
       * ==================================================
       * BLATT 6: ABRECHNUNGSPRÜFUNG
       * ==================================================
       */
      const validationSheet = workbook.addWorksheet(
        "Abrechnungsprüfung",
        {
          views: [
            {
              state: "frozen",
              ySplit: 4,
              showGridLines: false,
            },
          ],
        },
      );

      const validationHeaders = [
        "Mitarbeiter",
        "Ergebnis",
        "Prüfung",
        "Beschreibung",
      ];

      validationSheet.columns = [
        { width: 25 },
        { width: 16 },
        { width: 30 },
        { width: 70 },
      ];

      addExcelTitle(
        validationSheet,
        "DIPERA – Abrechnungsprüfung",
        `${businessName} · ${periodLabel}`,
        validationHeaders.length,
      );

      const validationHeaderRow =
        validationSheet.getRow(4);
      validationHeaderRow.values = validationHeaders;
      styleExcelHeader(validationHeaderRow);

      for (const row of validationRows) {
        validationSheet.addRow([
          row.employee_name || "Abrechnungsperiode",
          row.is_valid ? "OK" : "Blockiert",
          row.error_code
            ? getValidationLabel(row.error_code)
            : "Keine Beanstandung",
          row.error_message || "—",
        ]);
      }

      const validationLastRow =
        Math.max(4, validationSheet.rowCount);

      styleExcelTable(
        validationSheet,
        5,
        validationLastRow,
        validationHeaders.length,
      );

      for (
        let rowNumber = 5;
        rowNumber <= validationLastRow;
        rowNumber += 1
      ) {
        const resultCell =
          validationSheet.getCell(rowNumber, 2);

        if (resultCell.value === "Blockiert") {
          resultCell.font = {
            bold: true,
            color: { argb: EXCEL_RED },
          };
        } else {
          resultCell.font = {
            bold: true,
            color: { argb: EXCEL_GREEN },
          };
        }
      }

      /*
       * Dateiname + Download
       */
      const buffer =
        await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const month = String(
        selectedPeriod.period_month,
      ).padStart(2, "0");

      anchor.href = objectUrl;
      anchor.download =
        `Dipera_Abrechnung_${selectedPeriod.period_year}-${month}.xlsx`;
      anchor.style.display = "none";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(objectUrl);

      showToast({
        type: "success",
        title: "Excel-Export erstellt",
        description:
          `${periodLabel} wurde als ausführliche Excel-Arbeitsmappe mit 6 Tabellenblättern exportiert.`,
      });
    } catch (error) {
      console.error("EXCEL EXPORT ERROR:", error);

      showToast({
        type: "error",
        title: "Excel-Export fehlgeschlagen",
        description:
          error instanceof Error
            ? error.message
            : "Die Excel-Datei konnte nicht erstellt werden.",
      });
    }
  }

  async function loadPeriodDetails(periodId: string) {
    const [validationResult, snapshotResult, auditResult, ledgerResult, settingsResult] =
      await Promise.all([
        supabase.rpc("validate_my_payroll_period_close", {
          p_payroll_period_id: periodId,
        }),

        supabase
          .from("payroll_period_employee_snapshots")
          .select(`
            *,
            employees!payroll_period_employee_snapshots_employee_id_fkey (
              name
            )
          `)
          .eq("payroll_period_id", periodId)
          .order("employee_id", { ascending: true }),

        supabase
          .from("payroll_period_audit_log")
          .select(`
            id,
            payroll_period_id,
            action,
            actor_id,
            reason,
            previous_status,
            new_status,
            metadata,
            created_at
          `)
          .eq("payroll_period_id", periodId)
          .order("created_at", { ascending: false }),

        supabase
          .from("time_account_transactions")
          .select(`
            id,
            payroll_period_id,
            employee_id,
            transaction_date,
            transaction_type,
            minutes,
            source_type,
            source_id,
            note,
            created_at,
            employees!time_account_transactions_employee_id_fkey (
              name
            )
          `)
          .eq("payroll_period_id", periodId)
          .order("transaction_date", { ascending: true }),

        supabase
          .from("employee_time_account_settings")
          .select("employee_id, time_account_period"),
      ]);

    if (validationResult.error) {
      console.error("PAYROLL CLOSE VALIDATION ERROR:", validationResult.error);
      showToast({
        type: "error",
        title: "Abschlussprüfung fehlgeschlagen",
        description: validationResult.error.message,
      });
    } else {
      setValidationRows(
        (validationResult.data || []) as CloseValidationRow[],
      );
    }

    const nextTimeAccountPeriods: Record<string, string | null> = {};

    if (settingsResult.error) {
      console.error("TIME ACCOUNT SETTINGS LOAD ERROR:", settingsResult.error);
    } else {
      for (const setting of settingsResult.data || []) {
        nextTimeAccountPeriods[setting.employee_id] = setting.time_account_period;
      }
    }

    setTimeAccountPeriods(nextTimeAccountPeriods);

    if (snapshotResult.error) {
      console.error("PAYROLL SNAPSHOTS LOAD ERROR:", snapshotResult.error);
      showToast({
        type: "warning",
        title: "Payroll-Snapshots konnten nicht geladen werden",
        description: snapshotResult.error.message,
      });
      setSnapshots([]);
    } else {
      const normalizedSnapshots = (snapshotResult.data || []).map(
        (snapshot: any) => ({
          ...snapshot,
          employee_name: snapshot.employees?.name ?? null,
          time_account_period:
            nextTimeAccountPeriods[snapshot.employee_id] ?? null,
        }),
      );
      setSnapshots(normalizedSnapshots as PayrollSnapshot[]);
    }

    if (auditResult.error) {
      console.log("PAYROLL AUDIT LOAD ERROR DETAILS", {
  code: auditResult.error.code,
  message: auditResult.error.message,
  details: auditResult.error.details,
  hint: auditResult.error.hint,
});
      setAuditEntries([]);
    } else {
      setAuditEntries((auditResult.data || []) as PayrollAuditEntry[]);
    }

    if (ledgerResult.error) {
      console.error("PAYROLL LEDGER LOAD ERROR:", ledgerResult.error);
      setLedgerTransactions([]);
    } else {
      const normalizedLedger = (ledgerResult.data || []).map(
        (transaction: any) => ({
          ...transaction,
          employee_name: transaction.employees?.name ?? null,
        }),
      );
      setLedgerTransactions(normalizedLedger as LedgerTransaction[]);
    }

    await loadDatevExports(periodId);
  }

  async function loadPayroll() {
    setIsLoading(true);

    try {
      const businessId = await getBusinessId();

      if (!businessId) {
        showToast({
          type: "error",
          title: "Betrieb nicht gefunden",
          description: "Die Abrechnung konnte nicht geladen werden.",
        });
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        showToast({
          type: "error",
          title: "Anmeldung erforderlich",
          description: "Bitte melde dich erneut an.",
        });
        return;
      }

      setCurrentUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        console.error("PAYROLL PROFILE LOAD ERROR:", profileError);
        showToast({
          type: "error",
          title: "Berechtigung konnte nicht geprüft werden",
          description: "Bitte lade die Seite erneut.",
        });
        return;
      }

      setCurrentUserRole(profile.role);

      await loadDatevSettings(businessId);

      const { data: periodData, error: periodError } = await supabase
        .from("payroll_periods")
        .select(`
          id,
          business_id,
          period_year,
          period_month,
          status,
          closed_at,
          closed_by,
          reopened_at,
          reopened_by,
          reopen_reason,
          created_at,
          updated_at
        `)
        .eq("business_id", businessId)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false });

      if (periodError) {
        console.error("PAYROLL PERIODS LOAD ERROR:", periodError);
        showToast({
          type: "error",
          title: "Abrechnungsperioden konnten nicht geladen werden",
          description: periodError.message,
        });
        return;
      }

      const loadedPeriods = (periodData || []) as PayrollPeriod[];
      setPeriods(loadedPeriods);

      const nextPeriodId =
        selectedPeriodId &&
        loadedPeriods.some((period) => period.id === selectedPeriodId)
          ? selectedPeriodId
          : loadedPeriods[0]?.id ?? "";

      setSelectedPeriodId(nextPeriodId);

      if (nextPeriodId) {
        await loadPeriodDetails(nextPeriodId);
      } else {
        setValidationRows([]);
        setSnapshots([]);
        setAuditEntries([]);
        setLedgerTransactions([]);
        setDatevExports([]);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadPayroll();
  }, []);

  async function handleChangePeriod(periodId: string) {
    setSelectedPeriodId(periodId);
    setDatevPreflight(null);

    if (!periodId) {
      setValidationRows([]);
      setSnapshots([]);
      setAuditEntries([]);
      setLedgerTransactions([]);
      setDatevExports([]);
      return;
    }

    setIsRefreshing(true);
    try {
      await loadPeriodDetails(periodId);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleRefresh() {
  if (!selectedPeriodId || isRefreshing) return;

  setIsRefreshing(true);
  setDatevPreflight(null);

  try {
    await loadPayroll();
  } finally {
    setIsRefreshing(false);
  }
}

  function openTargetMinutesReview(employeeId: string | null) {
    if (!employeeId) return;

    if (!canManagePayroll) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Nur Admins und Owner dürfen die Sollzeit bestätigen.",
      });
      return;
    }

    if (selectedPeriod?.status !== "open") {
      showToast({
        type: "warning",
        title: "Periode ist abgeschlossen",
        description: "Sollzeiten können nur in offenen Abrechnungsperioden bestätigt werden.",
      });
      return;
    }

    const snapshot = snapshots.find(
      (item) => item.employee_id === employeeId,
    );

    if (!snapshot) {
      showToast({
        type: "error",
        title: "Payroll-Snapshot nicht gefunden",
        description: "Die Sollzeit kann aktuell nicht geprüft werden.",
      });
      return;
    }

    setTargetReviewSnapshot(snapshot);
    setTargetReviewHours(
      ((snapshot.target_minutes ?? 0) / 60)
        .toLocaleString("de-DE", { maximumFractionDigits: 2 }),
    );
    setTargetReviewReason(snapshot.target_minutes_override_reason ?? "");
  }

  async function handleConfirmTargetMinutes() {
    if (
      !targetReviewSnapshot ||
      !currentUserId ||
      !selectedPeriod ||
      isConfirmingTargetMinutes
    ) {
      return;
    }

    const normalizedHours = targetReviewHours.trim().replace(",", ".");
    const hours = Number(normalizedHours);
    const reason = targetReviewReason.trim();

    if (!Number.isFinite(hours) || hours < 0) {
      showToast({
        type: "warning",
        title: "Ungültige Sollzeit",
        description: "Bitte gib eine gültige Sollzeit ab 0 Stunden ein.",
      });
      return;
    }

    if (!reason) {
      showToast({
        type: "warning",
        title: "Begründung erforderlich",
        description: "Bitte dokumentiere, warum diese Teilperioden-Sollzeit bestätigt wird.",
      });
      return;
    }

    const targetMinutes = Math.round(hours * 60);

    setIsConfirmingTargetMinutes(true);

    try {
      const { error } = await supabase.rpc(
        "confirm_payroll_target_minutes",
        {
          p_snapshot_id: targetReviewSnapshot.id,
          p_target_minutes: targetMinutes,
          p_reason: reason,
          p_confirmed_by: currentUserId,
        },
      );

      if (error) {
        console.error("PAYROLL TARGET MINUTES CONFIRM ERROR:", error);
        showToast({
          type: "error",
          title: "Sollzeit konnte nicht bestätigt werden",
          description: error.message,
        });
        return;
      }

      setTargetReviewSnapshot(null);
      setTargetReviewHours("");
      setTargetReviewReason("");
      setDatevPreflight(null);

      await loadPeriodDetails(selectedPeriod.id);

      showToast({
        type: "success",
        title: "Sollzeit bestätigt",
        description: `${targetReviewSnapshot.employee_name || "Mitarbeiter"}: ${formatMinutes(targetMinutes)} wurden für die Teilperiode bestätigt.`,
      });
    } finally {
      setIsConfirmingTargetMinutes(false);
    }
  }

  async function handleClosePeriod() {
    if (!selectedPeriod || !currentUserId || isClosing) return;

    if (!canManagePayroll) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description:
          "Nur Admins und Owner dürfen Abrechnungsperioden abschließen.",
      });
      return;
    }

    if (selectedPeriod.status !== "open") {
      showToast({
        type: "warning",
        title: "Periode bereits abgeschlossen",
        description:
          "Nur offene Abrechnungsperioden können abgeschlossen werden.",
      });
      return;
    }

    setIsClosing(true);

    try {
      const { data: latestValidation, error: validationError } =
        await supabase.rpc("validate_my_payroll_period_close", {
          p_payroll_period_id: selectedPeriod.id,
        });

      if (validationError) {
        console.error("PAYROLL FINAL PREFLIGHT ERROR:", validationError);
        showToast({
          type: "error",
          title: "Abschlussprüfung fehlgeschlagen",
          description: validationError.message,
        });
        return;
      }

      const latestRows = (latestValidation || []) as CloseValidationRow[];
      setValidationRows(latestRows);

      const latestBlockers = latestRows.filter((row) => !row.is_valid);

      if (latestBlockers.length > 0) {
        showToast({
          type: "warning",
          title: "Monatsabschluss blockiert",
          description: `${latestBlockers.length} Problem(e) müssen zuerst behoben werden.`,
        });
        return;
      }

      const { error: closeError } = await supabase.rpc(
        "close_payroll_period",
        {
          p_payroll_period_id: selectedPeriod.id,
          p_closed_by: currentUserId,
        },
      );

      if (closeError) {
        console.error("PAYROLL CLOSE ERROR:", closeError);
        showToast({
          type: "error",
          title: "Monat konnte nicht abgeschlossen werden",
          description: closeError.message,
        });
        return;
      }

      showToast({
        type: "success",
        title: "Monat abgeschlossen",
        description: `${formatMonth(selectedPeriod)} wurde erfolgreich abgeschlossen.`,
      });

      await loadPayroll();
    } finally {
      setIsClosing(false);
    }
  }

  function openReopenDialog() {
    if (!selectedPeriod) return;

    if (!canManagePayroll) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description:
          "Nur Admins und Owner dürfen eine Abrechnungsperiode wieder öffnen.",
      });
      return;
    }

    if (selectedPeriod.status !== "closed") {
      showToast({
        type: "warning",
        title: "Periode ist bereits offen",
        description:
          "Nur abgeschlossene Perioden können wieder geöffnet werden.",
      });
      return;
    }

    setReopenReason("");
    setShowReopenDialog(true);
  }

  async function handleReopenPeriod() {
    if (!selectedPeriod || !currentUserId || isReopening) return;

    const reason = reopenReason.trim();

    if (!reason) {
      showToast({
        type: "warning",
        title: "Grund erforderlich",
        description:
          "Bitte gib an, warum die Abrechnungsperiode wieder geöffnet werden soll.",
      });
      return;
    }

    setIsReopening(true);

    try {
      const { error } = await supabase.rpc("reopen_payroll_period", {
        p_payroll_period_id: selectedPeriod.id,
        p_reopened_by: currentUserId,
        p_reason: reason,
      });

      if (error) {
        console.error("PAYROLL REOPEN ERROR:", error);
        showToast({
          type: "error",
          title: "Periode konnte nicht geöffnet werden",
          description: error.message,
        });
        return;
      }

      setShowReopenDialog(false);
      setReopenReason("");

      showToast({
        type: "success",
        title: "Periode wieder geöffnet",
        description: `${formatMonth(selectedPeriod)} kann jetzt korrigiert und anschließend erneut abgeschlossen werden.`,
      });

      await loadPayroll();
    } finally {
      setIsReopening(false);
    }
  }

  async function handleDownloadDatevExport(datevExport: DatevExport) {
    if (downloadingExportId) return;

    if (!canManagePayroll) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Nur Admins und Owner dürfen DATEV-Dateien herunterladen.",
      });
      return;
    }

    const state = getDatevExportState(datevExport);

    if (!state.downloadable) {
      showToast({
        type: "warning",
        title: "Export ist nicht mehr gültig",
        description:
          "Die Abrechnungsperiode wurde nach diesem Export wieder geöffnet.",
      });
      return;
    }

    setDownloadingExportId(datevExport.id);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        showToast({
          type: "error",
          title: "Anmeldung erforderlich",
          description: "Bitte melde dich erneut an.",
        });
        return;
      }

      const response = await fetch(
        `/api/datev/exports/${datevExport.id}/download`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        let message = "DATEV-Datei konnte nicht heruntergeladen werden.";

        try {
          const payload = (await response.json()) as { error?: string };
          if (payload.error) message = payload.error;
        } catch {
          // Keep generic message.
        }

        showToast({
          type: "error",
          title: "DATEV-Download fehlgeschlagen",
          description: message,
        });
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = objectUrl;
      anchor.download = datevExport.file_name;
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);

      showToast({
        type: "success",
        title: "DATEV-Datei heruntergeladen",
        description: datevExport.file_name,
      });

      await loadDatevExports(datevExport.payroll_period_id);
    } catch (error) {
      console.error("DATEV DOWNLOAD ERROR:", error);
      showToast({
        type: "error",
        title: "DATEV-Download fehlgeschlagen",
        description: "Die Datei konnte nicht heruntergeladen werden.",
      });
    } finally {
      setDownloadingExportId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Abrechnung"
          description="Prüfe Abrechnungsperioden, schließe Monate ab und verwalte Korrekturen."
        />
        <StatsSkeleton />
        <Section
          title="Abrechnungsperiode"
          description="Payroll-Daten werden geladen."
        >
          <TableSkeleton rows={6} columns={7} />
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Abrechnung"
        description="Prüfe Payroll-Daten, schließe Monate kontrolliert ab und öffne sie bei notwendigen Korrekturen wieder."
        action={
          <PageActions>
            <Button
              variant="secondary"
              type="button"
              loading={isRefreshing}
              onClick={() => void handleRefresh()}
            >
              Aktualisieren
            </Button>
          </PageActions>
        }
      />

      {periods.length === 0 ? (
        <Section
          title="Keine Abrechnungsperioden"
          description="Für diesen Betrieb wurden noch keine Payroll-Perioden angelegt."
        >
          <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-12 text-center">
            <h3 className="text-xl font-semibold text-[#0F172A]">
              Noch keine Abrechnung vorhanden
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#64748B]">
              Sobald eine Payroll-Periode angelegt wurde, kannst du hier
              Abschlussprüfung, Snapshots und Monatsabschluss verwalten.
            </p>
          </div>
        </Section>
      ) : (
        <>
          <Section
            title="Abrechnungsperiode"
            description="Wähle den Monat, den du prüfen oder abschließen möchtest."
          >
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
              <Select
                label="Monat"
                value={selectedPeriodId}
                disabled={
              isRefreshing ||
              isClosing ||
              isReopening ||
              isCheckingDatev ||
              isGeneratingDatev
}
                onChange={(event) => void handleChangePeriod(event.target.value)}
                options={periods.map((period) => ({
                  value: period.id,
                  label: `${formatMonth(period)} · ${
                    period.status === "closed" ? "Abgeschlossen" : "Offen"
                  }`,
                }))}
              />

              {selectedPeriod && (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                      Status
                    </p>
                    <div className="mt-2">
                      <Badge
                        variant={
                          selectedPeriod.status === "closed"
                            ? "success"
                            : "primary"
                        }
                      >
                        {selectedPeriod.status === "closed"
                          ? "Abgeschlossen"
                          : "Offen"}
                      </Badge>
                    </div>
                  </div>

                  {selectedPeriod.status === "closed" && (
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                        Abgeschlossen am
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#0F172A]">
                        {formatDateTime(selectedPeriod.closed_at)}
                      </p>
                    </div>
                  )}

                  {selectedPeriod.reopened_at && (
                    <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#92400E]">
                        Zuletzt wieder geöffnet
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#92400E]">
                        {formatDateTime(selectedPeriod.reopened_at)}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Section>

          {selectedPeriod && (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Mitarbeiter-Snapshots" value={snapshots.length} />
                <StatCard
                  title="Valide Mitarbeiter"
                  value={validEmployees}
                  badge={
                    blockers.length === 0
                      ? "Preflight grün"
                      : `${blockers.length} Blocker`
                  }
                  badgeVariant={blockers.length === 0 ? "success" : "warning"}
                />
                <StatCard
                  title="Abrechenbare Zeit"
                  value={formatMinutes(totalAccountableMinutes)}
                />
                <StatCard
                  title="Voraussichtliches Brutto"
                  value={formatMoney(estimatedGrossTotal)}
                />
              </div>

              <Section
                title="Abschlussprüfung"
                description="Diese Prüfungen müssen vor dem Monatsabschluss erfolgreich sein."
              >
                {blockers.length === 0 ? (
                  <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="font-semibold text-[#166534]">
                          Keine Abschlussblocker gefunden
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-[#15803D]">
                          Die aktuelle Preflight-Prüfung ist erfolgreich. Beim tatsächlichen Abschluss prüft das Backend unmittelbar erneut.
                        </p>
                      </div>

                      {selectedPeriod.status === "open" && canManagePayroll && (
                        <Button
                          variant="primary"
                          type="button"
                          loading={isClosing}
                          onClick={() => void handleClosePeriod()}
                        >
                          Monat abschließen
                        </Button>
                      )}

                      {selectedPeriod.status === "closed" && canManagePayroll && (
                        <Button
                          variant="secondary"
                          type="button"
                          onClick={openReopenDialog}
                        >
                          Periode wieder öffnen
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="font-semibold text-[#991B1B]">
                            Monatsabschluss blockiert
                          </h3>
                          <p className="mt-1 text-sm text-[#B91C1C]">
                            {blockers.length === 1
                              ? "1 Problem muss zuerst behoben werden."
                              : `${blockers.length} Probleme müssen zuerst behoben werden.`}
                          </p>
                        </div>

                        {selectedPeriod.status === "closed" && canManagePayroll && (
                          <Button
                            variant="secondary"
                            type="button"
                            onClick={openReopenDialog}
                          >
                            Periode wieder öffnen
                          </Button>
                        )}
                      </div>
                    </div>

                    {blockers.map((blocker, index) => (
                      <div
                        key={`${blocker.employee_id ?? "period"}-${blocker.error_code ?? index}`}
                        className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.09)]"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="font-semibold text-[#0F172A]">
                              {blocker.employee_name ?? "Abrechnungsperiode"}
                            </p>
                            <p className="mt-1 text-sm font-medium text-[#B45309]">
                              {getValidationLabel(blocker.error_code)}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-[#64748B]">
                              {blocker.error_message}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-start gap-2 md:items-end">
                            <Badge variant="warning">Blockiert</Badge>
                            {
                              blocker.error_code === "target_minutes_requires_review" &&
                              blocker.employee_id &&
                              selectedPeriod.status === "open" &&
                              canManagePayroll && (
                                <Button
                                  variant="secondary"
                                  type="button"
                                  onClick={() =>
                                    openTargetMinutesReview(blocker.employee_id)
                                  }
                                >
                                  Sollzeit prüfen
                                </Button>
                              )
                            }
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section
                title="Export"
                description="Exportiere die zentral berechneten Payroll-Daten der ausgewählten Abrechnungsperiode für Excel."
              >
                <div className="rounded-3xl border border-[#CBD5E1] bg-[#E9EEF5] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.12)]">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-[#0F172A]">
                          Excel-Abrechnung
                        </h3>
                        <Badge variant="muted">{formatMonth(selectedPeriod)}</Badge>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#475569]">
                        Ausführliche Excel-Arbeitsmappe mit mehreren Tabellenblättern:
                        Übersicht, Mitarbeiterabrechnung, Stempelungen, Abwesenheiten,
                        Zeitkonto-Buchungen und Abrechnungsprüfung.
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      type="button"
                      disabled={snapshots.length === 0}
                      onClick={handleExcelExport}
                    >
                      Excel herunterladen
                    </Button>
                  </div>
                </div>
              </Section>

              <Section
                title="Zeitkonto-Buchungen"
                description="Ledger-Buchungen, die beim Monatsabschluss aus Payroll-Snapshots entstehen."
              >
                {ledgerTransactions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-5 py-8 text-center text-sm text-[#64748B]">
                    Für diese Periode gibt es aktuell keine Payroll-Ledgerbuchungen.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-[900px] w-full border-collapse">
                      <thead>
                        <tr className="border-b border-[#E2E8F0] text-left text-xs font-semibold uppercase tracking-[0.06em] text-[#64748B]">
                          <th className="px-3 py-3">Datum</th>
                          <th className="px-3 py-3">Mitarbeiter</th>
                          <th className="px-3 py-3">Buchung</th>
                          <th className="px-3 py-3">Minuten</th>
                          <th className="px-3 py-3">Hinweis</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerTransactions.map((transaction) => (
                          <tr
                            key={transaction.id}
                            className="border-b border-[#F1F5F9] text-sm text-[#0F172A]"
                          >
                            <td className="px-3 py-4">
                              {new Date(`${transaction.transaction_date}T00:00:00`).toLocaleDateString("de-DE")}
                            </td>
                            <td className="px-3 py-4 font-medium">
                              {transaction.employee_name || transaction.employee_id}
                            </td>
                            <td className="px-3 py-4">{transaction.transaction_type}</td>
                            <td className="px-3 py-4">{formatMinutes(transaction.minutes)}</td>
                            <td className="px-3 py-4 text-[#64748B]">{transaction.note || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              <Section
                title="Abschluss-Historie"
                description="Unveränderliche Audit-Historie für Close, Reopen und Re-Close."
              >
                {auditEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-5 py-8 text-center text-sm text-[#64748B]">
                    Für diese Periode existieren noch keine Audit-Einträge.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.09)]"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-[#0F172A]">
                                {getAuditActionLabel(entry.action)}
                              </p>
                              <Badge variant="muted">
                                {entry.previous_status || "—"} → {entry.new_status || "—"}
                              </Badge>
                            </div>
                            {entry.reason && (
                              <p className="mt-2 text-sm leading-6 text-[#475569]">
                                {entry.reason}
                              </p>
                            )}
                          </div>
                          <span className="text-sm text-[#64748B]">
                            {formatDateTime(entry.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <Section
                title="DATEV-Konfiguration"
                description="Verwalte die systemabhängigen Lohnarten und Exportoptionen für DATEV Lohn & Gehalt und DATEV LODAS."
                action={
                  <Badge variant={selectedDatevSettings?.is_active ? "success" : "warning"}>
                    {selectedDatevSettings?.is_active ? "Aktiv" : "Nicht eingerichtet"}
                  </Badge>
                }
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Select
                    label="DATEV-System"
                    value={datevPayrollSystem}
                    disabled={isSavingDatevSettings || isCheckingDatev || isGeneratingDatev}
                    onChange={(event) => {
                      setDatevPayrollSystem(event.target.value as DatevPayrollSystem);
                      setDatevPreflight(null);
                    }}
                    options={[
                      { value: "datev_lug", label: "DATEV Lohn & Gehalt" },
                      { value: "datev_lodas", label: "DATEV LODAS" },
                    ]}
                  />

                  <Input
                    label="Beraternummer"
                    value={selectedDatevSettings?.consultant_number ?? ""}
                    disabled={!canManagePayroll || isSavingDatevSettings}
                    onChange={(event) =>
                      updateSelectedDatevSettings("consultant_number", event.target.value)
                    }
                    placeholder="z. B. 9999999"
                  />

                  <Input
                    label="Mandantennummer"
                    value={selectedDatevSettings?.client_number ?? ""}
                    disabled={!canManagePayroll || isSavingDatevSettings}
                    onChange={(event) =>
                      updateSelectedDatevSettings("client_number", event.target.value)
                    }
                    placeholder="z. B. 99999"
                  />

                  <Input
                    label="Reguläre Arbeitsstunden"
                    value={selectedDatevSettings?.regular_hours_wage_type ?? ""}
                    disabled={!canManagePayroll || isSavingDatevSettings}
                    onChange={(event) =>
                      updateSelectedDatevSettings("regular_hours_wage_type", event.target.value)
                    }
                    placeholder="z. B. 1000"
                  />

                  <Input
                    label="Minijob-Arbeitsstunden"
                    value={selectedDatevSettings?.minijob_hours_wage_type ?? ""}
                    disabled={!canManagePayroll || isSavingDatevSettings}
                    onChange={(event) =>
                      updateSelectedDatevSettings("minijob_hours_wage_type", event.target.value)
                    }
                    placeholder="z. B. 1001"
                  />

                  <Input
                    label="Stundenzulage"
                    value={selectedDatevSettings?.hourly_allowance_wage_type ?? ""}
                    disabled={!canManagePayroll || isSavingDatevSettings}
                    onChange={(event) =>
                      updateSelectedDatevSettings("hourly_allowance_wage_type", event.target.value)
                    }
                    placeholder="z. B. 1300"
                  />

                  <Input
                    label="Urlaubsstunden"
                    value={selectedDatevSettings?.vacation_hours_wage_type ?? ""}
                    disabled={!canManagePayroll || isSavingDatevSettings}
                    onChange={(event) =>
                      updateSelectedDatevSettings("vacation_hours_wage_type", event.target.value)
                    }
                    placeholder="z. B. 1100"
                  />

                  <Input
                    label="Krankheitsstunden"
                    value={selectedDatevSettings?.sick_hours_wage_type ?? ""}
                    disabled={!canManagePayroll || isSavingDatevSettings}
                    onChange={(event) =>
                      updateSelectedDatevSettings("sick_hours_wage_type", event.target.value)
                    }
                    placeholder="z. B. 1200"
                  />

                  <Input
                    label="Überstunden"
                    value={selectedDatevSettings?.overtime_wage_type ?? ""}
                    disabled={!canManagePayroll || isSavingDatevSettings}
                    onChange={(event) =>
                      updateSelectedDatevSettings("overtime_wage_type", event.target.value)
                    }
                    placeholder="z. B. 1300"
                  />

                  <Select
                    label="Stundenlohn exportieren"
                    value={selectedDatevSettings?.export_hourly_rate ? "yes" : "no"}
                    disabled={!canManagePayroll || isSavingDatevSettings}
                    onChange={(event) =>
                      updateSelectedDatevSettings("export_hourly_rate", event.target.value === "yes")
                    }
                    options={[
                      { value: "yes", label: "Ja" },
                      { value: "no", label: "Nein" },
                    ]}
                  />

                  <Select
                    label="Zuschlagsprozentsatz exportieren"
                    value={selectedDatevSettings?.export_surcharge_percentage ? "yes" : "no"}
                    disabled={!canManagePayroll || isSavingDatevSettings}
                    onChange={(event) =>
                      updateSelectedDatevSettings(
                        "export_surcharge_percentage",
                        event.target.value === "yes",
                      )
                    }
                    options={[
                      { value: "yes", label: "Ja" },
                      { value: "no", label: "Nein" },
                    ]}
                  />

                  <Select
                    label="Kostenstelle exportieren"
                    value={selectedDatevSettings?.export_cost_center ? "yes" : "no"}
                    disabled={!canManagePayroll || isSavingDatevSettings}
                    onChange={(event) =>
                      updateSelectedDatevSettings("export_cost_center", event.target.value === "yes")
                    }
                    options={[
                      { value: "yes", label: "Ja" },
                      { value: "no", label: "Nein" },
                    ]}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-[#E2E8F0] pt-5 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm leading-6 text-[#64748B]">
                    Die Lohnarten werden getrennt für das aktuell ausgewählte DATEV-System gespeichert. Änderungen machen eine bereits durchgeführte DATEV-Prüfung ungültig.
                  </p>

                  {canManagePayroll && (
                    <Button
                      variant="primary"
                      type="button"
                      loading={isSavingDatevSettings}
                      disabled={!selectedDatevSettings || isCheckingDatev || isGeneratingDatev}
                      onClick={() => void handleSaveDatevSettings()}
                    >
                      DATEV-Konfiguration speichern
                    </Button>
                  )}
                </div>
              </Section>

              <Section
  title={
    datevPayrollSystem === "datev_lug"
      ? "DATEV Lohn & Gehalt"
      : "DATEV LODAS"
  }
  description={
    datevPayrollSystem === "datev_lug"
      ? "Prüfe den geschlossenen Abrechnungszeitraum für DATEV Lohn & Gehalt und verwalte die unveränderliche Exporthistorie."
      : "Prüfe den geschlossenen Abrechnungszeitraum für DATEV LODAS und verwalte die unveränderliche Exporthistorie."
  }
>
                <div className="mb-5 rounded-3xl border border-[#CBD5E1] bg-[#E9EEF5] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.12)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="w-full max-w-sm">
  <Select
    label="DATEV-System"
    value={datevPayrollSystem}
    disabled={isCheckingDatev || isGeneratingDatev}
    onChange={(event) => {
      const nextSystem = event.target.value as DatevPayrollSystem;

      setDatevPayrollSystem(nextSystem);
      setDatevPreflight(null);
    }}
    options={[
      {
        value: "datev_lug",
        label: "DATEV Lohn & Gehalt",
      },
      {
        value: "datev_lodas",
        label: "DATEV LODAS",
      },
    ]}
  />
</div>

                    {canManagePayroll && (
                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="secondary"
                          type="button"
                          loading={isCheckingDatev}
                          disabled={isCheckingDatev || isGeneratingDatev}
                          onClick={() => void handleCheckDatev()}
                        >
                          DATEV prüfen
                        </Button>

                        <Button
                          variant="primary"
                          type="button"
                          loading={isGeneratingDatev}
                          disabled={
                          isGeneratingDatev ||
                          isCheckingDatev ||
                          selectedPeriod.status !== "closed" ||
                          !datevPreflight?.isValid ||
                          datevPreflight.payrollSystem !== datevPayrollSystem ||
                          datevPreflight.payrollPeriodId !== selectedPeriod.id
                        }
                          onClick={() => void handleGenerateDatevExport()}
                        >
                          DATEV-Export erstellen
                        </Button>
                      </div>
                    )}
                  </div>

                  {datevPreflight && (
                    <div className="mt-4">
                      {datevPreflight.isValid ? (
                        <div className="rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="success">DATEV-Prüfung erfolgreich</Badge>
                            {datevPreflight.periodStatus && (
                              <Badge variant="muted">
                                Periode: {datevPreflight.periodStatus}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#15803D]">
  {datevPayrollSystem === "datev_lug"
    ? "Der aktuelle Stand erfüllt die serverseitige DATEV Lohn & Gehalt-Prüfung. Der Export kann jetzt erstellt werden."
    : "Der aktuelle Stand erfüllt die serverseitige DATEV LODAS-Prüfung. Der Export kann jetzt erstellt werden."}
</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4">
                            <Badge variant="warning">DATEV-Prüfung nicht bestanden</Badge>
                            <p className="mt-2 text-sm leading-6 text-[#B91C1C]">
                              {datevPreflight.error ||
                                "Mindestens eine DATEV-Prüfung ist fehlgeschlagen."}
                            </p>
                          </div>

                          {(datevPreflight.results || [])
                            .filter((row) => !row.is_valid)
                            .map((row, index) => (
                              <div
                                key={`${row.employee_id ?? "period"}-${row.source_id ?? "source"}-${row.error_code ?? index}`}
                                className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.09)]"
                              >
                                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <p className="font-semibold text-[#0F172A]">
                                      {row.error_code || "DATEV-Prüfung"}
                                    </p>
                                    <p className="mt-1 text-sm leading-6 text-[#64748B]">
                                      {row.message || "Keine weitere Beschreibung verfügbar."}
                                    </p>
                                    {row.employee_id && (
                                      <p className="mt-2 text-xs text-[#94A3B8]">
                                        Mitarbeiter-ID: {row.employee_id}
                                      </p>
                                    )}
                                  </div>
                                  <Badge variant="warning">Blockiert</Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {datevExports.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-5 py-8 text-center">
                    <p className="font-semibold text-[#0F172A]">
                      Noch kein DATEV-Export vorhanden
                    </p>
                    <p className="mt-2 text-sm text-[#64748B]">
                      Führe die DATEV-Prüfung durch und erstelle anschließend die erste Exportversion für diese Periode.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {datevExports.map((datevExport) => {
                      const state = getDatevExportState(datevExport);
                      const downloadCount = datevExport.events.filter(
                        (event) => event.event_type === "downloaded",
                      ).length;

                      return (
                        <div
                          key={datevExport.id}
                          className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.09)]"
                        >
                          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="break-all font-semibold text-[#0F172A]">
                                  {datevExport.file_name}
                                </h3>
                                <Badge variant={state.variant}>{state.label}</Badge>

                                <Badge variant="muted">
                                  {datevExport.payroll_system === "datev_lug"
                                    ? "Lohn & Gehalt"
                                    : "LODAS"}
                                </Badge>

                                <Badge variant="muted">
                                  Version {datevExport.export_version}
                                </Badge>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[#64748B]">
                                <span>
                                  Erstellt: {formatDateTime(datevExport.generated_at)}
                                </span>
                                <span>
                                  {datevExport.encoding_name} · {datevExport.line_ending}
                                </span>
                                <span>{datevExport.line_count} Zeilen</span>
                                <span>{downloadCount} Download(s)</span>
                              </div>

                              <p className="mt-3 break-all text-xs text-[#64748B]">
                                SHA-256:{" "}
                                <span className="font-mono">
                                  {datevExport.payload_sha256}
                                </span>
                              </p>
                            </div>

                            {canManagePayroll && (
                              <Button
                                variant="secondary"
                                type="button"
                                disabled={!state.downloadable}
                                loading={downloadingExportId === datevExport.id}
                                onClick={() =>
                                  void handleDownloadDatevExport(datevExport)
                                }
                              >
                                Datei herunterladen
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Section>
            </>
          )}
        </>
      )}


      {targetReviewSnapshot && selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="border-b border-[#E2E8F0] px-6 py-5">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
                Sollzeit der Teilperiode prüfen
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {targetReviewSnapshot.employee_name || targetReviewSnapshot.employee_id} · {formatMonth(selectedPeriod)}
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
                <p className="text-sm leading-6 text-[#92400E]">
                  Der Mitarbeiter war nur während eines Teils dieser Abrechnungsperiode beschäftigt. Prüfe die automatisch berechnete Sollzeit und bestätige sie oder korrigiere sie vor dem Monatsabschluss.
                </p>
              </div>

              <Input
                label="Sollzeit der Teilperiode (Stunden)"
                value={targetReviewHours}
                disabled={isConfirmingTargetMinutes}
                onChange={(event) => setTargetReviewHours(event.target.value)}
                placeholder="z. B. 80"
                inputMode="decimal"
              />

              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569]">
                Aktuell im Snapshot: <span className="font-semibold text-[#0F172A]">{formatMinutes(targetReviewSnapshot.target_minutes)}</span>
              </div>

              <Textarea
                value={targetReviewReason}
                disabled={isConfirmingTargetMinutes}
                onChange={(event) => setTargetReviewReason(event.target.value)}
                placeholder="Begründung, z. B. Beschäftigungsbeginn am 09.08.2026 geprüft; berechnete Teilperioden-Sollzeit bestätigt."
                className="min-h-28"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#E2E8F0] px-6 py-5 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                type="button"
                disabled={isConfirmingTargetMinutes}
                onClick={() => {
                  setTargetReviewSnapshot(null);
                  setTargetReviewHours("");
                  setTargetReviewReason("");
                }}
              >
                Abbrechen
              </Button>

              <Button
                variant="primary"
                type="button"
                loading={isConfirmingTargetMinutes}
                onClick={() => void handleConfirmTargetMinutes()}
              >
                Sollzeit bestätigen
              </Button>
            </div>
          </div>
        </div>
      )}

      {showReopenDialog && selectedPeriod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="border-b border-[#E2E8F0] px-6 py-5">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
                Abrechnungsperiode wieder öffnen
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {formatMonth(selectedPeriod)}
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
                <p className="text-sm leading-6 text-[#92400E]">
                  Beim Wiederöffnen werden die automatisch erzeugten Payroll-Ledgerbuchungen dieser Periode entfernt. Manuelle Korrekturbuchungen bleiben erhalten. Bestehende DATEV-Exporte werden dabei unveränderlich als ungültig markiert. Der Vorgang wird protokolliert.
                </p>
              </div>

              <Textarea
                value={reopenReason}
                disabled={isReopening}
                onChange={(event) => setReopenReason(event.target.value)}
                placeholder="Warum muss die Abrechnungsperiode korrigiert werden?"
                className="min-h-32"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#E2E8F0] px-6 py-5 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                type="button"
                disabled={isReopening}
                onClick={() => {
                  setShowReopenDialog(false);
                  setReopenReason("");
                }}
              >
                Abbrechen
              </Button>

              <Button
                variant="primary"
                type="button"
                loading={isReopening}
                onClick={() => void handleReopenPeriod()}
              >
                Periode wieder öffnen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

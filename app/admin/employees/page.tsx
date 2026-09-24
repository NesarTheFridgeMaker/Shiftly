"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

import DiperaPopup from "@/components/DiperaPopup";

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
import { FaWhatsapp } from "react-icons/fa";
import EmployeeInviteCard from "@/components/employees/EmployeeInviteCard";
import EmployeeDocumentsCard from "@/components/employees/EmployeeDocumentsCard";

type LocationTrackingMode = "required" | "remote_allowed" | "disabled";
type EmploymentScope = "full_time" | "part_time";
type EmploymentType =
  | "regular"
  | "minijob"
  | "working_student"
  | "trainee"
  | "short_term"
  | "intern";
type WageType = "hourly" | "fixed_hourly" | "salary";

type AbsenceCalculationType =
  | "fixed"
  | "daily_average_13_weeks"
  | "weekly_average_13_weeks"
  | "three_month_average"
  | "twelve_month_average";

type TimeAccountPeriod = "none" | "weekly" | "monthly";

type PositiveBalanceHandling =
  | "carry"
  | "payout"
  | "payout_with_limit";

type NegativeBalanceHandling = "carry" | "ignore";
type WorkdayPattern = "fixed" | "schedule_based";
type ThreeMonthAverageBasis =
  | "possible_workdays"
  | "social_security_days";

type EmployeeTimeAccountSettings = {
  id: string;
  employee_id: string;

  absence_calculation_type: AbsenceCalculationType;
  fixed_absence_hours: number | null;
  prefer_scheduled_shift_for_absence: boolean;
  absence_start_minutes: number | null;
  cap_dynamic_absence_minutes: boolean;
  dynamic_absence_cap_minutes: number | null;
  three_month_average_basis: ThreeMonthAverageBasis | null;

  time_account_period: TimeAccountPeriod;

  positive_balance_handling: PositiveBalanceHandling;
  payout_limit_hours: number | null;

  negative_balance_handling: NegativeBalanceHandling;

  opening_balance_hours: number;

  created_at: string;
  updated_at: string;
};

type Employee = {
  id: string;
  name: string;
  role: string;
  pin: string;
  status: string;
  account_status: string;
  hours: string;
  vacation_days_per_year: number;
  work_days_per_week: number;
  workday_pattern?: WorkdayPattern | null;
  wage_type?: WageType;
  hourly_rate?: number | null;
  hourly_allowance_rate?: number | null;
  monthly_salary?: number | null;
  overtime_hourly_rate?: number | null;
  datev_personnel_number?: string | null;
  cost_center?: string | null;
  eligible_for_surcharges?: boolean;
  birth_date?: string | null;
  employment_start_date?: string | null;
  employment_end_date?: string | null;
  employment_scope?: EmploymentScope | null;
  employment_type?: EmploymentType | null;

  location_tracking_mode: LocationTrackingMode;
  location_tracking_note: string | null;
};

type EmployeeRegularWorkday = {
  employee_id: string;
  iso_weekday: number;
};

type EmployeeTargetHour = {
  id: string;
  employee_id: string;
  weekly_hours: number;
  monthly_hours: number;
};

type EmployeeNote = {
  id: string;
  employee_id: string;
  note: string;
  created_at: string;
};

type EmployeeInvite = {
  id: string;
  employee_id: string;
  business_id: string;
  invite_code: string;
  email: string | null;
  delivery_method: "email" | "whatsapp";
  auth_user_id: string | null;
  claimed_at: string | null;
  used_at: string | null;
};

type EmployeeWithTargetHours = Employee & {
  weekly_target_hours: number;
  monthly_target_hours: number;
  notes: EmployeeNote[];
  invite: EmployeeInvite | null;
  time_account_settings: EmployeeTimeAccountSettings | null;
  regular_workdays: number[];
};

type CreatedEmployeeInvite = {
  employeeId: string;
  employeeName: string;
  inviteCode: string;
  email: string | null;
  deliveryMethod: "email" | "whatsapp";
};



const WEEKDAY_OPTIONS = [
  { value: 1, label: "Mo" },
  { value: 2, label: "Di" },
  { value: 3, label: "Mi" },
  { value: 4, label: "Do" },
  { value: 5, label: "Fr" },
  { value: 6, label: "Sa" },
  { value: 7, label: "So" },
] as const;

const DYNAMIC_ABSENCE_TYPES: AbsenceCalculationType[] = [
  "daily_average_13_weeks",
  "weekly_average_13_weeks",
  "three_month_average",
  "twelve_month_average",
];

function isDynamicAbsenceType(type: AbsenceCalculationType) {
  return DYNAMIC_ABSENCE_TYPES.includes(type);
}

function numberArraysEqual(first: number[], second: number[]) {
  if (first.length !== second.length) return false;

  const normalizedFirst = [...first].sort((a, b) => a - b);
  const normalizedSecond = [...second].sort((a, b) => a - b);

  return normalizedFirst.every(
    (value, index) => value === normalizedSecond[index],
  );
}

function formatNoteDate(dateString: string) {
  return new Date(dateString).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateInviteCode() {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `DIPERA-${randomPart}`;
}

function getEmployeeInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "MA";
}

function formatEmployeeDate(value?: string | null) {
  if (!value) return "–";
  return new Date(`${value}T00:00:00`).toLocaleDateString("de-DE");
}

function formatEmployeeMoney(value?: number | null) {
  if (value === null || value === undefined) return "–";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(value);
}

function employmentScopeLabel(value?: EmploymentScope | null) {
  if (value === "full_time") return "Vollzeit";
  if (value === "part_time") return "Teilzeit";
  return "–";
}

type EmployeeDetailIconName =
  | "calendar"
  | "badge"
  | "user"
  | "clock"
  | "wallet"
  | "vacation";

function EmployeeDetailIcon({ name }: { name: EmployeeDetailIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8FAFC] text-[#64748B]">
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
        {name === "calendar" && (
          <><path d="M7 3v3M17 3v3M4 9h16" {...common} /><rect x="4" y="5" width="16" height="16" rx="3" {...common} /></>
        )}
        {name === "badge" && (
          <><path d="M12 3 5 6v6c0 4.4 2.8 7.2 7 9 4.2-1.8 7-4.6 7-9V6l-7-3Z" {...common} /><path d="M9.5 12h5M12 9.5v5" {...common} /></>
        )}
        {name === "user" && (
          <><circle cx="12" cy="8" r="3.5" {...common} /><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6" {...common} /></>
        )}
        {name === "clock" && (
          <><circle cx="12" cy="12" r="8.5" {...common} /><path d="M12 7.5V12l3 2" {...common} /></>
        )}
        {name === "wallet" && (
          <><path d="M4 7.5h14.5A1.5 1.5 0 0 1 20 9v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.5Z" {...common} /><path d="M5.5 7.5 16 4.5v3M15.5 12h4.5v3h-4.5a1.5 1.5 0 0 1 0-3Z" {...common} /></>
        )}
        {name === "vacation" && (
          <><path d="M5 20h14M7 17c1.5-4 3.2-6.8 5-9 1.8 2.2 3.5 5 5 9" {...common} /><path d="M9 9c1.5-2.7 3.5-4.4 6-5-.2 2.6-1.2 4.6-3 6" {...common} /></>
        )}
      </svg>
    </span>
  );
}

export default function EmployeesPage() {

  
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<EmployeeWithTargetHours[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showInactiveEmployees, setShowInactiveEmployees] = useState(false);
  const [expandedEmployeeId, setExpandedEmployeeId] =
  useState<string | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeDetailTab, setEmployeeDetailTab] = useState<"overview" | "documents" | "notes">("overview");
  const EMPLOYEES_PER_PAGE = 12;
  const [visibleEmployeeCount, setVisibleEmployeeCount] =
  useState(EMPLOYEES_PER_PAGE);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [createdEmployeeInvite, setCreatedEmployeeInvite] =
    useState<CreatedEmployeeInvite | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSendingInviteEmail, setIsSendingInviteEmail] = useState(false);
  const [isCopyingInviteLink, setIsCopyingInviteLink] = useState(false);
  const [isCopyingInviteCode, setIsCopyingInviteCode] = useState(false);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Mitarbeiter");
  const [pin, setPin] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [employmentStartDate, setEmploymentStartDate] = useState("");
  const [employmentEndDate, setEmploymentEndDate] = useState("");

  const [employmentScope, setEmploymentScope] = useState<EmploymentScope>("full_time");

  const [employmentType, setEmploymentType] = useState<EmploymentType>("regular");
  const [monthlyHours, setMonthlyHours] = useState("173");
  const [weeklyHours, setWeeklyHours] = useState("40");
  const [vacationDays, setVacationDays] = useState("");
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState("5");
  const [newWorkdayPattern, setNewWorkdayPattern] =
    useState<WorkdayPattern>("schedule_based");
  const [newRegularWorkdays, setNewRegularWorkdays] = useState<number[]>([]);

  const [newEmployeeEligibleForSurcharges, setNewEmployeeEligibleForSurcharges] =
    useState(true);
  const [newEmployeeOvertimeHourlyRate, setNewEmployeeOvertimeHourlyRate] =
    useState("");

  const [newAbsenceCalculationType, setNewAbsenceCalculationType] =
    useState<AbsenceCalculationType>("daily_average_13_weeks");
  const [newFixedAbsenceHours, setNewFixedAbsenceHours] = useState("");
  const [newPreferScheduledShiftForAbsence, setNewPreferScheduledShiftForAbsence] =
    useState(true);
  const [newAbsenceStartMinutes, setNewAbsenceStartMinutes] = useState("0");
  const [newCapDynamicAbsenceMinutes, setNewCapDynamicAbsenceMinutes] =
    useState(false);
  const [newDynamicAbsenceCapMinutes, setNewDynamicAbsenceCapMinutes] =
    useState("");
  const [newThreeMonthAverageBasis, setNewThreeMonthAverageBasis] =
    useState<ThreeMonthAverageBasis>("possible_workdays");
  const [newTimeAccountPeriod, setNewTimeAccountPeriod] =
    useState<TimeAccountPeriod>("monthly");
  const [newPositiveBalanceHandling, setNewPositiveBalanceHandling] =
    useState<PositiveBalanceHandling>("carry");
  const [newPayoutLimitHours, setNewPayoutLimitHours] = useState("");
  const [newNegativeBalanceHandling, setNewNegativeBalanceHandling] =
    useState<NegativeBalanceHandling>("carry");
  const [newOpeningBalanceHours, setNewOpeningBalanceHours] = useState("0");

  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const [showEmployeeLimitPopup, setShowEmployeeLimitPopup] = useState(false);
  const [employeeLimit, setEmployeeLimit] = useState<number | null>(null);
  const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false);

  const [newEmployeeWageType, setNewEmployeeWageType] = useState<WageType>("hourly");

  const [newEmployeeHourlyRate, setNewEmployeeHourlyRate] = useState("");
  const [newEmployeeHourlyAllowanceRate, setNewEmployeeHourlyAllowanceRate] =
    useState("");
  const [newEmployeeMonthlySalary, setNewEmployeeMonthlySalary] = useState("");
  const [newEmployeeDatevPersonnelNumber, setNewEmployeeDatevPersonnelNumber] =
    useState("");
  const [newEmployeeCostCenter, setNewEmployeeCostCenter] = useState("");

  const [editingPayrollEmployee, setEditingPayrollEmployee] =
    useState<EmployeeWithTargetHours | null>(null);

  const [editWageType, setEditWageType] = useState<WageType>("hourly");

  const [editHourlyRate, setEditHourlyRate] = useState("");
  const [editHourlyAllowanceRate, setEditHourlyAllowanceRate] = useState("");
  const [editMonthlySalary, setEditMonthlySalary] = useState("");
  const [editDatevPersonnelNumber, setEditDatevPersonnelNumber] = useState("");
  const [editCostCenter, setEditCostCenter] = useState("");

  const [editBirthDate, setEditBirthDate] = useState("");
  const [editEmploymentStartDate, setEditEmploymentStartDate] = useState("");
  const [editEmploymentEndDate, setEditEmploymentEndDate] = useState("");
  const [editEmploymentScope, setEditEmploymentScope] =
    useState<EmploymentScope>("full_time");
  const [editEmploymentType, setEditEmploymentType] =
    useState<EmploymentType>("regular");
  const [editWeeklyHours, setEditWeeklyHours] = useState("");
  const [editMonthlyHours, setEditMonthlyHours] = useState("");
  const [editVacationDays, setEditVacationDays] = useState("");
  const [editWorkDaysPerWeek, setEditWorkDaysPerWeek] = useState("");
  const [editWorkdayPattern, setEditWorkdayPattern] =
    useState<WorkdayPattern>("schedule_based");
  const [editRegularWorkdays, setEditRegularWorkdays] = useState<number[]>([]);
  const [editOvertimeHourlyRate, setEditOvertimeHourlyRate] = useState("");

  const [editAbsenceCalculationType, setEditAbsenceCalculationType] =
  useState<AbsenceCalculationType>("daily_average_13_weeks");

const [editFixedAbsenceHours, setEditFixedAbsenceHours] = useState("");
const [editAbsenceStartMinutes, setEditAbsenceStartMinutes] = useState("");
const [editCapDynamicAbsenceMinutes, setEditCapDynamicAbsenceMinutes] =
  useState(false);
const [editDynamicAbsenceCapMinutes, setEditDynamicAbsenceCapMinutes] =
  useState("");
const [editThreeMonthAverageBasis, setEditThreeMonthAverageBasis] =
  useState<ThreeMonthAverageBasis>("possible_workdays");

const [
  editPreferScheduledShiftForAbsence,
  setEditPreferScheduledShiftForAbsence,
] = useState(true);

const [editTimeAccountPeriod, setEditTimeAccountPeriod] =
  useState<TimeAccountPeriod>("monthly");

const [
  editPositiveBalanceHandling,
  setEditPositiveBalanceHandling,
] = useState<PositiveBalanceHandling>("carry");

const [editPayoutLimitHours, setEditPayoutLimitHours] = useState("");

const [
  editNegativeBalanceHandling,
  setEditNegativeBalanceHandling,
] = useState<NegativeBalanceHandling>("carry");

const [editOpeningBalanceHours, setEditOpeningBalanceHours] = useState("0");

  const [unsavedMonthlyHours, setUnsavedMonthlyHours] = useState<
    Record<string, boolean>
  >({});

  const [editEligibleForSurcharges, setEditEligibleForSurcharges] =
    useState(true);

  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [noteTexts, setNoteTexts] = useState<Record<string, string>>({});

  const [editingLocationEmployee, setEditingLocationEmployee] =
    useState<EmployeeWithTargetHours | null>(null);

  const [editLocationTrackingMode, setEditLocationTrackingMode] =
    useState<LocationTrackingMode>("required");

  const [editLocationTrackingNote, setEditLocationTrackingNote] = useState("");

  const [isSavingLocationTracking, setIsSavingLocationTracking] =
    useState(false);
  const [isSavingPayroll, setIsSavingPayroll] = useState(false);
  const [showEmploymentImpactPopup, setShowEmploymentImpactPopup] =
    useState(false);
  const [employmentImpactCount, setEmploymentImpactCount] = useState(0);

  async function refreshOpenPayrollSnapshotsForTargetChange(
    employeeId: string,
  ) {
    const { data, error } = await supabase.rpc(
      "refresh_open_payroll_snapshots_for_employee_target_change",
      {
        p_employee_id: employeeId,
      },
    );

    if (error) {
      console.error("PAYROLL TARGET REFRESH ERROR:", error);
      throw error;
    }

    return Number(data ?? 0);
  }

  async function loadEmployees() {
    setIsLoading(true);

    try {
      const businessId = await getBusinessId();

      if (!businessId) {
        console.error("Keine Business-ID gefunden.");
        showToast({
          type: "error",
          title: "Betrieb nicht gefunden",
          description: "Die Mitarbeiter konnten nicht geladen werden.",
        });
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error("Kein Benutzer gefunden.");
        showToast({
          type: "error",
          title: "Benutzer nicht gefunden",
          description: "Bitte melde dich erneut an.",
        });
        return;
      }

      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || !currentProfile) {
        console.error(profileError);
        showToast({
          type: "error",
          title: "Profil konnte nicht geladen werden",
          description: "Bitte versuche es erneut.",
        });
        return;
      }

      setCurrentUserRole(currentProfile.role);

      const { data: employeeData, error: employeeError } = await supabase
        .from("employees")
        .select(
          "id, name, role, pin, status, account_status, hours, vacation_days_per_year, work_days_per_week, workday_pattern, wage_type, hourly_rate, hourly_allowance_rate, monthly_salary, overtime_hourly_rate, datev_personnel_number, cost_center, eligible_for_surcharges, birth_date, employment_start_date, employment_end_date, employment_scope, employment_type, location_tracking_mode, location_tracking_note",
        )
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (employeeError) {
        console.error(employeeError);
        showToast({
          type: "error",
          title: "Mitarbeiter konnten nicht geladen werden",
          description: employeeError.message,
        });
        return;
      }

      const employeeIds = (employeeData || []).map((employee) => employee.id);

      let targetHours: EmployeeTargetHour[] = [];
      let notes: EmployeeNote[] = [];
      let invites: EmployeeInvite[] = [];
      let timeAccountSettings: EmployeeTimeAccountSettings[] = [];
      let regularWorkdays: EmployeeRegularWorkday[] = [];

      if (employeeIds.length > 0) {
        const { data: targetData, error: targetError } = await supabase
          .from("employee_target_hours")
          .select("id, employee_id, weekly_hours, monthly_hours")
          .in("employee_id", employeeIds);

        if (targetError) {
          console.error(targetError);
          showToast({
            type: "warning",
            title: "Sollstunden konnten nicht geladen werden",
            description: "Die Mitarbeiter werden trotzdem angezeigt.",
          });
        } else {
          targetHours = (targetData || []) as EmployeeTargetHour[];
        }

        const {
  data: timeAccountSettingsData,
  error: timeAccountSettingsError,
} = await supabase
  .from("employee_time_account_settings")
  .select(`
    id,
    employee_id,
    absence_calculation_type,
    fixed_absence_hours,
    prefer_scheduled_shift_for_absence,
    absence_start_minutes,
    cap_dynamic_absence_minutes,
    dynamic_absence_cap_minutes,
    three_month_average_basis,
    time_account_period,
    positive_balance_handling,
    payout_limit_hours,
    negative_balance_handling,
    opening_balance_hours,
    created_at,
    updated_at
  `)
  .in("employee_id", employeeIds);

if (timeAccountSettingsError) {
  console.error(timeAccountSettingsError);

  showToast({
    type: "warning",
    title: "Arbeitszeitkonto-Einstellungen konnten nicht geladen werden",
    description: "Die Mitarbeiter werden trotzdem angezeigt.",
  });
} else {
  timeAccountSettings =
    (timeAccountSettingsData || []) as EmployeeTimeAccountSettings[];
}

        const { data: regularWorkdayData, error: regularWorkdayError } =
          await supabase
            .from("employee_regular_workdays")
            .select("employee_id, iso_weekday")
            .in("employee_id", employeeIds);

        if (regularWorkdayError) {
          console.error(regularWorkdayError);
          showToast({
            type: "warning",
            title: "Regelmäßige Arbeitstage konnten nicht geladen werden",
            description: "Die Mitarbeiter werden trotzdem angezeigt.",
          });
        } else {
          regularWorkdays =
            (regularWorkdayData || []) as EmployeeRegularWorkday[];
        }

        const { data: notesData, error: notesError } = await supabase
          .from("employee_notes")
          .select("id, employee_id, note, created_at")
          .eq("business_id", businessId)
          .in("employee_id", employeeIds)
          .order("created_at", { ascending: false });

        if (notesError) {
          console.error(notesError);
          showToast({
            type: "warning",
            title: "Notizen konnten nicht geladen werden",
            description: "Die Mitarbeiter werden trotzdem angezeigt.",
          });
        } else {
          notes = (notesData || []) as EmployeeNote[];
        }

        const { data: inviteData, error: inviteError } = await supabase
  .from("employee_invites")
  .select(`
    id,
    employee_id,
    business_id,
    invite_code,
    email,
    delivery_method,
    auth_user_id,
    claimed_at,
    used_at
  `)
  .eq("business_id", businessId)
  .in("employee_id", employeeIds)
  .order("created_at", { ascending: false });

        if (inviteError) {
          console.error(inviteError);
          showToast({
            type: "warning",
            title: "Einladungen konnten nicht geladen werden",
            description: "Die Mitarbeiter werden trotzdem angezeigt.",
          });
        } else {
          invites = (inviteData || []) as EmployeeInvite[];
        }
      }

      const employeesWithData = (employeeData || []).map((employee) => {
        const target = targetHours.find(
          (targetHour) => targetHour.employee_id === employee.id,
        );

        const timeAccountSetting = timeAccountSettings.find(
          (setting) => setting.employee_id === employee.id,
        );

        const employeeNotes = notes.filter(
          (note) => note.employee_id === employee.id,
        );

        const employeeInvites = invites.filter(
          (inviteItem) => inviteItem.employee_id === employee.id,
        );

        const invite =
          employeeInvites.find((inviteItem) => !inviteItem.used_at) ??
          employeeInvites[0] ??
          null;

        return {
          ...employee,
          weekly_target_hours: target?.weekly_hours ?? 40,
          monthly_target_hours: target?.monthly_hours ?? 173,
          notes: employeeNotes,
          invite,
          time_account_settings: timeAccountSetting ?? null,
          regular_workdays: regularWorkdays
            .filter((item) => item.employee_id === employee.id)
            .map((item) => item.iso_weekday)
            .sort((a, b) => a - b),
        };
      });

      setEmployees(employeesWithData);
    } finally {
      setIsLoading(false);
    }
  }

  const canEditPayroll = currentUserRole === "owner";
  const canEditLocationTracking =
    currentUserRole === "owner" || currentUserRole === "admin";

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
  setVisibleEmployeeCount(EMPLOYEES_PER_PAGE);
  setExpandedEmployeeId(null);
}, [employeeSearch]);


  async function handleOpenBillingPortal() {
    if (isOpeningBillingPortal) return;

    setIsOpeningBillingPortal(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        showToast({
          type: "error",
          title: "Anmeldung abgelaufen",
          description: "Bitte melde dich erneut an.",
        });
        return;
      }

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        showToast({
          type: "error",
          title: "Abo-Verwaltung konnte nicht geöffnet werden",
          description: data.error || "Bitte versuche es erneut.",
        });
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error("OPEN BILLING PORTAL ERROR:", error);

      showToast({
        type: "error",
        title: "Abo-Verwaltung konnte nicht geöffnet werden",
        description: "Bitte versuche es erneut.",
      });
    } finally {
      setIsOpeningBillingPortal(false);
    }
  }

  async function handleAddEmployee() {
    if (isSaving) return;

    setIsSaving(true);

    try {
      const employeeName = name.trim();
      const employeePin = pin.trim();

      if (!birthDate) {
  showToast({
    type: "warning",
    title: "Geburtsdatum fehlt",
    description: "Bitte gib das Geburtsdatum des Mitarbeiters ein.",
  });

  return;
}

if (!employmentStartDate) {
  showToast({
    type: "warning",
    title: "Eintrittsdatum fehlt",
    description: "Bitte gib das Eintrittsdatum des Mitarbeiters ein.",
  });

  return;
}

if (
  employmentEndDate &&
  employmentEndDate < employmentStartDate
) {
  showToast({
    type: "warning",
    title: "Ungültiges Austrittsdatum",
    description:
      "Das Austrittsdatum darf nicht vor dem Eintrittsdatum liegen.",
  });

  return;
}

      if (!employeeName || !employeePin) {
        showToast({
          type: "warning",
          title: "Angaben fehlen",
          description: "Bitte gib Name und PIN ein.",
        });
        return;
      }

      if (!/^\d{4}$/.test(employeePin)) {
        showToast({
          type: "warning",
          title: "Ungültige PIN",
          description: "Die PIN muss genau 4 Zahlen haben.",
        });
        return;
      }

      const parsedWeeklyHours = Number(weeklyHours.replace(",", "."));
      const parsedMonthlyHours = Number(monthlyHours.replace(",", "."));

      if (
        newTimeAccountPeriod === "weekly" &&
        (!Number.isFinite(parsedWeeklyHours) || parsedWeeklyHours <= 0)
      ) {
        showToast({
          type: "warning",
          title: "Ungültige Wochen-Sollstunden",
          description: "Bitte gib gültige Wochen-Sollstunden ein.",
        });
        return;
      }

      if (
        newTimeAccountPeriod === "monthly" &&
        (!Number.isFinite(parsedMonthlyHours) || parsedMonthlyHours <= 0)
      ) {
        showToast({
          type: "warning",
          title: "Ungültige Monats-Sollstunden",
          description: "Bitte gib gültige Monats-Sollstunden ein.",
        });
        return;
      }

      const parsedVacationDays = vacationDays ? Number(vacationDays) : 24;
      const parsedWorkDays =
        newWorkdayPattern === "fixed"
          ? newRegularWorkdays.length
          : Number(workDaysPerWeek);

      if (newWorkdayPattern === "fixed" && newRegularWorkdays.length === 0) {
        showToast({
          type: "warning",
          title: "Regelmäßige Arbeitstage fehlen",
          description: "Bitte wähle mindestens einen regelmäßigen Arbeitstag aus.",
        });
        return;
      }

      if (
        !Number.isInteger(parsedWorkDays) ||
        parsedWorkDays < 1 ||
        parsedWorkDays > 7
      ) {
        showToast({
          type: "warning",
          title: "Ungültige Arbeitstage",
          description: "Arbeitstage pro Woche müssen zwischen 1 und 7 liegen.",
        });
        return;
      }

      if (!Number.isFinite(parsedVacationDays) || parsedVacationDays < 0) {
        showToast({
          type: "warning",
          title: "Ungültige Urlaubstage",
          description: "Bitte gib gültige Urlaubstage ein.",
        });
        return;
      }

      const businessId = await getBusinessId();

      if (!businessId) {
        showToast({
          type: "error",
          title: "Betrieb nicht gefunden",
          description: "Der Mitarbeiter konnte nicht angelegt werden.",
        });
        return;
      }

      const { data: businessData, error: businessError } = await supabase
        .from("businesses")
        .select("employee_limit")
        .eq("id", businessId)
        .single();

      if (businessError || !businessData) {
        console.error(businessError);
        showToast({
          type: "error",
          title: "Betriebsdaten konnten nicht geladen werden",
          description: "Bitte versuche es erneut.",
        });
        return;
      }

      const { count, error: countError } = await supabase
        .from("employees")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("business_id", businessId)
        .eq("account_status", "active");

      if (countError) {
        console.error(countError);
        showToast({
          type: "error",
          title: "Mitarbeiteranzahl konnte nicht geprüft werden",
          description: "Bitte versuche es erneut.",
        });
        return;
      }

      if ((count ?? 0) >= businessData.employee_limit) {
        setEmployeeLimit(businessData.employee_limit);
        setShowEmployeeLimitPopup(true);
        return;
      }

      const { data: existingEmployeeWithPin, error: pinCheckError } =
        await supabase
          .from("employees")
          .select("id")
          .eq("business_id", businessId)
          .eq("pin", employeePin)
          .maybeSingle();

      if (pinCheckError) {
        console.error(pinCheckError);
        showToast({
          type: "error",
          title: "PIN konnte nicht geprüft werden",
          description: "Bitte versuche es erneut.",
        });
        return;
      }

      if (existingEmployeeWithPin) {
        showToast({
          type: "warning",
          title: "PIN bereits vergeben",
          description: "Bitte wähle eine andere PIN.",
        });
        return;
      }

      if (currentUserRole !== "owner" && role === "Admin") {
        showToast({
          type: "error",
          title: "Keine Berechtigung",
          description: "Du darfst keine Admins anlegen.",
        });
        return;
      }

      const parsedHourlyRate = newEmployeeHourlyRate
        ? Number(newEmployeeHourlyRate.replace(",", "."))
        : null;

      const parsedHourlyAllowanceRate = newEmployeeHourlyAllowanceRate
        ? Number(newEmployeeHourlyAllowanceRate.replace(",", "."))
        : 0;

      const parsedMonthlySalary = newEmployeeMonthlySalary
        ? Number(newEmployeeMonthlySalary.replace(",", "."))
        : null;

      const parsedOvertimeHourlyRate = newEmployeeOvertimeHourlyRate
        ? Number(newEmployeeOvertimeHourlyRate.replace(",", "."))
        : null;

      const needsHourlyRate =
        newEmployeeWageType === "hourly" ||
        newEmployeeWageType === "fixed_hourly" ||
        (newEmployeeWageType === "salary" &&
          newEmployeeEligibleForSurcharges);

      if (
        needsHourlyRate &&
        (parsedHourlyRate === null ||
          !Number.isFinite(parsedHourlyRate) ||
          parsedHourlyRate <= 0)
      ) {
        showToast({
          type: "warning",
          title:
            newEmployeeWageType === "salary"
              ? "Grundstundenlohn für Zuschläge fehlt"
              : "Ungültiger Stundenlohn",
          description:
            newEmployeeWageType === "salary"
              ? "Bitte gib einen positiven Grundstundenlohn für die Zuschlagsberechnung ein."
              : "Bitte gib einen positiven Stundenlohn ein.",
        });
        return;
      }

      if (
        !Number.isFinite(parsedHourlyAllowanceRate) ||
        parsedHourlyAllowanceRate < 0
      ) {
        showToast({
          type: "warning",
          title: "Ungültige Stundenzulage",
          description:
            "Bitte gib eine gültige Stundenzulage von mindestens 0,00 € pro Stunde ein.",
        });
        return;
      }

      if (
        newEmployeeWageType === "salary" &&
        (parsedMonthlySalary === null ||
          !Number.isFinite(parsedMonthlySalary) ||
          parsedMonthlySalary <= 0)
      ) {
        showToast({
          type: "warning",
          title: "Ungültiges Monatsgehalt",
          description: "Bitte gib ein positives Monatsgehalt ein.",
        });
        return;
      }

      const salaryNeedsOvertimeRate =
        newEmployeeWageType === "salary" &&
        newTimeAccountPeriod !== "none" &&
        (newPositiveBalanceHandling === "payout" ||
          newPositiveBalanceHandling === "payout_with_limit");

      if (
        salaryNeedsOvertimeRate &&
        (parsedOvertimeHourlyRate === null ||
          !Number.isFinite(parsedOvertimeHourlyRate) ||
          parsedOvertimeHourlyRate <= 0)
      ) {
        showToast({
          type: "warning",
          title: "Überstunden-Auszahlungssatz fehlt",
          description:
            "Bitte gib für den Gehaltsempfänger einen positiven Stundenwert für Überstundenauszahlungen ein.",
        });
        return;
      }

      const newFixedHours =
        newAbsenceCalculationType === "fixed" && newFixedAbsenceHours
          ? Number(newFixedAbsenceHours.replace(",", "."))
          : null;
      const newAbsenceFallbackMinutes = Number(
        newAbsenceStartMinutes.replace(",", "."),
      );
      const newDynamicCapMinutes =
        newCapDynamicAbsenceMinutes && newDynamicAbsenceCapMinutes
          ? Number(newDynamicAbsenceCapMinutes.replace(",", "."))
          : null;
      const newPayoutLimit =
        newTimeAccountPeriod !== "none" &&
        newPositiveBalanceHandling === "payout_with_limit" &&
        newPayoutLimitHours
          ? Number(newPayoutLimitHours.replace(",", "."))
          : null;
      const newOpeningBalance = Number(newOpeningBalanceHours.replace(",", "."));

      if (
        newFixedHours !== null &&
        (!Number.isFinite(newFixedHours) || newFixedHours < 0)
      ) {
        showToast({
          type: "warning",
          title: "Ungültige Abwesenheitsstunden",
          description: "Bitte gib gültige feste Abwesenheitsstunden ein.",
        });
        return;
      }

      if (
        isDynamicAbsenceType(newAbsenceCalculationType) &&
        (!Number.isFinite(newAbsenceFallbackMinutes) ||
          newAbsenceFallbackMinutes < 0)
      ) {
        showToast({
          type: "warning",
          title: "Ungültiger Abwesenheits-Startwert",
          description: "Bitte gib einen gültigen Fallbackwert in Minuten ein.",
        });
        return;
      }

      if (
        newCapDynamicAbsenceMinutes &&
        (newDynamicCapMinutes === null ||
          !Number.isFinite(newDynamicCapMinutes) ||
          newDynamicCapMinutes < 0)
      ) {
        showToast({
          type: "warning",
          title: "Ungültiger Abwesenheits-Cap",
          description: "Bitte gib einen gültigen Maximalwert in Minuten ein.",
        });
        return;
      }

      if (
        newPayoutLimit !== null &&
        (!Number.isFinite(newPayoutLimit) || newPayoutLimit < 0)
      ) {
        showToast({
          type: "warning",
          title: "Ungültiges Auszahlungslimit",
          description: "Bitte gib ein gültiges Auszahlungslimit ein.",
        });
        return;
      }

      if (!Number.isFinite(newOpeningBalance)) {
        showToast({
          type: "warning",
          title: "Ungültiger Startsaldo",
          description: "Bitte gib einen gültigen Startsaldo ein.",
        });
        return;
      }

      const { data: insertedEmployee, error: employeeError } = await supabase
        .from("employees")
        .insert([
          {
            name: employeeName,
            birth_date: birthDate,
            employment_start_date: employmentStartDate,
            employment_end_date: employmentEndDate || null,
            employment_scope: employmentScope,
            employment_type: employmentType,
            role,
            pin: employeePin,
            status: "not_checked_in",
            account_status: "active",
            hours: "0 h",
            business_id: businessId,
            vacation_days_per_year: parsedVacationDays,
            work_days_per_week: parsedWorkDays,
            workday_pattern: newWorkdayPattern,
            wage_type: newEmployeeWageType,
            hourly_rate:
              newEmployeeWageType === "hourly" ||
              newEmployeeWageType === "fixed_hourly" ||
              (newEmployeeWageType === "salary" &&
                newEmployeeEligibleForSurcharges)
                ? parsedHourlyRate
                : null,
            hourly_allowance_rate: parsedHourlyAllowanceRate,
            monthly_salary:
              newEmployeeWageType === "salary" ? parsedMonthlySalary : null,
            overtime_hourly_rate:
              newEmployeeWageType === "salary"
                ? parsedOvertimeHourlyRate
                : null,
            eligible_for_surcharges: newEmployeeEligibleForSurcharges,
            datev_personnel_number:
              newEmployeeDatevPersonnelNumber.trim() || null,
            cost_center: newEmployeeCostCenter.trim() || null,
          },
        ])
        .select("id")
        .single();

      if (employeeError || !insertedEmployee) {
        console.error("EMPLOYEE INSERT ERROR:", employeeError);

        showToast({
          type: "error",
          title: "Mitarbeiter konnte nicht erstellt werden",
          description:
            employeeError?.message ||
            "Bitte prüfe die Angaben und versuche es erneut.",
        });
        return;
      }

      if (newWorkdayPattern === "fixed" && newRegularWorkdays.length > 0) {
        const { error: regularWorkdayInsertError } = await supabase
          .from("employee_regular_workdays")
          .insert(
            newRegularWorkdays.map((isoWeekday) => ({
              employee_id: insertedEmployee.id,
              iso_weekday: isoWeekday,
            })),
          );

        if (regularWorkdayInsertError) {
          console.error(regularWorkdayInsertError);
          showToast({
            type: "error",
            title: "Regelmäßige Arbeitstage konnten nicht gespeichert werden",
            description: regularWorkdayInsertError.message,
          });
          return;
        }
      }

      const { error: targetHoursError } = await supabase
        .from("employee_target_hours")
        .insert([
          {
            employee_id: insertedEmployee.id,
            weekly_hours: parsedWeeklyHours,
            monthly_hours: parsedMonthlyHours,
          },
        ]);

      if (targetHoursError) {
        console.error(targetHoursError);
        showToast({
          type: "error",
          title: "Sollstunden konnten nicht gespeichert werden",
          description:
            "Der Mitarbeiter wurde angelegt, aber die Sollstunden fehlen.",
        });
        return;
      }

      const { error: timeAccountInsertError } = await supabase
        .from("employee_time_account_settings")
        .insert([
          {
            employee_id: insertedEmployee.id,
            absence_calculation_type: newAbsenceCalculationType,
            fixed_absence_hours: newFixedHours,
            prefer_scheduled_shift_for_absence:
              newPreferScheduledShiftForAbsence,
            absence_start_minutes: isDynamicAbsenceType(
              newAbsenceCalculationType,
            )
              ? Math.round(newAbsenceFallbackMinutes)
              : null,
            cap_dynamic_absence_minutes:
              isDynamicAbsenceType(newAbsenceCalculationType) &&
              newCapDynamicAbsenceMinutes,
            dynamic_absence_cap_minutes:
              isDynamicAbsenceType(newAbsenceCalculationType) &&
              newCapDynamicAbsenceMinutes
                ? Math.round(newDynamicCapMinutes ?? 0)
                : null,
            three_month_average_basis:
              newAbsenceCalculationType === "three_month_average"
                ? newThreeMonthAverageBasis
                : null,
            time_account_period: newTimeAccountPeriod,
            positive_balance_handling:
              newTimeAccountPeriod === "none"
                ? "carry"
                : newPositiveBalanceHandling,
            payout_limit_hours:
              newTimeAccountPeriod === "none" ? null : newPayoutLimit,
            negative_balance_handling:
              newTimeAccountPeriod === "none"
                ? "carry"
                : newNegativeBalanceHandling,
            opening_balance_hours:
              newTimeAccountPeriod === "none" ? 0 : newOpeningBalance,
          },
        ]);

      if (timeAccountInsertError) {
        console.error(timeAccountInsertError);
        showToast({
          type: "error",
          title: "Arbeitszeitkonto-Einstellungen konnten nicht gespeichert werden",
          description: timeAccountInsertError.message,
        });
        return;
      }

      try {
        await refreshOpenPayrollSnapshotsForTargetChange(
          insertedEmployee.id,
        );
      } catch (payrollRefreshError) {
        console.error(
          "NEW EMPLOYEE PAYROLL TARGET REFRESH ERROR:",
          payrollRefreshError,
        );

        showToast({
          type: "warning",
          title: "Payroll-Snapshots konnten nicht synchronisiert werden",
          description:
            "Der Mitarbeiter wurde angelegt, aber offene Abrechnungsperioden konnten nicht automatisch aktualisiert werden.",
        });
      }

      const inviteCode = generateInviteCode();

      const { data: insertedInvite, error: inviteError } = await supabase
      .from("employee_invites")
      .insert([
        {
          business_id: businessId,
          employee_id: insertedEmployee.id,
          invite_code: inviteCode,
          email: null,
          delivery_method: "whatsapp",
          auth_user_id: null,
          claimed_at: null,
        },
      ])
      .select(`
        id,
        invite_code,
        email,
        delivery_method
      `)
  .single();

      if (inviteError || !insertedInvite) {
        console.error("EMPLOYEE INVITE INSERT ERROR:", inviteError);
        showToast({
          type: "warning",
          title: "Einladung konnte nicht erstellt werden",
          description:
            "Der Mitarbeiter wurde angelegt, aber ohne Einladungscode.",
        });
      } else {
        setCreatedEmployeeInvite({
        employeeId: insertedEmployee.id,
        employeeName,
        inviteCode: insertedInvite.invite_code,
        email: insertedInvite.email,
        deliveryMethod: insertedInvite.delivery_method,
      });
      }

      setName("");
      setBirthDate("");
      setEmploymentStartDate("");
      setEmploymentEndDate("");
      setEmploymentScope("full_time");
      setEmploymentType("regular");
      setRole("Mitarbeiter");
      setPin("");
      setMonthlyHours("173");
      setWeeklyHours("40");
      setVacationDays("");
      setWorkDaysPerWeek("5");
      setNewWorkdayPattern("schedule_based");
      setNewRegularWorkdays([]);
      setNewEmployeeWageType("hourly");
      setNewEmployeeHourlyRate("");
      setNewEmployeeHourlyAllowanceRate("");
      setNewEmployeeMonthlySalary("");
      setNewEmployeeOvertimeHourlyRate("");
      setNewEmployeeEligibleForSurcharges(true);
      setNewAbsenceCalculationType("daily_average_13_weeks");
      setNewFixedAbsenceHours("");
      setNewPreferScheduledShiftForAbsence(true);
      setNewAbsenceStartMinutes("0");
      setNewCapDynamicAbsenceMinutes(false);
      setNewDynamicAbsenceCapMinutes("");
      setNewThreeMonthAverageBasis("possible_workdays");
      setNewTimeAccountPeriod("monthly");
      setNewPositiveBalanceHandling("carry");
      setNewPayoutLimitHours("");
      setNewNegativeBalanceHandling("carry");
      setNewOpeningBalanceHours("0");
      setNewEmployeeDatevPersonnelNumber("");
      setNewEmployeeCostCenter("");
      setShowForm(false);

      await loadEmployees();

      showToast({
        type: "success",
        title: "Mitarbeiter angelegt",
        description: `${employeeName} wurde erfolgreich hinzugefügt.`,
      });
    } finally {
      setIsSaving(false);
    }
  }

  function getInviteUrl(inviteCode: string) {
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL || "https://app.dipera.de"
    ).replace(/\/$/, "");

    return `${appUrl}/employee-register?invite=${encodeURIComponent(
      inviteCode,
    )}`;
  }

  function closeCreatedEmployeeInvite() {
    if (
      isSendingInviteEmail ||
      isCopyingInviteLink ||
      isCopyingInviteCode
    ) {
      return;
    }

    setCreatedEmployeeInvite(null);
    setInviteEmail("");
  }

  function handleOpenExistingInvite(employee: EmployeeWithTargetHours) {
  if (!employee.invite || employee.invite.used_at) {
    return;
  }

  setInviteEmail(employee.invite.email ?? "");

  setCreatedEmployeeInvite({
    employeeId: employee.id,
    employeeName: employee.name,
    inviteCode: employee.invite.invite_code,
    email: employee.invite.email,
    deliveryMethod: employee.invite.delivery_method,
  });
}

  async function handleCreateMissingInvite(
    employee: EmployeeWithTargetHours,
  ) {
    if (employee.invite?.used_at) {
      showToast({
        type: "warning",
        title: "Zugang bereits aktiviert",
        description:
          "Für diesen Mitarbeiter wurde der Dipera-Zugang bereits aktiviert.",
      });
      return;
    }

    if (employee.invite && !employee.invite.used_at) {
      handleOpenExistingInvite(employee);
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Die Einladung konnte nicht erstellt werden.",
      });
      return;
    }

    const inviteCode = generateInviteCode();

    const { data: insertedInvite, error: inviteError } = await supabase
      .from("employee_invites")
      .insert([
        {
          business_id: businessId,
          employee_id: employee.id,
          invite_code: inviteCode,
          email: null,
          delivery_method: "whatsapp",
          auth_user_id: null,
          claimed_at: null,
        },
      ])
      .select(`
        id,
        employee_id,
        business_id,
        invite_code,
        email,
        delivery_method,
        auth_user_id,
        claimed_at,
        used_at
      `)
      .single();

    if (inviteError || !insertedInvite) {
      console.error(
        "CREATE MISSING EMPLOYEE INVITE ERROR:",
        inviteError,
      );

      showToast({
        type: "error",
        title: "Einladung konnte nicht erstellt werden",
        description:
          inviteError?.message ||
          "Bitte versuche es erneut.",
      });
      return;
    }

    setInviteEmail("");

    setCreatedEmployeeInvite({
      employeeId: employee.id,
      employeeName: employee.name,
      inviteCode: insertedInvite.invite_code,
      email: insertedInvite.email,
      deliveryMethod: insertedInvite.delivery_method,
    });

    await loadEmployees();

    showToast({
      type: "success",
      title: "Einladung erstellt",
      description: `Die Einladung für ${employee.name} wurde erstellt.`,
    });
  }

  async function handleSendInviteEmail() {
    if (!createdEmployeeInvite || isSendingInviteEmail) return;

    const normalizedEmail = inviteEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      showToast({
        type: "warning",
        title: "E-Mail-Adresse fehlt",
        description: "Bitte gib die E-Mail-Adresse des Mitarbeiters ein.",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      showToast({
        type: "warning",
        title: "Ungültige E-Mail-Adresse",
        description: "Bitte prüfe die eingegebene E-Mail-Adresse.",
      });
      return;
    }

    setIsSendingInviteEmail(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        showToast({
          type: "error",
          title: "Anmeldung abgelaufen",
          description: "Bitte melde dich erneut an.",
        });
        return;
      }

      const response = await fetch("/api/employee-invitations/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          employeeId: createdEmployeeInvite.employeeId,
          email: normalizedEmail,
        }),
      });

      const responseText = await response.text();

let data: {
  success?: boolean;
  error?: string;
  email?: string;
} = {};

try {
  data = responseText ? JSON.parse(responseText) : {};
} catch {
  console.error("NON-JSON API RESPONSE:", {
    status: response.status,
    contentType: response.headers.get("content-type"),
    responseText,
  });

  showToast({
    type: "error",
    title: "Einladungsroute nicht verfügbar",
    description:
      "Die API hat keine gültige Antwort geliefert. Bitte prüfe das Terminal.",
  });

  return;
}

      if (!response.ok || !data.success) {
        showToast({
          type: "error",
          title: "Einladung konnte nicht versendet werden",
          description: data.error || "Bitte versuche es erneut.",
        });
        return;
      }

      const employeeName = createdEmployeeInvite.employeeName;

      setCreatedEmployeeInvite(null);
      setInviteEmail("");

      await loadEmployees();

      showToast({
        type: "success",
        title: "Einladung versendet",
        description: `Die Einladung für ${employeeName} wurde per E-Mail versendet.`,
      });
    } catch (error) {
      console.error("SEND INVITE EMAIL ERROR:", error);

      showToast({
        type: "error",
        title: "Einladung konnte nicht versendet werden",
        description: "Bitte versuche es erneut.",
      });
    } finally {
      setIsSendingInviteEmail(false);
    }
  }

  async function handleCopyInviteLink() {
    if (!createdEmployeeInvite || isCopyingInviteLink) return;

    setIsCopyingInviteLink(true);

    try {
      const inviteUrl = getInviteUrl(createdEmployeeInvite.inviteCode);
      await navigator.clipboard.writeText(inviteUrl);

      showToast({
        type: "success",
        title: "Einladungslink kopiert",
        description: "Der Link wurde in die Zwischenablage kopiert.",
      });
    } catch (error) {
      console.error("COPY INVITE LINK ERROR:", error);

      showToast({
        type: "error",
        title: "Link konnte nicht kopiert werden",
        description: "Bitte versuche es erneut.",
      });
    } finally {
      setIsCopyingInviteLink(false);
    }
  }

  async function handleCopyInviteCode() {
    if (!createdEmployeeInvite || isCopyingInviteCode) return;

    setIsCopyingInviteCode(true);

    try {
      await navigator.clipboard.writeText(createdEmployeeInvite.inviteCode);

      showToast({
        type: "success",
        title: "Einladungscode kopiert",
        description: "Der Code wurde in die Zwischenablage kopiert.",
      });
    } catch (error) {
      console.error("COPY INVITE CODE ERROR:", error);

      showToast({
        type: "error",
        title: "Code konnte nicht kopiert werden",
        description: "Bitte versuche es erneut.",
      });
    } finally {
      setIsCopyingInviteCode(false);
    }
  }

async function handleOpenWhatsAppInvite() {
  if (!createdEmployeeInvite) return;

  try {
    const { error } = await supabase
      .from("employee_invites")
      .update({
        delivery_method: "whatsapp",
        email: null,
      })
      .eq("employee_id", createdEmployeeInvite.employeeId)
      .eq("invite_code", createdEmployeeInvite.inviteCode)
      .is("used_at", null);

    if (error) {
      console.error("UPDATE WHATSAPP INVITE ERROR:", error);

      showToast({
        type: "error",
        title: "WhatsApp-Einladung konnte nicht vorbereitet werden",
        description: "Bitte versuche es erneut.",
      });

      return;
    }

    const inviteUrl = getInviteUrl(createdEmployeeInvite.inviteCode);

    const message = [
      `Hallo ${createdEmployeeInvite.employeeName} 👋`,
      "",
      "Du wurdest von deinem Arbeitgeber zu Dipera eingeladen.",
      "",
      "📱 Registrierung:",
      inviteUrl,
      "",
      "Dein Einladungscode wird automatisch übernommen.",
      "",
      "Bitte gib deine E-Mail-Adresse ein und lege ein Passwort fest.",
      "Anschließend bestätigst du deine E-Mail-Adresse über die E-Mail von Dipera.",
      "",
      "Willkommen bei Dipera!",
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );

    setCreatedEmployeeInvite(null);

    setCreatedEmployeeInvite((current) =>
      current
        ? {
            ...current,
            email: null,
            deliveryMethod: "whatsapp",
          }
        : null,
    );

    setInviteEmail("");

    await loadEmployees();
  } catch (error) {
    console.error("OPEN WHATSAPP INVITE ERROR:", error);

    showToast({
      type: "error",
      title: "WhatsApp konnte nicht geöffnet werden",
      description: "Bitte versuche es erneut.",
    });
  }
}

  async function handleDeleteEmployee(id: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Mitarbeiter konnte nicht gelöscht werden.",
      });
      return;
    }

    const employee = employees.find((employee) => employee.id === id);

    if (!employee) {
      showToast({
        type: "error",
        title: "Mitarbeiter nicht gefunden",
        description: "Bitte lade die Seite neu und versuche es erneut.",
      });
      return;
    }

    if (employee.role === "Owner") {
      showToast({
        type: "warning",
        title: "Owner kann nicht gelöscht werden",
        description: "Der Hauptinhaber des Betriebs bleibt immer bestehen.",
      });
      return;
    }

    if (employee.role === "Admin" && currentUserRole !== "owner") {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Du darfst keine Admins löschen.",
      });
      return;
    }

    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      if (
        error.message?.includes("profiles") ||
        error.message?.includes("employee_id")
      ) {
        showToast({
          type: "warning",
          title: "Löschen nicht möglich",
          description:
            "Dieser Mitarbeiter wurde bereits registriert. Bitte deaktiviere ihn stattdessen.",
        });
        return;
      }

      console.error(error);
      showToast({
        type: "error",
        title: "Mitarbeiter konnte nicht gelöscht werden",
        description: error.message,
      });
      return;
    }

    await loadEmployees();

    showToast({
      type: "success",
      title: "Mitarbeiter gelöscht",
      description: `${employee.name} wurde entfernt.`,
    });
  }

  async function handleToggleAccountStatus(id: string, currentStatus: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Der Status konnte nicht geändert werden.",
      });
      return;
    }

    const employee = employees.find((employeeItem) => employeeItem.id === id);

    if (!employee) {
      showToast({
        type: "error",
        title: "Mitarbeiter nicht gefunden",
        description: "Bitte lade die Seite neu und versuche es erneut.",
      });
      return;
    }

    if (employee.role === "Owner") {
      showToast({
        type: "warning",
        title: "Owner kann nicht deaktiviert werden",
        description: "Der Hauptinhaber des Betriebs bleibt immer aktiv.",
      });
      return;
    }

    if (employee.role === "Admin" && currentUserRole !== "owner") {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Du darfst den Status von Admins nicht ändern.",
      });
      return;
    }

    const isReactivating = currentStatus === "inactive";
    if (!isReactivating) {
  const { data: currentEmployeeStatus, error: statusError } = await supabase
    .from("employees")
    .select("status")
    .eq("id", id)
    .eq("business_id", businessId)
    .single();

  if (statusError || !currentEmployeeStatus) {
    console.error("EMPLOYEE STATUS CHECK ERROR:", statusError);

    showToast({
      type: "error",
      title: "Status konnte nicht geprüft werden",
      description: "Bitte versuche es erneut.",
    });
    return;
  }

  if (currentEmployeeStatus.status !== "not_checked_in") {
    showToast({
      type: "warning",
      title: "Mitarbeiter noch eingestempelt",
      description:
        "Der Mitarbeiter kann erst deaktiviert werden, nachdem die laufende Zeiterfassung beendet oder korrigiert wurde.",
    });
    return;
  }
}

    /*
     * Beim Deaktivieren wird ein Platz frei.
     * Nur beim Reaktivieren muss das Paketlimit geprüft werden.
     */
    if (isReactivating) {
      const { data: businessLimitData, error: businessLimitError } =
        await supabase
          .from("businesses")
          .select("employee_limit")
          .eq("id", businessId)
          .single();

      if (businessLimitError || !businessLimitData) {
        console.error("BUSINESS LIMIT LOAD ERROR:", businessLimitError);

        showToast({
          type: "error",
          title: "Mitarbeiterlimit konnte nicht geprüft werden",
          description: "Bitte versuche es erneut.",
        });
        return;
      }

      const { count: activeEmployeeCount, error: employeeCountError } =
        await supabase
          .from("employees")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("business_id", businessId)
          .eq("account_status", "active");

      if (employeeCountError) {
        console.error("ACTIVE EMPLOYEE COUNT ERROR:", employeeCountError);

        showToast({
          type: "error",
          title: "Mitarbeiteranzahl konnte nicht geprüft werden",
          description: "Bitte versuche es erneut.",
        });
        return;
      }

      if ((activeEmployeeCount ?? 0) >= businessLimitData.employee_limit) {
        setEmployeeLimit(businessLimitData.employee_limit);

        setShowEmployeeLimitPopup(true);
        return;
      }
    }

    const newStatus = isReactivating ? "active" : "inactive";

    const { error } = await supabase
      .from("employees")
      .update({
        account_status: newStatus,
      })
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("EMPLOYEE STATUS UPDATE ERROR:", error);

      showToast({
        type: "error",
        title: "Status konnte nicht geändert werden",
        description: error.message,
      });
      return;
    }

    await loadEmployees();

    showToast({
      type: "success",
      title:
        newStatus === "active"
          ? "Mitarbeiter reaktiviert"
          : "Mitarbeiter deaktiviert",
      description: `${employee.name} wurde ${
        newStatus === "active" ? "reaktiviert" : "deaktiviert"
      }.`,
    });
  }
  // Bearbeitet nur die Monats-Sollstunden.
  // Wochen-Sollstunden bleiben ein eigenständiger Vertragswert.
  async function handleUpdateMonthlyHours(
    employeeId: string,
    newMonthlyHours: number,
  ) {
    if (!canEditPayroll) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Du darfst Sollstunden nicht bearbeiten.",
      });
      return;
    }

    if (newMonthlyHours < 0) {
      showToast({
        type: "warning",
        title: "Ungültige Sollstunden",
        description: "Bitte gib gültige Monats-Sollstunden ein.",
      });
      return;
    }

    const employee = employees.find((employee) => employee.id === employeeId);

    if (!employee) {
      showToast({
        type: "error",
        title: "Mitarbeiter nicht gefunden",
        description: "Bitte lade die Seite neu und versuche es erneut.",
      });
      return;
    }

    if (newMonthlyHours === employee.monthly_target_hours) {
      return;
    }

    const { data: existingTarget, error: existingError } = await supabase
      .from("employee_target_hours")
      .select("id")
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (existingError) {
      console.error(existingError);
      showToast({
        type: "error",
        title: "Sollstunden konnten nicht geprüft werden",
        description: existingError.message,
      });
      return;
    }

    if (existingTarget) {
      const { error } = await supabase
        .from("employee_target_hours")
        .update({
          monthly_hours: newMonthlyHours,
        })
        .eq("id", existingTarget.id);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Sollstunden konnten nicht gespeichert werden",
          description: error.message,
        });
        return;
      }
    } else {
      const { error } = await supabase.from("employee_target_hours").insert([
        {
          employee_id: employeeId,
          monthly_hours: newMonthlyHours,
          weekly_hours: employee.weekly_target_hours,
        },
      ]);

      if (error) {
        console.error(error);
        showToast({
          type: "error",
          title: "Sollstunden konnten nicht gespeichert werden",
          description: error.message,
        });
        return;
      }
    }

    try {
      await refreshOpenPayrollSnapshotsForTargetChange(employeeId);
    } catch (payrollRefreshError) {
      console.error(
        "MONTHLY HOURS PAYROLL TARGET REFRESH ERROR:",
        payrollRefreshError,
      );

      showToast({
        type: "warning",
        title: "Offene Abrechnungen konnten nicht aktualisiert werden",
        description:
          "Die Sollstunden wurden gespeichert, aber offene Payroll-Snapshots konnten nicht automatisch neu berechnet werden.",
      });
    }

    await loadEmployees();

    setUnsavedMonthlyHours((current) => ({
      ...current,
      [employeeId]: false,
    }));

    showToast({
      type: "success",
      title: "Sollstunden gespeichert",
      description: `Die Sollstunden von ${employee.name} wurden aktualisiert.`,
    });
  }

  async function handleAddNote(employeeId: string) {
    const noteText = noteTexts[employeeId]?.trim();

    if (!noteText) {
      showToast({
        type: "warning",
        title: "Notiz fehlt",
        description: "Bitte gib zuerst eine Notiz ein.",
      });
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Die Notiz konnte nicht gespeichert werden.",
      });
      return;
    }

    const employee = employees.find((employee) => employee.id === employeeId);

    const { error } = await supabase.from("employee_notes").insert([
      {
        employee_id: employeeId,
        business_id: businessId,
        note: noteText,
      },
    ]);

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Notiz konnte nicht gespeichert werden",
        description: error.message,
      });
      return;
    }

    setNoteTexts((current) => ({
      ...current,
      [employeeId]: "",
    }));

    await loadEmployees();

    showToast({
      type: "success",
      title: "Notiz gespeichert",
      description: employee
        ? `Die Notiz zu ${employee.name} wurde hinzugefügt.`
        : "Die Notiz wurde hinzugefügt.",
    });
  }

  async function handleDeleteNote(noteId: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Die Notiz konnte nicht gelöscht werden.",
      });
      return;
    }

    const { error } = await supabase
      .from("employee_notes")
      .delete()
      .eq("id", noteId)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Notiz konnte nicht gelöscht werden",
        description: error.message,
      });
      return;
    }

    await loadEmployees();

    showToast({
      type: "success",
      title: "Notiz gelöscht",
      description: "Die interne Notiz wurde entfernt.",
    });
  }

  

  function renderNotes(employee: EmployeeWithTargetHours) {
    return (
      <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h4 className="font-semibold text-[#0F172A]">Interne Notizen</h4>
            <p className="mt-1 text-sm text-[#64748B]">
              Hinweise für Planung, Verfügbarkeit oder Besonderheiten.
            </p>
          </div>

          {employee.notes.length > 0 && (
            <Badge variant="muted">{employee.notes.length}</Badge>
          )}
        </div>

        <div className="mb-4 flex flex-col gap-3">
          <Textarea
            value={noteTexts[employee.id] || ""}
            onChange={(event) =>
              setNoteTexts((current) => ({
                ...current,
                [employee.id]: event.target.value,
              }))
            }
            placeholder="z. B. keine Spätschichten, montags nicht verfügbar..."
            className="min-h-24"
          />

          <div className="flex justify-end">
            <Button
              variant="primary"
              type="button"
              onClick={() => handleAddNote(employee.id)}
            >
              Notiz speichern
            </Button>
          </div>
        </div>

        {employee.notes.length > 0 ? (
          <div className="flex flex-col gap-3">
            {employee.notes.map((note) => (
              <div
                key={note.id}
                className="rounded-2xl border border-[#D7DEE8] bg-[#EEF2F6] p-4 shadow-[0_4px_12px_rgba(15,23,42,0.07)] transition hover:border-[#B8C4D1] hover:shadow-[0_6px_16px_rgba(15,23,42,0.10)]"
              >
                <p className="whitespace-pre-wrap text-sm leading-6 text-[#0F172A]">
                  {note.note}
                </p>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#64748B]">
                    {formatNoteDate(note.created_at)}
                  </span>

                  <Button
                    variant="danger"
                    size="sm"
                    type="button"
                    onClick={() => setNoteToDelete(note.id)}
                  >
                    Löschen
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-5 text-center text-sm text-[#64748B]">
            Noch keine Notizen vorhanden.
          </p>
        )}
      </div>
    );
  }

  function handleOpenLocationTracking(employee: EmployeeWithTargetHours) {
    if (!canEditLocationTracking) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Du darfst die Standortprüfung nicht bearbeiten.",
      });
      return;
    }

    setEditingLocationEmployee(employee);
    setEditLocationTrackingMode(employee.location_tracking_mode ?? "required");
    setEditLocationTrackingNote(employee.location_tracking_note ?? "");
  }

  async function handleSaveLocationTracking() {
    if (!editingLocationEmployee || isSavingLocationTracking) {
      return;
    }

    if (!canEditLocationTracking) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Du darfst die Standortprüfung nicht bearbeiten.",
      });
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Die Standortregel konnte nicht gespeichert werden.",
      });
      return;
    }

    setIsSavingLocationTracking(true);

    try {
      const { error } = await supabase
        .from("employees")
        .update({
          location_tracking_mode: editLocationTrackingMode,
          location_tracking_note: editLocationTrackingNote.trim() || null,
        })
        .eq("id", editingLocationEmployee.id)
        .eq("business_id", businessId);

      if (error) {
        console.error("SAVE LOCATION TRACKING ERROR:", error);

        showToast({
          type: "error",
          title: "Standortregel konnte nicht gespeichert werden",
          description: error.message,
        });

        return;
      }

      const employeeName = editingLocationEmployee.name;

      setEditingLocationEmployee(null);
      setEditLocationTrackingMode("required");
      setEditLocationTrackingNote("");

      await loadEmployees();

      showToast({
        type: "success",
        title: "Standortregel gespeichert",
        description: `Die Standortprüfung für ${employeeName} wurde aktualisiert.`,
      });
    } finally {
      setIsSavingLocationTracking(false);
    }
  }

function handleOpenEditPayroll(employee: EmployeeWithTargetHours) {
  if (!canEditPayroll) {
    showToast({
      type: "error",
      title: "Keine Berechtigung",
      description: "Du darfst Mitarbeiter- und Lohndaten nicht bearbeiten.",
    });
    return;
  }

  setEditingPayrollEmployee(employee);

  setEditBirthDate(employee.birth_date ?? "");
  setEditEmploymentStartDate(employee.employment_start_date ?? "");
  setEditEmploymentEndDate(employee.employment_end_date ?? "");
  setEditEmploymentScope(employee.employment_scope ?? "full_time");
  setEditEmploymentType(employee.employment_type ?? "regular");
  setEditWeeklyHours(String(employee.weekly_target_hours ?? 40));
  setEditMonthlyHours(String(employee.monthly_target_hours ?? 173));
  setEditVacationDays(String(employee.vacation_days_per_year ?? 24));
  setEditWorkDaysPerWeek(String(employee.work_days_per_week ?? 5));
  setEditWorkdayPattern(employee.workday_pattern ?? "schedule_based");
  setEditRegularWorkdays(employee.regular_workdays ?? []);

  setEditWageType(
    employee.wage_type === "fixed_hourly"
      ? "fixed_hourly"
      : employee.wage_type === "salary"
        ? "salary"
        : "hourly",
  );

  setEditHourlyRate(
    employee.hourly_rate !== null &&
      employee.hourly_rate !== undefined
      ? String(employee.hourly_rate)
      : "",
  );

  setEditHourlyAllowanceRate(
    employee.hourly_allowance_rate !== null &&
      employee.hourly_allowance_rate !== undefined
      ? String(employee.hourly_allowance_rate)
      : "",
  );

  setEditMonthlySalary(
    employee.monthly_salary !== null &&
      employee.monthly_salary !== undefined
      ? String(employee.monthly_salary)
      : "",
  );

  setEditOvertimeHourlyRate(
    employee.overtime_hourly_rate !== null &&
      employee.overtime_hourly_rate !== undefined
      ? String(employee.overtime_hourly_rate)
      : "",
  );

  setEditDatevPersonnelNumber(
    employee.datev_personnel_number || "",
  );

  setEditCostCenter(employee.cost_center || "");

  setEditEligibleForSurcharges(
    employee.eligible_for_surcharges ?? true,
  );

  const timeAccountSettings =
    employee.time_account_settings;

  setEditAbsenceCalculationType(
    timeAccountSettings?.absence_calculation_type ??
      "daily_average_13_weeks",
  );

  setEditFixedAbsenceHours(
    timeAccountSettings?.fixed_absence_hours !== null &&
      timeAccountSettings?.fixed_absence_hours !== undefined
      ? String(timeAccountSettings.fixed_absence_hours)
      : "",
  );

  setEditPreferScheduledShiftForAbsence(
    timeAccountSettings?.prefer_scheduled_shift_for_absence ??
      true,
  );

  setEditAbsenceStartMinutes(
    timeAccountSettings?.absence_start_minutes !== null &&
      timeAccountSettings?.absence_start_minutes !== undefined
      ? String(timeAccountSettings.absence_start_minutes)
      : "0",
  );

  setEditCapDynamicAbsenceMinutes(
    timeAccountSettings?.cap_dynamic_absence_minutes ?? false,
  );

  setEditDynamicAbsenceCapMinutes(
    timeAccountSettings?.dynamic_absence_cap_minutes !== null &&
      timeAccountSettings?.dynamic_absence_cap_minutes !== undefined
      ? String(timeAccountSettings.dynamic_absence_cap_minutes)
      : "",
  );

  setEditThreeMonthAverageBasis(
    timeAccountSettings?.three_month_average_basis ??
      "possible_workdays",
  );

  setEditTimeAccountPeriod(
    timeAccountSettings?.time_account_period ?? "monthly",
  );

  setEditPositiveBalanceHandling(
    timeAccountSettings?.positive_balance_handling ?? "carry",
  );

  setEditPayoutLimitHours(
    timeAccountSettings?.payout_limit_hours !== null &&
      timeAccountSettings?.payout_limit_hours !== undefined
      ? String(timeAccountSettings.payout_limit_hours)
      : "",
  );

  setEditNegativeBalanceHandling(
    timeAccountSettings?.negative_balance_handling ?? "carry",
  );

  setEditOpeningBalanceHours(
    String(timeAccountSettings?.opening_balance_hours ?? 0),
  );
}

  function closeEmployeeEditDialog() {
    setEditingPayrollEmployee(null);
    setEditBirthDate("");
    setEditEmploymentStartDate("");
    setEditEmploymentEndDate("");
    setEditEmploymentScope("full_time");
    setEditEmploymentType("regular");
    setEditWeeklyHours("");
    setEditMonthlyHours("");
    setEditVacationDays("");
    setEditWorkDaysPerWeek("");
    setEditWorkdayPattern("schedule_based");
    setEditRegularWorkdays([]);
    setEditHourlyAllowanceRate("");
    setEditOvertimeHourlyRate("");
    setEditAbsenceCalculationType("daily_average_13_weeks");
    setEditFixedAbsenceHours("");
    setEditAbsenceStartMinutes("");
    setEditCapDynamicAbsenceMinutes(false);
    setEditDynamicAbsenceCapMinutes("");
    setEditThreeMonthAverageBasis("possible_workdays");
    setEditPreferScheduledShiftForAbsence(true);
    setEditTimeAccountPeriod("monthly");
    setEditPositiveBalanceHandling("carry");
    setEditPayoutLimitHours("");
    setEditNegativeBalanceHandling("carry");
    setEditOpeningBalanceHours("0");
  }

  async function handleSaveEmployeePayroll(
    confirmClosedPeriodImpact = false,
  ) {
    if (!editingPayrollEmployee || isSavingPayroll) return;

    setIsSavingPayroll(true);

    try {

    if (!canEditPayroll) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Du darfst Mitarbeiter- und Lohndaten nicht bearbeiten.",
      });
      return;
    }

    if (!editBirthDate) {
      showToast({
        type: "warning",
        title: "Geburtsdatum fehlt",
        description: "Bitte gib das Geburtsdatum des Mitarbeiters ein.",
      });
      return;
    }

    if (!editEmploymentStartDate) {
      showToast({
        type: "warning",
        title: "Eintrittsdatum fehlt",
        description: "Bitte gib das Eintrittsdatum des Mitarbeiters ein.",
      });
      return;
    }

    if (
      editEmploymentEndDate &&
      editEmploymentEndDate < editEmploymentStartDate
    ) {
      showToast({
        type: "warning",
        title: "Ungültiges Austrittsdatum",
        description:
          "Das Austrittsdatum darf nicht vor dem Eintrittsdatum liegen.",
      });
      return;
    }

    const weeklyTargetHours = Number(editWeeklyHours.replace(",", "."));
    const monthlyTargetHours = Number(editMonthlyHours.replace(",", "."));
    const vacationDaysPerYear = Number(editVacationDays.replace(",", "."));
    const workDays =
      editWorkdayPattern === "fixed"
        ? editRegularWorkdays.length
        : Number(editWorkDaysPerWeek);

    if (editWorkdayPattern === "fixed" && editRegularWorkdays.length === 0) {
      showToast({
        type: "warning",
        title: "Regelmäßige Arbeitstage fehlen",
        description: "Bitte wähle mindestens einen regelmäßigen Arbeitstag aus.",
      });
      return;
    }

    if (
      editTimeAccountPeriod === "weekly" &&
      (!Number.isFinite(weeklyTargetHours) || weeklyTargetHours <= 0)
    ) {
      showToast({
        type: "warning",
        title: "Ungültige Wochen-Sollstunden",
        description: "Bitte gib gültige Wochen-Sollstunden ein.",
      });
      return;
    }

    if (
      editTimeAccountPeriod === "monthly" &&
      (!Number.isFinite(monthlyTargetHours) || monthlyTargetHours <= 0)
    ) {
      showToast({
        type: "warning",
        title: "Ungültige Monats-Sollstunden",
        description: "Bitte gib gültige Monats-Sollstunden ein.",
      });
      return;
    }

    if (
      !Number.isInteger(workDays) ||
      workDays < 1 ||
      workDays > 7
    ) {
      showToast({
        type: "warning",
        title: "Ungültige Arbeitstage",
        description: "Arbeitstage pro Woche müssen zwischen 1 und 7 liegen.",
      });
      return;
    }

    if (!Number.isFinite(vacationDaysPerYear) || vacationDaysPerYear < 0) {
      showToast({
        type: "warning",
        title: "Ungültige Urlaubstage",
        description: "Bitte gib gültige Urlaubstage ein.",
      });
      return;
    }

    const hourlyRate = editHourlyRate
      ? Number(editHourlyRate.replace(",", "."))
      : null;

    const hourlyAllowanceRate = editHourlyAllowanceRate
      ? Number(editHourlyAllowanceRate.replace(",", "."))
      : 0;

    const monthlySalary =
      editWageType === "salary" && editMonthlySalary
        ? Number(editMonthlySalary.replace(",", "."))
        : null;

    const overtimeHourlyRate = editOvertimeHourlyRate
      ? Number(editOvertimeHourlyRate.replace(",", "."))
      : null;

    const needsHourlyRate =
      editWageType === "hourly" ||
      editWageType === "fixed_hourly" ||
      (editWageType === "salary" && editEligibleForSurcharges);

    if (
      needsHourlyRate &&
      (hourlyRate === null ||
        !Number.isFinite(hourlyRate) ||
        hourlyRate <= 0)
    ) {
      showToast({
        type: "warning",
        title:
          editWageType === "salary"
            ? "Grundstundenlohn für Zuschläge fehlt"
            : "Ungültiger Stundenlohn",
        description:
          editWageType === "salary"
            ? "Bitte gib einen positiven Grundstundenlohn für die Zuschlagsberechnung ein."
            : "Bitte gib einen positiven Stundenlohn ein.",
      });
      return;
    }

    if (
      !Number.isFinite(hourlyAllowanceRate) ||
      hourlyAllowanceRate < 0
    ) {
      showToast({
        type: "warning",
        title: "Ungültige Stundenzulage",
        description:
          "Bitte gib eine gültige Stundenzulage von mindestens 0,00 € pro Stunde ein.",
      });
      return;
    }

    if (
      editWageType === "salary" &&
      (monthlySalary === null ||
        !Number.isFinite(monthlySalary) ||
        monthlySalary <= 0)
    ) {
      showToast({
        type: "warning",
        title: "Ungültiges Monatsgehalt",
        description: "Bitte gib ein positives Monatsgehalt ein.",
      });
      return;
    }

    const salaryNeedsOvertimeRate =
      editWageType === "salary" &&
      editTimeAccountPeriod !== "none" &&
      (editPositiveBalanceHandling === "payout" ||
        editPositiveBalanceHandling === "payout_with_limit");

    if (
      salaryNeedsOvertimeRate &&
      (overtimeHourlyRate === null ||
        !Number.isFinite(overtimeHourlyRate) ||
        overtimeHourlyRate <= 0)
    ) {
      showToast({
        type: "warning",
        title: "Überstunden-Auszahlungssatz fehlt",
        description:
          "Bitte gib für den Gehaltsempfänger einen positiven Stundenwert für Überstundenauszahlungen ein.",
      });
      return;
    }

    const fixedAbsenceHours =
      editAbsenceCalculationType === "fixed" && editFixedAbsenceHours
        ? Number(editFixedAbsenceHours.replace(",", "."))
        : null;

    const absenceStartMinutes = Number(
      (editAbsenceStartMinutes || "0").replace(",", "."),
    );

    const dynamicAbsenceCapMinutes =
      editCapDynamicAbsenceMinutes && editDynamicAbsenceCapMinutes
        ? Number(editDynamicAbsenceCapMinutes.replace(",", "."))
        : null;

    const payoutLimitHours =
      editTimeAccountPeriod !== "none" &&
      editPositiveBalanceHandling === "payout_with_limit" &&
      editPayoutLimitHours
        ? Number(editPayoutLimitHours.replace(",", "."))
        : null;

    const openingBalanceHours = Number(
      (editOpeningBalanceHours || "0").replace(",", "."),
    );

    if (
      fixedAbsenceHours !== null &&
      (!Number.isFinite(fixedAbsenceHours) || fixedAbsenceHours < 0)
    ) {
      showToast({
        type: "warning",
        title: "Ungültige Abwesenheitsstunden",
        description: "Bitte gib gültige feste Abwesenheitsstunden ein.",
      });
      return;
    }

    if (
      isDynamicAbsenceType(editAbsenceCalculationType) &&
      (!Number.isFinite(absenceStartMinutes) || absenceStartMinutes < 0)
    ) {
      showToast({
        type: "warning",
        title: "Ungültiger Abwesenheits-Startwert",
        description: "Bitte gib einen gültigen Fallbackwert in Minuten ein.",
      });
      return;
    }

    if (
      editCapDynamicAbsenceMinutes &&
      (dynamicAbsenceCapMinutes === null ||
        !Number.isFinite(dynamicAbsenceCapMinutes) ||
        dynamicAbsenceCapMinutes < 0)
    ) {
      showToast({
        type: "warning",
        title: "Ungültiger Abwesenheits-Cap",
        description: "Bitte gib einen gültigen Maximalwert in Minuten ein.",
      });
      return;
    }

    if (
      payoutLimitHours !== null &&
      (!Number.isFinite(payoutLimitHours) || payoutLimitHours < 0)
    ) {
      showToast({
        type: "warning",
        title: "Ungültiges Auszahlungslimit",
        description: "Bitte gib ein gültiges Auszahlungslimit in Stunden ein.",
      });
      return;
    }

    if (!Number.isFinite(openingBalanceHours)) {
      showToast({
        type: "warning",
        title: "Ungültiger Startsaldo",
        description: "Bitte gib einen gültigen Startsaldo für das Arbeitszeitkonto ein.",
      });
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showToast({
        type: "error",
        title: "Betrieb nicht gefunden",
        description: "Die Mitarbeiterdaten konnten nicht gespeichert werden.",
      });
      return;
    }

    const employmentDatesChanged =
      editEmploymentStartDate !==
        (editingPayrollEmployee.employment_start_date ?? "") ||
      (editEmploymentEndDate || "") !==
        (editingPayrollEmployee.employment_end_date ?? "");

    const originalTimeAccountPeriod =
      editingPayrollEmployee.time_account_settings?.time_account_period ??
      "monthly";

    const targetBasisChanged =
      employmentDatesChanged ||
      editWorkdayPattern !==
        (editingPayrollEmployee.workday_pattern ?? "schedule_based") ||
      workDays !== editingPayrollEmployee.work_days_per_week ||
      !numberArraysEqual(
        editRegularWorkdays,
        editingPayrollEmployee.regular_workdays ?? [],
      ) ||
      weeklyTargetHours !== editingPayrollEmployee.weekly_target_hours ||
      monthlyTargetHours !== editingPayrollEmployee.monthly_target_hours ||
      editTimeAccountPeriod !== originalTimeAccountPeriod;

    if (employmentDatesChanged && !confirmClosedPeriodImpact) {
      const { data: impactRows, error: impactError } = await supabase.rpc(
        "check_employment_date_change_impact",
        {
          p_employee_id: editingPayrollEmployee.id,
          p_new_start_date: editEmploymentStartDate,
          p_new_end_date: editEmploymentEndDate || null,
        },
      );

      if (impactError) {
        console.error("EMPLOYMENT DATE IMPACT ERROR:", impactError);
        showToast({
          type: "error",
          title: "Auswirkungen konnten nicht geprüft werden",
          description: impactError.message,
        });
        return;
      }

      const impactCount = impactRows?.length ?? 0;

      if (impactCount > 0) {
        setEmploymentImpactCount(impactCount);
        setShowEmploymentImpactPopup(true);
        return;
      }
    }

    /*
     * Regelmäßige Wochentage zuerst synchronisieren.
     * Bei schedule_based werden alte fixe Zuordnungen entfernt.
     */
    const { error: regularWorkdayDeleteError } = await supabase
      .from("employee_regular_workdays")
      .delete()
      .eq("employee_id", editingPayrollEmployee.id);

    if (regularWorkdayDeleteError) {
      console.error("REGULAR WORKDAY DELETE ERROR:", regularWorkdayDeleteError);
      showToast({
        type: "error",
        title: "Regelmäßige Arbeitstage konnten nicht aktualisiert werden",
        description: regularWorkdayDeleteError.message,
      });
      return;
    }

    if (editWorkdayPattern === "fixed") {
      const { error: regularWorkdayInsertError } = await supabase
        .from("employee_regular_workdays")
        .insert(
          editRegularWorkdays.map((isoWeekday) => ({
            employee_id: editingPayrollEmployee.id,
            iso_weekday: isoWeekday,
          })),
        );

      if (regularWorkdayInsertError) {
        console.error("REGULAR WORKDAY INSERT ERROR:", regularWorkdayInsertError);
        showToast({
          type: "error",
          title: "Regelmäßige Arbeitstage konnten nicht gespeichert werden",
          description: regularWorkdayInsertError.message,
        });
        return;
      }
    }

    const { error: employeeUpdateError } = await supabase
      .from("employees")
      .update({
        birth_date: editBirthDate,
        employment_scope: editEmploymentScope,
        employment_type: editEmploymentType,
        vacation_days_per_year: vacationDaysPerYear,
        work_days_per_week: workDays,
        workday_pattern: editWorkdayPattern,
        wage_type: editWageType,
        hourly_rate:
          editWageType === "hourly" ||
          editWageType === "fixed_hourly" ||
          (editWageType === "salary" && editEligibleForSurcharges)
            ? hourlyRate
            : null,
        hourly_allowance_rate: hourlyAllowanceRate,
        monthly_salary: editWageType === "salary" ? monthlySalary : null,
        overtime_hourly_rate:
          editWageType === "salary" ? overtimeHourlyRate : null,
        datev_personnel_number: editDatevPersonnelNumber.trim() || null,
        cost_center: editCostCenter.trim() || null,
        eligible_for_surcharges: editEligibleForSurcharges,
      })
      .eq("id", editingPayrollEmployee.id)
      .eq("business_id", businessId);

    if (employeeUpdateError) {
      console.error("EMPLOYEE DATA UPDATE ERROR:", employeeUpdateError);

      showToast({
        type: "error",
        title: "Mitarbeiterdaten konnten nicht gespeichert werden",
        description: employeeUpdateError.message,
      });
      return;
    }

    if (employmentDatesChanged) {
      const { error: employmentDateUpdateError } = await supabase.rpc(
        "update_employee_employment_dates",
        {
          p_employee_id: editingPayrollEmployee.id,
          p_new_start_date: editEmploymentStartDate,
          p_new_end_date: editEmploymentEndDate || null,
          p_confirm_closed_period_impact: confirmClosedPeriodImpact,
        },
      );

      if (employmentDateUpdateError) {
        console.error("EMPLOYMENT DATE UPDATE ERROR:", employmentDateUpdateError);
        showToast({
          type: "error",
          title: "Eintritts-/Austrittsdatum konnte nicht gespeichert werden",
          description: employmentDateUpdateError.message,
        });
        return;
      }
    }

    const { data: existingTarget, error: targetLookupError } = await supabase
      .from("employee_target_hours")
      .select("id")
      .eq("employee_id", editingPayrollEmployee.id)
      .maybeSingle();

    if (targetLookupError) {
      console.error("TARGET HOURS LOOKUP ERROR:", targetLookupError);

      showToast({
        type: "error",
        title: "Sollstunden konnten nicht geprüft werden",
        description: targetLookupError.message,
      });
      return;
    }

    if (existingTarget) {
      const { error: targetUpdateError } = await supabase
        .from("employee_target_hours")
        .update({
          weekly_hours: weeklyTargetHours,
          monthly_hours: monthlyTargetHours,
        })
        .eq("id", existingTarget.id);

      if (targetUpdateError) {
        console.error("TARGET HOURS UPDATE ERROR:", targetUpdateError);

        showToast({
          type: "error",
          title: "Sollstunden konnten nicht gespeichert werden",
          description: targetUpdateError.message,
        });
        return;
      }
    } else {
      const { error: targetInsertError } = await supabase
        .from("employee_target_hours")
        .insert([
          {
            employee_id: editingPayrollEmployee.id,
            weekly_hours: weeklyTargetHours,
            monthly_hours: monthlyTargetHours,
          },
        ]);

      if (targetInsertError) {
        console.error("TARGET HOURS INSERT ERROR:", targetInsertError);

        showToast({
          type: "error",
          title: "Sollstunden konnten nicht gespeichert werden",
          description: targetInsertError.message,
        });
        return;
      }
    }

const {
  data: existingTimeAccountSettings,
  error: timeAccountLookupError,
} = await supabase
  .from("employee_time_account_settings")
  .select("id")
  .eq("employee_id", editingPayrollEmployee.id)
  .maybeSingle();

if (timeAccountLookupError) {
  console.error(
    "TIME ACCOUNT SETTINGS LOOKUP ERROR:",
    timeAccountLookupError,
  );

  showToast({
    type: "error",
    title: "Arbeitszeitkonto konnte nicht geprüft werden",
    description: timeAccountLookupError.message,
  });
  return;
}

const timeAccountPayload = {
  absence_calculation_type: editAbsenceCalculationType,
  fixed_absence_hours: fixedAbsenceHours,
  prefer_scheduled_shift_for_absence:
    editPreferScheduledShiftForAbsence,
  absence_start_minutes: isDynamicAbsenceType(editAbsenceCalculationType)
    ? Math.round(absenceStartMinutes)
    : null,
  cap_dynamic_absence_minutes:
    isDynamicAbsenceType(editAbsenceCalculationType) &&
    editCapDynamicAbsenceMinutes,
  dynamic_absence_cap_minutes:
    isDynamicAbsenceType(editAbsenceCalculationType) &&
    editCapDynamicAbsenceMinutes
      ? Math.round(dynamicAbsenceCapMinutes ?? 0)
      : null,
  three_month_average_basis:
    editAbsenceCalculationType === "three_month_average"
      ? editThreeMonthAverageBasis
      : null,
  time_account_period: editTimeAccountPeriod,
  positive_balance_handling:
    editTimeAccountPeriod === "none"
      ? "carry"
      : editPositiveBalanceHandling,
  payout_limit_hours:
    editTimeAccountPeriod === "none" ? null : payoutLimitHours,
  negative_balance_handling:
    editTimeAccountPeriod === "none"
      ? "carry"
      : editNegativeBalanceHandling,
  opening_balance_hours:
    editTimeAccountPeriod === "none" ? 0 : openingBalanceHours,
  updated_at: new Date().toISOString(),
};

if (existingTimeAccountSettings) {
  const { error: timeAccountUpdateError } = await supabase
    .from("employee_time_account_settings")
    .update(timeAccountPayload)
    .eq("id", existingTimeAccountSettings.id);

  if (timeAccountUpdateError) {
    console.error(
      "TIME ACCOUNT SETTINGS UPDATE ERROR:",
      timeAccountUpdateError,
    );

    showToast({
      type: "error",
      title:
        "Arbeitszeitkonto-Einstellungen konnten nicht gespeichert werden",
      description: timeAccountUpdateError.message,
    });
    return;
  }
} else {
  const { error: timeAccountInsertError } = await supabase
    .from("employee_time_account_settings")
    .insert([
      {
        employee_id: editingPayrollEmployee.id,
        ...timeAccountPayload,
      },
    ]);

  if (timeAccountInsertError) {
    console.error(
      "TIME ACCOUNT SETTINGS INSERT ERROR:",
      timeAccountInsertError,
    );

    showToast({
      type: "error",
      title:
        "Arbeitszeitkonto-Einstellungen konnten nicht gespeichert werden",
      description: timeAccountInsertError.message,
    });
    return;
  }
}

    if (targetBasisChanged) {
      try {
        await refreshOpenPayrollSnapshotsForTargetChange(
          editingPayrollEmployee.id,
        );
      } catch (payrollRefreshError) {
        console.error(
          "EMPLOYEE PAYROLL TARGET REFRESH ERROR:",
          payrollRefreshError,
        );

        showToast({
          type: "warning",
          title: "Offene Abrechnungen konnten nicht aktualisiert werden",
          description:
            "Die Mitarbeiterdaten wurden gespeichert, aber offene Payroll-Snapshots konnten nicht automatisch neu berechnet werden.",
        });
      }
    }

    const employeeName = editingPayrollEmployee.name;

    closeEmployeeEditDialog();
    await loadEmployees();

    showToast({
      type: "success",
      title: "Mitarbeiterdaten gespeichert",
      description: `Die Stamm- und Lohndaten von ${employeeName} wurden aktualisiert.`,
    });
    } finally {
      setIsSavingPayroll(false);
    }
  }

  const activeEmployees = employees
  .filter((employee) => employee.account_status === "active")
  .sort((firstEmployee, secondEmployee) =>
    firstEmployee.name.localeCompare(secondEmployee.name, "de-DE", {
      sensitivity: "base",
    }),
  );

const normalizedEmployeeSearch = employeeSearch.trim().toLowerCase();

const filteredActiveEmployees = activeEmployees.filter((employee) => {
  if (!normalizedEmployeeSearch) {
    return true;
  }

  return (
    employee.name.toLowerCase().includes(normalizedEmployeeSearch) ||
    employee.role.toLowerCase().includes(normalizedEmployeeSearch) ||
    employee.pin.toLowerCase().includes(normalizedEmployeeSearch)
  );
});

const visibleActiveEmployees = filteredActiveEmployees.slice(
  0,
  visibleEmployeeCount,
);

const hasMoreActiveEmployees =
  visibleActiveEmployees.length < filteredActiveEmployees.length;

const inactiveEmployees = employees
  .filter((employee) => employee.account_status === "inactive")
  .sort((firstEmployee, secondEmployee) =>
    firstEmployee.name.localeCompare(secondEmployee.name, "de-DE", {
      sensitivity: "base",
    }),
  );

  const activeEmployeesCount = activeEmployees.length;
  const inactiveEmployeesCount = inactiveEmployees.length;
  const invitedEmployeesCount = employees.filter(
    (employee) => employee.invite && !employee.invite.used_at,
  ).length;
  const registeredEmployeesCount = employees.filter(
    (employee) => employee.invite?.used_at,
  ).length;

  const selectedEmployee = expandedEmployeeId
    ? employees.find((employee) => employee.id === expandedEmployeeId) ?? null
    : null;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Mitarbeiter"
          description="Verwalte Mitarbeiter, Rollen, PINs, Lohndaten und Einladungen."
        />

        <StatsSkeleton />

        <Section
          title="Mitarbeiterübersicht"
          description="Alle aktiven Mitarbeiter deines Betriebs."
        >
          <TableSkeleton rows={6} columns={6} />
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mitarbeiter"
        description="Verwalte Mitarbeiter, Rollen, PINs, Lohndaten und Einladungen."
        action={
          <PageActions>


            <Button
            variant="primary"
            type="button"
            onClick={() => setShowForm(true)}
          >
            Mitarbeiter hinzufügen
          </Button>
          </PageActions>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Aktive Mitarbeiter" value={activeEmployeesCount} />

        <StatCard
          title="Deaktiviert"
          value={inactiveEmployeesCount}
          badge="Archiv"
          badgeVariant="muted"
        />

        <StatCard
          title="Offene Einladungen"
          value={invitedEmployeesCount}
          badge="Einladung"
          badgeVariant="primary"
        />

        <StatCard
          title="Registriert"
          value={registeredEmployeesCount}
          badge="Aktiv"
          badgeVariant="success"
        />
      </div>

      <Section
        title="Mitarbeiterübersicht"
        description="Alle aktiven Mitarbeiter deines Betriebs."
      >
        {showForm && (
          <div className="mb-6 rounded-3xl border border-[#D7DEE8] bg-[#EEF2F6] p-4 shadow-[0_6px_18px_rgba(15,23,42,0.08)] md:p-6">
            <h2 className="mb-4 text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
              Neuer Mitarbeiter
            </h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Input
                label="Name"
                type="text"
                placeholder="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSaving}
              />

              <Input
                label="Geburtsdatum"
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                disabled={isSaving}
              />

              <Input
                label="Eintrittsdatum"
                type="date"
                value={employmentStartDate}
                onChange={(event) => setEmploymentStartDate(event.target.value)}
                disabled={isSaving}
              />

              <Input
                label="Austrittsdatum"
                type="date"
                value={employmentEndDate}
                onChange={(event) => setEmploymentEndDate(event.target.value)}
                disabled={isSaving}
              />

              <Select
                label="Arbeitszeitmodell"
                value={employmentScope}
                onChange={(event) =>
                  setEmploymentScope(event.target.value as EmploymentScope)
                }
                disabled={isSaving}
                options={[
                  { value: "full_time", label: "Vollzeit" },
                  { value: "part_time", label: "Teilzeit" },
                ]}
              />

              <Select
                label="Beschäftigungsart"
                value={employmentType}
                onChange={(event) =>
                  setEmploymentType(event.target.value as EmploymentType)
                }
                disabled={isSaving}
                options={[
                  { value: "regular", label: "Reguläre Beschäftigung" },
                  { value: "minijob", label: "Minijob" },
                  { value: "working_student", label: "Werkstudent" },
                  { value: "trainee", label: "Ausbildung" },
                  {
                    value: "short_term",
                    label: "Kurzfristige Beschäftigung",
                  },
                  { value: "intern", label: "Praktikum" },
                ]}
              />

              <Select
                label="Rolle"
                value={role}
                onChange={(event) => setRole(event.target.value)}
                disabled={isSaving}
                options={[
                  ...(currentUserRole === "owner"
                    ? [{ value: "Admin", label: "Admin" }]
                    : []),
                  { value: "Mitarbeiter", label: "Mitarbeiter" },
                ]}
              />

              <Input
                label="PIN"
                type="text"
                placeholder="4-stellige PIN"
                value={pin}
                onChange={(event) => {
                  const onlyNumbers = event.target.value.replace(/\D/g, "");
                  setPin(onlyNumbers.slice(0, 4));
                }}
                disabled={isSaving}
                inputMode="numeric"
                maxLength={4}
              />

              <Select
                label="Arbeitsmuster"
                value={newWorkdayPattern}
                onChange={(event) =>
                  setNewWorkdayPattern(event.target.value as WorkdayPattern)
                }
                disabled={isSaving}
                options={[
                  { value: "schedule_based", label: "Wechselnde Tage nach Dienstplan" },
                  { value: "fixed", label: "Feste regelmäßige Wochentage" },
                ]}
              />

              {newWorkdayPattern === "schedule_based" && (
                <Input
                  label="Arbeitstage/Woche"
                  type="number"
                  min="1"
                  max="7"
                  placeholder="z. B. 5"
                  value={workDaysPerWeek}
                  onChange={(event) => setWorkDaysPerWeek(event.target.value)}
                  disabled={isSaving}
                />
              )}

              {newWorkdayPattern === "fixed" && (
                <div className="md:col-span-2 xl:col-span-2">
                  <p className="mb-2 text-sm font-medium text-[#334155]">
                    Regelmäßige Arbeitstage
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAY_OPTIONS.map((day) => {
                      const active = newRegularWorkdays.includes(day.value);
                      return (
                        <button
                          key={day.value}
                          type="button"
                          disabled={isSaving}
                          onClick={() =>
                            setNewRegularWorkdays((current) =>
                              active
                                ? current.filter((value) => value !== day.value)
                                : [...current, day.value].sort((a, b) => a - b),
                            )
                          }
                          className={[
                            "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                            active
                              ? "border-[#005CA8] bg-[#E8F2FB] text-[#005CA8]"
                              : "border-[#CBD5E1] bg-white text-[#475569] hover:border-[#94A3B8]",
                          ].join(" ")}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-[#64748B]">
                    {newRegularWorkdays.length} Arbeitstag(e) pro Woche
                  </p>
                </div>
              )}

              <Select
                label="Arbeitszeitkonto"
                value={newTimeAccountPeriod}
                onChange={(event) =>
                  setNewTimeAccountPeriod(event.target.value as TimeAccountPeriod)
                }
                disabled={isSaving}
                options={[
                  { value: "none", label: "Kein Arbeitszeitkonto" },
                  { value: "weekly", label: "Wochenkonto" },
                  { value: "monthly", label: "Monatskonto" },
                ]}
              />

              {newTimeAccountPeriod === "weekly" && (
                <Input
                  label="Wochen-Sollstunden"
                  type="number"
                  min="0"
                  step="0.25"
                  placeholder="z. B. 38"
                  value={weeklyHours}
                  onChange={(event) => setWeeklyHours(event.target.value)}
                  disabled={isSaving}
                />
              )}

              {newTimeAccountPeriod === "monthly" && (
                <Input
                  label="Monats-Sollstunden"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="z. B. 165,30"
                  value={monthlyHours}
                  onChange={(event) => setMonthlyHours(event.target.value)}
                  disabled={isSaving}
                />
              )}

              <Select
                label="Lohnart"
                value={newEmployeeWageType}
                onChange={(event) =>
                  setNewEmployeeWageType(
                    event.target.value as WageType,
                  )
                }
                disabled={isSaving}
                options={[
                  {
                    value: "hourly",
                    label: "Stundenlohn nach Iststunden",
                  },
                  {
                    value: "fixed_hourly",
                    label: "Fixer Monatslohn auf Stundenbasis",
                  },
                  {
                    value: "salary",
                    label: "Festes Monatsgehalt",
                  },
                ]}
              />

              {(newEmployeeWageType === "hourly" ||
                newEmployeeWageType === "fixed_hourly" ||
                (newEmployeeWageType === "salary" &&
                  newEmployeeEligibleForSurcharges)) && (
                <Input
                  label={
                    newEmployeeWageType === "salary"
                      ? "Grundstundenlohn für Zuschläge"
                      : "Stundenlohn"
                  }
                  type="text"
                  placeholder="z. B. 15,50"
                  value={newEmployeeHourlyRate}
                  onChange={(event) =>
                    setNewEmployeeHourlyRate(event.target.value)
                  }
                  disabled={isSaving}
                  inputMode="decimal"
                />
              )}

              <Input
                label="Stundenzulage / Stunde"
                type="text"
                placeholder="z. B. 2,50"
                value={newEmployeeHourlyAllowanceRate}
                onChange={(event) =>
                  setNewEmployeeHourlyAllowanceRate(event.target.value)
                }
                disabled={isSaving}
                inputMode="decimal"
              />

              {newEmployeeWageType === "salary" && (
                <Input
                  label="Monatsgehalt"
                  type="text"
                  placeholder="z. B. 2800,00"
                  value={newEmployeeMonthlySalary}
                  onChange={(event) =>
                    setNewEmployeeMonthlySalary(event.target.value)
                  }
                  disabled={isSaving}
                  inputMode="decimal"
                />
              )}

              <Select
                label="Zuschläge"
                value={newEmployeeEligibleForSurcharges ? "yes" : "no"}
                onChange={(event) =>
                  setNewEmployeeEligibleForSurcharges(event.target.value === "yes")
                }
                disabled={isSaving}
                options={[
                  { value: "yes", label: "Zuschlagsberechtigt" },
                  { value: "no", label: "Keine Zuschläge" },
                ]}
              />

              {newEmployeeWageType === "salary" &&
                newTimeAccountPeriod !== "none" &&
                (newPositiveBalanceHandling === "payout" ||
                  newPositiveBalanceHandling === "payout_with_limit") && (
                  <Input
                    label="Überstunden-Auszahlungssatz / Stunde"
                    type="text"
                    inputMode="decimal"
                    placeholder="z. B. 18,00"
                    value={newEmployeeOvertimeHourlyRate}
                    onChange={(event) =>
                      setNewEmployeeOvertimeHourlyRate(event.target.value)
                    }
                    disabled={isSaving}
                  />
                )}

              <Input
                label="DATEV-Personalnummer"
                type="text"
                placeholder="Optional"
                value={newEmployeeDatevPersonnelNumber}
                onChange={(event) =>
                  setNewEmployeeDatevPersonnelNumber(event.target.value)
                }
                disabled={isSaving}
              />

              <Input
                label="Kostenstelle"
                type="text"
                placeholder="Optional"
                value={newEmployeeCostCenter}
                onChange={(event) =>
                  setNewEmployeeCostCenter(event.target.value)
                }
                disabled={isSaving}
              />

              <Input
                label="Urlaubstage/Jahr"
                type="number"
                min="0"
                placeholder="z. B. 24"
                value={vacationDays}
                onChange={(event) => setVacationDays(event.target.value)}
                disabled={isSaving}
              />

              <Select
                label="Abwesenheitsbewertung"
                value={newAbsenceCalculationType}
                onChange={(event) =>
                  setNewAbsenceCalculationType(
                    event.target.value as AbsenceCalculationType,
                  )
                }
                disabled={isSaving}
                options={[
                  { value: "fixed", label: "Feste Stunden pro Abwesenheitstag" },
                  { value: "daily_average_13_weeks", label: "Tagesdurchschnitt aus 13 Wochen" },
                  { value: "weekly_average_13_weeks", label: "Wochendurchschnitt aus 13 Wochen" },
                  { value: "three_month_average", label: "3-Monats-Durchschnitt" },
                  { value: "twelve_month_average", label: "12-Monats-Durchschnitt" },
                ]}
              />

              {newAbsenceCalculationType === "fixed" && (
                <Input
                  label="Feste Abwesenheitsstunden"
                  type="text"
                  inputMode="decimal"
                  placeholder="z. B. 7,6"
                  value={newFixedAbsenceHours}
                  onChange={(event) => setNewFixedAbsenceHours(event.target.value)}
                  disabled={isSaving}
                />
              )}

              {isDynamicAbsenceType(newAbsenceCalculationType) && (
                <Input
                  label="Fallback bei fehlender Historie (Minuten)"
                  type="number"
                  min="0"
                  value={newAbsenceStartMinutes}
                  onChange={(event) => setNewAbsenceStartMinutes(event.target.value)}
                  disabled={isSaving}
                />
              )}

              {newAbsenceCalculationType === "three_month_average" && (
                <Select
                  label="3-Monats-Berechnungsbasis"
                  value={newThreeMonthAverageBasis}
                  onChange={(event) =>
                    setNewThreeMonthAverageBasis(
                      event.target.value as ThreeMonthAverageBasis,
                    )
                  }
                  disabled={isSaving}
                  options={[
                    { value: "possible_workdays", label: "Mögliche Arbeitstage (E2N)" },
                    { value: "social_security_days", label: "Sozialversicherungstage" },
                  ]}
                />
              )}

              {isDynamicAbsenceType(newAbsenceCalculationType) && (
                <Select
                  label="Dynamischen Abwesenheitswert begrenzen"
                  value={newCapDynamicAbsenceMinutes ? "yes" : "no"}
                  onChange={(event) =>
                    setNewCapDynamicAbsenceMinutes(event.target.value === "yes")
                  }
                  disabled={isSaving}
                  options={[
                    { value: "no", label: "Keine Begrenzung" },
                    { value: "yes", label: "Maximalwert verwenden" },
                  ]}
                />
              )}

              {isDynamicAbsenceType(newAbsenceCalculationType) &&
                newCapDynamicAbsenceMinutes && (
                  <Input
                    label="Maximalwert Abwesenheit (Minuten)"
                    type="number"
                    min="0"
                    value={newDynamicAbsenceCapMinutes}
                    onChange={(event) =>
                      setNewDynamicAbsenceCapMinutes(event.target.value)
                    }
                    disabled={isSaving}
                  />
                )}

              <Select
                label="Dienstplan bei Abwesenheit"
                value={newPreferScheduledShiftForAbsence ? "yes" : "no"}
                onChange={(event) =>
                  setNewPreferScheduledShiftForAbsence(event.target.value === "yes")
                }
                disabled={isSaving}
                options={[
                  { value: "yes", label: "Geplante Schicht bevorzugen" },
                  { value: "no", label: "Nur Bewertungsregel verwenden" },
                ]}
              />

              {newTimeAccountPeriod !== "none" && (
                <>
                  <Select
                    label="Plusstunden behandeln"
                    value={newPositiveBalanceHandling}
                    onChange={(event) =>
                      setNewPositiveBalanceHandling(
                        event.target.value as PositiveBalanceHandling,
                      )
                    }
                    disabled={isSaving}
                    options={[
                      { value: "carry", label: "Übertragen" },
                      { value: "payout", label: "Vollständig auszahlen" },
                      { value: "payout_with_limit", label: "Bis Limit auszahlen" },
                    ]}
                  />

                  {newPositiveBalanceHandling === "payout_with_limit" && (
                    <Input
                      label="Auszahlungslimit in Stunden"
                      type="text"
                      inputMode="decimal"
                      value={newPayoutLimitHours}
                      onChange={(event) => setNewPayoutLimitHours(event.target.value)}
                      disabled={isSaving}
                    />
                  )}

                  <Select
                    label="Minusstunden behandeln"
                    value={newNegativeBalanceHandling}
                    onChange={(event) =>
                      setNewNegativeBalanceHandling(
                        event.target.value as NegativeBalanceHandling,
                      )
                    }
                    disabled={isSaving}
                    options={[
                      { value: "carry", label: "Übertragen" },
                      { value: "ignore", label: "Nicht übertragen" },
                    ]}
                  />

                  <Input
                    label="Startsaldo Arbeitszeitkonto"
                    type="text"
                    inputMode="decimal"
                    value={newOpeningBalanceHours}
                    onChange={(event) => setNewOpeningBalanceHours(event.target.value)}
                    disabled={isSaving}
                  />
                </>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3 md:flex-row">
              <Button
                variant="primary"
                type="button"
                onClick={handleAddEmployee}
                loading={isSaving}
              >
                Speichern
              </Button>

              <Button
                variant="secondary"
                type="button"
                onClick={() => setShowForm(false)}
                disabled={isSaving}
              >
                Abbrechen
              </Button>
            </div>
          </div>
        )}

        {activeEmployees.length > 0 && (
  <div className="mb-6">
    <div className="relative">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]"
      >
        <path
          d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>

      <input
        type="search"
        value={employeeSearch}
        onChange={(event) => setEmployeeSearch(event.target.value)}
        placeholder="Mitarbeiter nach Name, Rolle oder PIN suchen..."
        className={[
          "h-12 w-full rounded-2xl border border-transparent bg-[#E9EEF4]",
          "pl-12 pr-12 text-sm text-[#0F172A] outline-none",
          "placeholder:text-[#64748B]",
          "transition hover:bg-[#E3E9F0]",
          "focus:border-[#60A5FA] focus:bg-white",
          "focus:ring-4 focus:ring-[#DBEAFE]",
        ].join(" ")}
      />

      {employeeSearch && (
        <button
          type="button"
          onClick={() => setEmployeeSearch("")}
          aria-label="Suche zurücksetzen"
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
        >
          <svg
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path
              d="m6 6 8 8m0-8-8 8"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>

    {employeeSearch && (
      <p className="mt-2 text-sm text-[#64748B]">
        {filteredActiveEmployees.length === 1
          ? "1 Mitarbeiter gefunden"
          : `${filteredActiveEmployees.length} Mitarbeiter gefunden`}
      </p>
    )}
  </div>
)}

{activeEmployees.length === 0 ? (
  <div className="rounded-3xl border border-dashed border-[#B8C4D1] bg-[#EEF2F6] px-6 py-12 text-center shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
    <h3 className="text-xl font-semibold text-[#0F172A]">
      Noch keine Mitarbeiter vorhanden
    </h3>

    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">
      Lege deinen ersten Mitarbeiter an, um Schichten zu planen,
      Arbeitszeiten zu erfassen und Einladungen zu versenden.
    </p>

    <div className="mt-6">
      <Button
        variant="primary"
        type="button"
        onClick={() => setShowForm(true)}
      >
        Ersten Mitarbeiter anlegen
      </Button>
    </div>
  </div>
) : filteredActiveEmployees.length === 0 ? (
  <div className="rounded-3xl border border-dashed border-[#B8C4D1] bg-[#EEF2F6] px-6 py-12 text-center shadow-[0_4px_14px_rgba(15,23,42,0.05)]">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F2FB] text-[#005CA8]">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="h-6 w-6"
      >
        <path
          d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </div>

    <h3 className="mt-4 text-xl font-semibold text-[#0F172A]">
      Kein Mitarbeiter gefunden
    </h3>

    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">
      Zu „{employeeSearch}“ wurde kein passender aktiver Mitarbeiter gefunden.
    </p>

    <div className="mt-5">
      <Button
        variant="secondary"
        type="button"
        onClick={() => setEmployeeSearch("")}
      >
        Suche zurücksetzen
      </Button>
    </div>
  </div>
) : (
  <div className={selectedEmployee ? "grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]" : "grid gap-5"}>
    <div className="rounded-[22px] border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:p-4">
      <div className={selectedEmployee ? "grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3" : "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"}>
        {visibleActiveEmployees.map((employee) => {
          const selected = expandedEmployeeId === employee.id;
          const inviteOpen = Boolean(employee.invite && !employee.invite.used_at);
          const isActive = employee.account_status === "active";
          const targetLabel =
            employee.time_account_settings?.time_account_period === "weekly"
              ? `${employee.weekly_target_hours} Std. / Woche`
              : employee.time_account_settings?.time_account_period === "none"
                ? "Kein Arbeitszeitkonto"
                : `${employee.monthly_target_hours} Std. / Monat`;
          const wageLabel =
            employee.wage_type === "salary"
              ? employee.monthly_salary != null
                ? `${formatEmployeeMoney(employee.monthly_salary)} / Monat`
                : "Monatsgehalt"
              : employee.hourly_rate != null
                ? `${formatEmployeeMoney(employee.hourly_rate)} / Std.`
                : "–";

          return (
            <button
              key={employee.id}
              type="button"
              onClick={() => {
                setExpandedEmployeeId(employee.id);
                setEmployeeDetailTab("overview");
              }}
              className={[
                "group w-full rounded-[18px] border bg-white p-4 text-left transition-all",
                selected
                  ? "border-[#93C5FD] shadow-[0_8px_24px_rgba(15,23,42,0.08)] ring-2 ring-[#DBEAFE]"
                  : "border-[#E2E8F0] shadow-[0_3px_12px_rgba(15,23,42,0.04)] hover:border-[#CBD5E1] hover:shadow-[0_8px_22px_rgba(15,23,42,0.07)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-sm font-bold text-[#2563EB]">
                    {getEmployeeInitials(employee.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#0F172A]">{employee.name}</p>
                    <p className="mt-0.5 truncate text-sm text-[#64748B]">{employee.role}</p>
                  </div>
                </div>

                <span
                  className={[
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                    inviteOpen
                      ? "bg-[#FFF7E8] text-[#B45309]"
                      : isActive
                        ? "bg-[#ECFDF3] text-[#047857]"
                        : "bg-[#F1F5F9] text-[#64748B]",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      inviteOpen ? "bg-[#F59E0B]" : isActive ? "bg-[#10B981]" : "bg-[#94A3B8]",
                    ].join(" ")}
                  />
                  {inviteOpen ? "Einladung offen" : isActive ? "Aktiv" : "Inaktiv"}
                </span>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[#64748B]">◷</span>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{targetLabel}</p>
                    <p className="text-xs text-[#94A3B8]">Sollstunden</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[#64748B]">◉</span>
                  <div>
                    <p className="text-sm font-semibold text-[#0F172A]">{wageLabel}</p>
                    <p className="text-xs text-[#94A3B8]">Vergütung</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex h-9 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-sm font-semibold text-[#334155] transition group-hover:bg-[#F1F5F9]">
                Details anzeigen <span className="ml-2">→</span>
              </div>
            </button>
          );
        })}
      </div>

      {hasMoreActiveEmployees && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            type="button"
            onClick={() =>
              setVisibleEmployeeCount((current) => current + EMPLOYEES_PER_PAGE)
            }
          >
            Weitere Mitarbeiter anzeigen
          </Button>
        </div>
      )}
    </div>

    {selectedEmployee && (
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="overflow-hidden rounded-[22px] border border-[#E2E8F0] bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
          <div className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#EFF6FF] text-lg font-bold text-[#2563EB]">
                  {getEmployeeInitials(selectedEmployee.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold text-[#0F172A]">{selectedEmployee.name}</h3>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ECFDF3] px-2.5 py-1 text-xs font-semibold text-[#047857]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" /> Aktiv
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[#64748B]">{selectedEmployee.role}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedEmployeeId(null)}
                aria-label="Mitarbeiterdetails schließen"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F8FAFC] text-xl text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex border-b border-[#E2E8F0] px-4">
            {([
              ["overview", "Übersicht"],
              ["documents", "Dokumente"],
              ["notes", "Notizen"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setEmployeeDetailTab(value)}
                className={[
                  "border-b-2 px-3 py-3 text-sm font-medium transition",
                  employeeDetailTab === value
                    ? "border-[#2563EB] text-[#2563EB]"
                    : "border-transparent text-[#64748B] hover:text-[#334155]",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          {employeeDetailTab === "overview" && (
            <div className="max-h-[62vh] overflow-y-auto p-5">
              <h4 className="text-sm font-semibold text-[#0F172A]">Persönliche Daten</h4>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3"><EmployeeDetailIcon name="calendar" /><div className="min-w-0"><p className="text-xs text-[#94A3B8]">Geburtsdatum</p><p className="mt-0.5 text-sm font-medium text-[#334155]">{formatEmployeeDate(selectedEmployee.birth_date)}</p></div></div>
                <div className="flex items-center gap-3"><EmployeeDetailIcon name="badge" /><div className="min-w-0"><p className="text-xs text-[#94A3B8]">Personalnummer</p><p className="mt-0.5 text-sm font-medium text-[#334155]">{selectedEmployee.datev_personnel_number || "–"}</p></div></div>
                <div className="flex items-center gap-3"><EmployeeDetailIcon name="calendar" /><div className="min-w-0"><p className="text-xs text-[#94A3B8]">Eintrittsdatum</p><p className="mt-0.5 text-sm font-medium text-[#334155]">{formatEmployeeDate(selectedEmployee.employment_start_date)}</p></div></div>
                <div className="flex items-center gap-3"><EmployeeDetailIcon name="calendar" /><div className="min-w-0"><p className="text-xs text-[#94A3B8]">Austrittsdatum</p><p className="mt-0.5 text-sm font-medium text-[#334155]">{formatEmployeeDate(selectedEmployee.employment_end_date)}</p></div></div>
              </div>

              <div className="my-5 border-t border-[#E2E8F0]" />
              <h4 className="text-sm font-semibold text-[#0F172A]">Beschäftigung</h4>
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-3"><EmployeeDetailIcon name="user" /><div className="min-w-0"><p className="text-xs text-[#94A3B8]">Rolle</p><p className="mt-0.5 text-sm font-medium text-[#334155]">{selectedEmployee.role}</p></div></div>
                <div className="flex items-center gap-3"><EmployeeDetailIcon name="clock" /><div className="min-w-0"><p className="text-xs text-[#94A3B8]">Arbeitszeitmodell</p><p className="mt-0.5 text-sm font-medium text-[#334155]">{employmentScopeLabel(selectedEmployee.employment_scope)}</p></div></div>
                <div className="flex items-center gap-3"><EmployeeDetailIcon name="clock" /><div className="min-w-0"><p className="text-xs text-[#94A3B8]">Wochen-Soll</p><p className="mt-0.5 text-sm font-medium text-[#334155]">{selectedEmployee.weekly_target_hours} Std.</p></div></div>
                <div className="flex items-center gap-3"><EmployeeDetailIcon name="clock" /><div className="min-w-0"><p className="text-xs text-[#94A3B8]">Monats-Soll</p><p className="mt-0.5 text-sm font-medium text-[#334155]">{selectedEmployee.monthly_target_hours} Std.</p></div></div>
                <div className="flex items-center gap-3"><EmployeeDetailIcon name="wallet" /><div className="min-w-0"><p className="text-xs text-[#94A3B8]">Vergütung</p><p className="mt-0.5 text-sm font-medium text-[#334155]">{selectedEmployee.wage_type === "salary" ? `${formatEmployeeMoney(selectedEmployee.monthly_salary)} / Monat` : `${formatEmployeeMoney(selectedEmployee.hourly_rate)} / Std.`}</p></div></div>
                <div className="flex items-center gap-3"><EmployeeDetailIcon name="vacation" /><div className="min-w-0"><p className="text-xs text-[#94A3B8]">Urlaub</p><p className="mt-0.5 text-sm font-medium text-[#334155]">{selectedEmployee.vacation_days_per_year} Tage / Jahr</p></div></div>
              </div>

              <div className="mt-6 grid gap-2">
                {canEditPayroll && (
                  <Button variant="primary" type="button" fullWidth onClick={() => handleOpenEditPayroll(selectedEmployee)}>
                    Bearbeiten
                  </Button>
                )}
                {canEditLocationTracking && (
                  <Button variant="secondary" type="button" fullWidth onClick={() => handleOpenLocationTracking(selectedEmployee)}>
                    Standort-Einstellungen
                  </Button>
                )}
                {selectedEmployee.invite && !selectedEmployee.invite.used_at ? (
                  <Button variant="secondary" type="button" fullWidth onClick={() => handleOpenExistingInvite(selectedEmployee)}>
                    Einladung öffnen
                  </Button>
                ) : !selectedEmployee.invite ? (
                  <Button variant="secondary" type="button" fullWidth onClick={() => void handleCreateMissingInvite(selectedEmployee)}>
                    Einladung erstellen
                  </Button>
                ) : null}
              </div>
            </div>
          )}

          {employeeDetailTab === "documents" && (
            <div className="max-h-[62vh] overflow-y-auto p-5">
              <EmployeeDocumentsCard employeeId={selectedEmployee.id} />
            </div>
          )}

          {employeeDetailTab === "notes" && (
            <div className="max-h-[62vh] overflow-y-auto p-5">
              {renderNotes(selectedEmployee)}
            </div>
          )}
        </div>
      </aside>
    )}
  </div>
)}

        {inactiveEmployees.length > 0 && (
  <div className="mt-8 border-t border-[#CBD5E1] pt-6">
    <Button
      variant="secondary"
      type="button"
      onClick={() =>
        setShowInactiveEmployees(!showInactiveEmployees)
      }
    >
      {showInactiveEmployees
        ? `Deaktivierte Mitarbeiter ausblenden (${inactiveEmployees.length})`
        : `Deaktivierte Mitarbeiter anzeigen (${inactiveEmployees.length})`}
    </Button>

    {showInactiveEmployees && (
      <div className="mt-4 flex flex-col gap-3">
        {inactiveEmployees.map((employee) => (
          <div
            key={employee.id}
            className="rounded-2xl border border-[#D7DEE8] bg-[#EEF2F6] p-4 shadow-[0_4px_12px_rgba(15,23,42,0.07)] transition hover:border-[#B8C4D1] hover:shadow-[0_6px_16px_rgba(15,23,42,0.10)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-[#0F172A]">
                  {employee.name}
                </p>

                <p className="text-sm text-[#64748B]">
                  {employee.role}
                </p>
              </div>

              <Button
                variant="primary"
                type="button"
                onClick={() =>
                  handleToggleAccountStatus(
                    employee.id,
                    employee.account_status,
                  )
                }
              >
                Reaktivieren
              </Button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}
      </Section>

      <DiperaPopup
        open={showPopup}
        message={popupMessage}
        onClose={() => setShowPopup(false)}
      />

      {createdEmployeeInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="border-b border-[#E2E8F0] px-6 py-5">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
                Mitarbeiter einladen
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Versende die Einladung für {createdEmployeeInvite.employeeName}
                per E-Mail, WhatsApp oder kopiere die Zugangsdaten.
              </p>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Einladungscode
                </p>
                <p className="mt-2 font-mono text-lg font-bold tracking-wide text-[#0F172A]">
                  {createdEmployeeInvite.inviteCode}
                </p>
              </div>

              <div>
                <Input
                  label="Einladung per E-Mail"
                  type="email"
                  placeholder="mitarbeiter@beispiel.de"
                  value={inviteEmail}
                  disabled={isSendingInviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                />

                <div className="mt-3">
                  <Button
                    variant="primary"
                    type="button"
                    fullWidth
                    loading={isSendingInviteEmail}
                    onClick={handleSendInviteEmail}
                  >
                    Einladung per E-Mail senden
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  onClick={handleOpenWhatsAppInvite}
                  className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm font-semibold text-white transition hover:bg-[#1DA851]"
                >
                  <FaWhatsapp className="h-5 w-5" />
                  Mit WhatsApp versenden
                </button>

                <Button
                  variant="secondary"
                  type="button"
                  fullWidth
                  loading={isCopyingInviteLink}
                  disabled={isSendingInviteEmail || isCopyingInviteCode}
                  onClick={handleCopyInviteLink}
                >
                  Einladungslink kopieren
                </Button>

              </div>

              <p className="text-xs leading-5 text-[#64748B]">
                Der Einladungscode wird über den Link automatisch übernommen. Bei einer
                E-Mail-Einladung wird die hinterlegte E-Mail-Adresse verwendet. Bei einer
                WhatsApp-Einladung gibt der Mitarbeiter seine E-Mail-Adresse selbst ein und
                bestätigt sie anschließend.
              </p>
            </div>

            <div className="flex justify-end border-t border-[#E2E8F0] px-6 py-5">
              <Button
                variant="secondary"
                type="button"
                disabled={
                  isSendingInviteEmail ||
                  isCopyingInviteLink ||
                  isCopyingInviteCode
                }
                onClick={closeCreatedEmployeeInvite}
              >
                Später erledigen
              </Button>
            </div>
          </div>
        </div>
      )}

      <DiperaPopup
        open={showEmployeeLimitPopup}
        variant="upgrade"
        title="Mitarbeiterlimit erreicht"
        highlight={
          employeeLimit !== null
            ? `Bis zu ${employeeLimit} aktive Mitarbeiter`
            : undefined
        }
        message="Du hast die maximale Mitarbeiterzahl deines aktuellen Pakets erreicht. Öffne die Abo-Verwaltung, um dein Paket zu erweitern."
        confirmText="Abo verwalten"
        cancelText="Abbrechen"
        isConfirmLoading={isOpeningBillingPortal}
        closeOnBackdropClick={!isOpeningBillingPortal}
        onClose={() => {
          if (isOpeningBillingPortal) return;
          setShowEmployeeLimitPopup(false);
        }}
        onConfirm={() => void handleOpenBillingPortal()}
      />

      <DiperaPopup
        open={Boolean(employeeToDelete)}
        message="Möchtest du diesen Mitarbeiter wirklich löschen?"
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={() => {
          if (!employeeToDelete) return;
          handleDeleteEmployee(employeeToDelete);
          setEmployeeToDelete(null);
        }}
        confirmText="Löschen"
        cancelText="Abbrechen"
      />

      <DiperaPopup
        open={Boolean(noteToDelete)}
        message="Möchtest du diese Notiz wirklich löschen?"
        onClose={() => setNoteToDelete(null)}
        onConfirm={() => {
          if (!noteToDelete) return;
          handleDeleteNote(noteToDelete);
          setNoteToDelete(null);
        }}
        confirmText="Löschen"
        cancelText="Abbrechen"
      />

      <DiperaPopup
        open={showEmploymentImpactPopup}
        title="Geschlossene Abrechnungen betroffen"
        message={`Die Änderung von Eintritts- oder Austrittsdatum betrifft ${employmentImpactCount} bereits geschlossene Abrechnungsperiode(n). Die historischen Abrechnungen werden nicht automatisch verändert. Möchtest du die Stammdaten trotzdem ändern?`}
        confirmText="Trotzdem ändern"
        cancelText="Abbrechen"
        onClose={() => setShowEmploymentImpactPopup(false)}
        onConfirm={() => {
          setShowEmploymentImpactPopup(false);
          void handleSaveEmployeePayroll(true);
        }}
      />

      {editingLocationEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="border-b border-[#E2E8F0] px-6 py-5">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
                Standortprüfung
              </h2>

              <p className="mt-1 text-sm text-[#64748B]">
                {editingLocationEmployee.name}
              </p>
            </div>

            <div className="space-y-5 p-6">
              <Select
                label="Regel für die Zeiterfassung"
                value={editLocationTrackingMode}
                disabled={isSavingLocationTracking}
                onChange={(event) =>
                  setEditLocationTrackingMode(
                    event.target.value as LocationTrackingMode,
                  )
                }
                options={[
                  {
                    value: "required",
                    label: "Standort erforderlich",
                  },
                  {
                    value: "remote_allowed",
                    label: "Mobiles Arbeiten erlaubt",
                  },
                  {
                    value: "disabled",
                    label: "Standortprüfung deaktiviert",
                  },
                ]}
              />

              <div className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
                <p className="text-sm font-semibold text-[#0F172A]">
                  {editLocationTrackingMode === "required" &&
                    "Stempeln ist nur innerhalb eines aktiven Betriebsstandorts möglich."}

                  {editLocationTrackingMode === "remote_allowed" &&
                    "Der Standort wird weiterhin erfasst. Stempeln außerhalb des Betriebs ist jedoch erlaubt."}

                  {editLocationTrackingMode === "disabled" &&
                    "Beim Stempeln wird keine GPS-Position angefordert oder geprüft."}
                </p>
              </div>

              <Textarea
                value={editLocationTrackingNote}
                disabled={isSavingLocationTracking}
                onChange={(event) =>
                  setEditLocationTrackingNote(event.target.value)
                }
                placeholder="Interner Hinweis, z. B. regelmäßiges Homeoffice am Dienstag und Donnerstag"
                className="min-h-28"
              />

              <p className="text-xs leading-5 text-[#64748B]">
                Dieser Hinweis ist intern und wird bei erlaubten
                Standortausnahmen zusammen mit der Stempelung protokolliert.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-[#E2E8F0] px-6 py-5 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                type="button"
                disabled={isSavingLocationTracking}
                onClick={() => {
                  setEditingLocationEmployee(null);
                  setEditLocationTrackingMode("required");
                  setEditLocationTrackingNote("");
                }}
              >
                Abbrechen
              </Button>

              <Button
                variant="primary"
                type="button"
                loading={isSavingLocationTracking}
                onClick={handleSaveLocationTracking}
              >
                Speichern
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingPayrollEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white px-6 py-5">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
                Mitarbeiterdaten bearbeiten
              </h2>
              <p className="mt-1 text-sm text-[#64748B]">
                {editingPayrollEmployee.name}
              </p>
            </div>

            <div className="space-y-8 p-6">
              <div>
                <h3 className="text-lg font-semibold text-[#0F172A]">
                  Beschäftigungsdaten
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Input
                    label="Geburtsdatum"
                    type="date"
                    value={editBirthDate}
                    onChange={(event) => setEditBirthDate(event.target.value)}
                  />

                  <Input
                    label="Eintrittsdatum"
                    type="date"
                    value={editEmploymentStartDate}
                    onChange={(event) =>
                      setEditEmploymentStartDate(event.target.value)
                    }
                  />

                  <Input
                    label="Austrittsdatum"
                    type="date"
                    value={editEmploymentEndDate}
                    onChange={(event) =>
                      setEditEmploymentEndDate(event.target.value)
                    }
                  />

                  <Select
                    label="Arbeitszeitmodell"
                    value={editEmploymentScope}
                    onChange={(event) =>
                      setEditEmploymentScope(
                        event.target.value as EmploymentScope,
                      )
                    }
                    options={[
                      { value: "full_time", label: "Vollzeit" },
                      { value: "part_time", label: "Teilzeit" },
                    ]}
                  />

                  <Select
                    label="Beschäftigungsart"
                    value={editEmploymentType}
                    onChange={(event) =>
                      setEditEmploymentType(
                        event.target.value as EmploymentType,
                      )
                    }
                    options={[
                      { value: "regular", label: "Reguläre Beschäftigung" },
                      { value: "minijob", label: "Minijob" },
                      { value: "working_student", label: "Werkstudent" },
                      { value: "trainee", label: "Ausbildung" },
                      {
                        value: "short_term",
                        label: "Kurzfristige Beschäftigung",
                      },
                      { value: "intern", label: "Praktikum" },
                    ]}
                  />

                  <Select
                    label="Arbeitsmuster"
                    value={editWorkdayPattern}
                    onChange={(event) =>
                      setEditWorkdayPattern(
                        event.target.value as WorkdayPattern,
                      )
                    }
                    options={[
                      { value: "schedule_based", label: "Wechselnde Tage nach Dienstplan" },
                      { value: "fixed", label: "Feste regelmäßige Wochentage" },
                    ]}
                  />

                  {editWorkdayPattern === "schedule_based" && (
                    <Input
                      label="Arbeitstage/Woche"
                      type="number"
                      min="1"
                      max="7"
                      value={editWorkDaysPerWeek}
                      onChange={(event) =>
                        setEditWorkDaysPerWeek(event.target.value)
                      }
                    />
                  )}

                  {editWorkdayPattern === "fixed" && (
                    <div className="md:col-span-2 xl:col-span-2">
                      <p className="mb-2 text-sm font-medium text-[#334155]">
                        Regelmäßige Arbeitstage
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {WEEKDAY_OPTIONS.map((day) => {
                          const active = editRegularWorkdays.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() =>
                                setEditRegularWorkdays((current) =>
                                  active
                                    ? current.filter((value) => value !== day.value)
                                    : [...current, day.value].sort((a, b) => a - b),
                                )
                              }
                              className={[
                                "rounded-xl border px-3 py-2 text-sm font-semibold transition",
                                active
                                  ? "border-[#005CA8] bg-[#E8F2FB] text-[#005CA8]"
                                  : "border-[#CBD5E1] bg-white text-[#475569] hover:border-[#94A3B8]",
                              ].join(" ")}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-xs text-[#64748B]">
                        {editRegularWorkdays.length} Arbeitstag(e) pro Woche
                      </p>
                    </div>
                  )}

                  <Input
                    label="Urlaubstage/Jahr"
                    type="number"
                    min="0"
                    step="0.5"
                    value={editVacationDays}
                    onChange={(event) =>
                      setEditVacationDays(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] pt-6">
                <h3 className="text-lg font-semibold text-[#0F172A]">
                  Vertrags- und Sollstunden
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {editTimeAccountPeriod === "weekly" && (
                    <Input
                      label="Wochen-Sollstunden"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editWeeklyHours}
                      onChange={(event) =>
                        setEditWeeklyHours(event.target.value)
                      }
                    />
                  )}

                  {editTimeAccountPeriod === "monthly" && (
                    <Input
                      label="Monats-Sollstunden"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editMonthlyHours}
                      onChange={(event) =>
                        setEditMonthlyHours(event.target.value)
                      }
                    />
                  )}

                  {editTimeAccountPeriod === "none" && (
                    <p className="text-sm text-[#64748B]">
                      Für Mitarbeiter ohne Arbeitszeitkonto ist keine Zeitkonto-Sollperiode aktiv.
                    </p>
                  )}
                </div>

                <p className="mt-3 text-xs leading-5 text-[#64748B]">
                  Wochen- und Monats-Sollstunden sind eigenständige
                  Vertragswerte und werden nicht automatisch ineinander
                  umgerechnet.
                </p>
              </div>

              <div className="border-t border-[#E2E8F0] pt-6">
  <h3 className="text-lg font-semibold text-[#0F172A]">
    Arbeitszeitkonto & Abwesenheiten
  </h3>

  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    <Select
      label="Abwesenheitsbewertung"
      value={editAbsenceCalculationType}
      onChange={(event) =>
        setEditAbsenceCalculationType(
          event.target.value as AbsenceCalculationType,
        )
      }
      options={[
        {
          value: "fixed",
          label: "Feste Stunden pro Abwesenheitstag",
        },
        {
          value: "daily_average_13_weeks",
          label: "Tagesdurchschnitt aus 13 Wochen",
        },
        {
          value: "weekly_average_13_weeks",
          label: "Wochendurchschnitt aus 13 Wochen",
        },
        {
          value: "three_month_average",
          label: "3-Monats-Durchschnitt",
        },
        {
          value: "twelve_month_average",
          label: "12-Monats-Durchschnitt",
        },
      ]}
    />

    {editAbsenceCalculationType === "fixed" && (
      <Input
        label="Feste Abwesenheitsstunden"
        type="text"
        inputMode="decimal"
        placeholder="z. B. 7,60"
        value={editFixedAbsenceHours}
        onChange={(event) =>
          setEditFixedAbsenceHours(event.target.value)
        }
      />
    )}

    {isDynamicAbsenceType(editAbsenceCalculationType) && (
      <Input
        label="Fallback bei fehlender Historie (Minuten)"
        type="number"
        min="0"
        value={editAbsenceStartMinutes}
        onChange={(event) =>
          setEditAbsenceStartMinutes(event.target.value)
        }
      />
    )}

    {editAbsenceCalculationType === "three_month_average" && (
      <Select
        label="3-Monats-Berechnungsbasis"
        value={editThreeMonthAverageBasis}
        onChange={(event) =>
          setEditThreeMonthAverageBasis(
            event.target.value as ThreeMonthAverageBasis,
          )
        }
        options={[
          { value: "possible_workdays", label: "Mögliche Arbeitstage (E2N)" },
          { value: "social_security_days", label: "Sozialversicherungstage" },
        ]}
      />
    )}

    {isDynamicAbsenceType(editAbsenceCalculationType) && (
      <Select
        label="Dynamischen Abwesenheitswert begrenzen"
        value={editCapDynamicAbsenceMinutes ? "yes" : "no"}
        onChange={(event) =>
          setEditCapDynamicAbsenceMinutes(event.target.value === "yes")
        }
        options={[
          { value: "no", label: "Keine Begrenzung" },
          { value: "yes", label: "Maximalwert verwenden" },
        ]}
      />
    )}

    {isDynamicAbsenceType(editAbsenceCalculationType) &&
      editCapDynamicAbsenceMinutes && (
        <Input
          label="Maximalwert Abwesenheit (Minuten)"
          type="number"
          min="0"
          value={editDynamicAbsenceCapMinutes}
          onChange={(event) =>
            setEditDynamicAbsenceCapMinutes(event.target.value)
          }
        />
      )}

    <Select
      label="Dienstplan bei Abwesenheit"
      value={
        editPreferScheduledShiftForAbsence ? "yes" : "no"
      }
      onChange={(event) =>
        setEditPreferScheduledShiftForAbsence(
          event.target.value === "yes",
        )
      }
      options={[
        {
          value: "yes",
          label: "Geplante Schicht bevorzugen",
        },
        {
          value: "no",
          label: "Nur Bewertungsregel verwenden",
        },
      ]}
    />

    <Select
      label="Arbeitszeitkonto"
      value={editTimeAccountPeriod}
      onChange={(event) =>
        setEditTimeAccountPeriod(
          event.target.value as TimeAccountPeriod,
        )
      }
      options={[
        {
          value: "none",
          label: "Kein Arbeitszeitkonto",
        },
        {
          value: "weekly",
          label: "Wochenkonto",
        },
        {
          value: "monthly",
          label: "Monatskonto",
        },
      ]}
    />

    {editTimeAccountPeriod !== "none" && (
      <>
        <Select
          label="Plusstunden behandeln"
          value={editPositiveBalanceHandling}
          onChange={(event) =>
            setEditPositiveBalanceHandling(
              event.target.value as PositiveBalanceHandling,
            )
          }
          options={[
            { value: "carry", label: "Auf Arbeitszeitkonto übertragen" },
            { value: "payout", label: "Vollständig auszahlen" },
            { value: "payout_with_limit", label: "Bis Limit auszahlen, Rest übertragen" },
          ]}
        />

        {editPositiveBalanceHandling === "payout_with_limit" && (
          <Input
            label="Auszahlungslimit in Stunden"
            type="text"
            inputMode="decimal"
            placeholder="z. B. 10"
            value={editPayoutLimitHours}
            onChange={(event) =>
              setEditPayoutLimitHours(event.target.value)
            }
          />
        )}

        <Select
          label="Minusstunden behandeln"
          value={editNegativeBalanceHandling}
          onChange={(event) =>
            setEditNegativeBalanceHandling(
              event.target.value as NegativeBalanceHandling,
            )
          }
          options={[
            { value: "carry", label: "Auf Arbeitszeitkonto übertragen" },
            { value: "ignore", label: "Nicht übertragen" },
          ]}
        />

        <Input
          label="Startsaldo Arbeitszeitkonto"
          type="text"
          inputMode="decimal"
          placeholder="z. B. 17,50 oder -8,25"
          value={editOpeningBalanceHours}
          onChange={(event) =>
            setEditOpeningBalanceHours(event.target.value)
          }
        />
      </>
    )}
              </div>

              <p className="mt-3 text-xs leading-5 text-[#64748B]">
                Der Startsaldo dient z. B. zur Übernahme bestehender Plus- oder
                Minusstunden beim Wechsel aus einem anderen Zeiterfassungssystem.
              </p>
            </div>

              <div className="border-t border-[#E2E8F0] pt-6">
                <h3 className="text-lg font-semibold text-[#0F172A]">
                  Vergütung und DATEV
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Select
                    label="Lohnart"
                    value={editWageType}
                    onChange={(event) =>
                      setEditWageType(event.target.value as WageType)
                    }
                    options={[
                      {
                        value: "hourly",
                        label: "Stundenlohn nach Iststunden",
                      },
                      {
                        value: "fixed_hourly",
                        label: "Fixer Monatslohn auf Stundenbasis",
                      },
                      {
                        value: "salary",
                        label: "Festes Monatsgehalt",
                      },
                    ]}
                  />

                  {(editWageType === "hourly" ||
                    editWageType === "fixed_hourly" ||
                    (editWageType === "salary" && editEligibleForSurcharges)) && (
                    <Input
                      label={
                        editWageType === "salary"
                          ? "Grundstundenlohn für Zuschläge"
                          : "Stundenlohn"
                      }
                      type="text"
                      inputMode="decimal"
                      placeholder="z. B. 15,50"
                      value={editHourlyRate}
                      onChange={(event) =>
                        setEditHourlyRate(event.target.value)
                      }
                    />
                  )}

                  <Input
                    label="Stundenzulage / Stunde"
                    type="text"
                    inputMode="decimal"
                    placeholder="z. B. 2,50"
                    value={editHourlyAllowanceRate}
                    onChange={(event) =>
                      setEditHourlyAllowanceRate(event.target.value)
                    }
                  />

                  {editWageType === "salary" && (
                    <Input
                      label="Monatsgehalt"
                      type="text"
                      inputMode="decimal"
                      placeholder="z. B. 2800,00"
                      value={editMonthlySalary}
                      onChange={(event) =>
                        setEditMonthlySalary(event.target.value)
                      }
                    />
                  )}

                  <Input
                    label="DATEV-Personalnummer"
                    type="text"
                    placeholder="Optional"
                    value={editDatevPersonnelNumber}
                    onChange={(event) =>
                      setEditDatevPersonnelNumber(event.target.value)
                    }
                  />

                  <Input
                    label="Kostenstelle"
                    type="text"
                    placeholder="Optional"
                    value={editCostCenter}
                    onChange={(event) =>
                      setEditCostCenter(event.target.value)
                    }
                  />

                  <Select
                    label="Zuschläge"
                    value={editEligibleForSurcharges ? "yes" : "no"}
                    onChange={(event) =>
                      setEditEligibleForSurcharges(
                        event.target.value === "yes",
                      )
                    }
                    options={[
                      { value: "yes", label: "Zuschlagsberechtigt" },
                      { value: "no", label: "Keine Zuschläge" },
                    ]}
                  />

                  {editWageType === "salary" &&
                    editTimeAccountPeriod !== "none" &&
                    (editPositiveBalanceHandling === "payout" ||
                      editPositiveBalanceHandling === "payout_with_limit") && (
                      <Input
                        label="Überstunden-Auszahlungssatz / Stunde"
                        type="text"
                        inputMode="decimal"
                        placeholder="z. B. 18,00"
                        value={editOvertimeHourlyRate}
                        onChange={(event) =>
                          setEditOvertimeHourlyRate(event.target.value)
                        }
                      />
                    )}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[#E2E8F0] bg-white px-6 py-5 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                type="button"
                onClick={closeEmployeeEditDialog}
              >
                Abbrechen
              </Button>

              <Button
                variant="primary"
                type="button"
                loading={isSavingPayroll}
                onClick={() => void handleSaveEmployeePayroll(false)}
              >
                Änderungen speichern
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

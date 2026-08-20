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
import EmployeeCard from "@/components/employees/EmployeeCard";

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

type EmployeeTimeAccountSettings = {
  id: string;
  employee_id: string;

  absence_calculation_type: AbsenceCalculationType;
  fixed_absence_hours: number | null;
  prefer_scheduled_shift_for_absence: boolean;

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
  wage_type?: WageType;
  hourly_rate?: number | null;
  monthly_salary?: number | null;
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
};

type CreatedEmployeeInvite = {
  employeeId: string;
  employeeName: string;
  inviteCode: string;
  email: string | null;
  deliveryMethod: "email" | "whatsapp";
};



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

  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const [showEmployeeLimitPopup, setShowEmployeeLimitPopup] = useState(false);
  const [employeeLimit, setEmployeeLimit] = useState<number | null>(null);
  const [isOpeningBillingPortal, setIsOpeningBillingPortal] = useState(false);

  const [newEmployeeWageType, setNewEmployeeWageType] = useState<WageType>("hourly");

  const [newEmployeeHourlyRate, setNewEmployeeHourlyRate] = useState("");
  const [newEmployeeMonthlySalary, setNewEmployeeMonthlySalary] = useState("");
  const [newEmployeeDatevPersonnelNumber, setNewEmployeeDatevPersonnelNumber] =
    useState("");
  const [newEmployeeCostCenter, setNewEmployeeCostCenter] = useState("");

  const [editingPayrollEmployee, setEditingPayrollEmployee] =
    useState<EmployeeWithTargetHours | null>(null);

  const [editWageType, setEditWageType] = useState<WageType>("hourly");

  const [editHourlyRate, setEditHourlyRate] = useState("");
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

  const [editAbsenceCalculationType, setEditAbsenceCalculationType] =
  useState<AbsenceCalculationType>("daily_average_13_weeks");

const [editFixedAbsenceHours, setEditFixedAbsenceHours] = useState("");

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
          "id, name, role, pin, status, account_status, hours, vacation_days_per_year, work_days_per_week, wage_type, hourly_rate, monthly_salary, datev_personnel_number, cost_center, eligible_for_surcharges, birth_date, employment_start_date, employment_end_date, employment_scope, employment_type, location_tracking_mode, location_tracking_note",
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
  !Number.isFinite(parsedWeeklyHours) ||
  parsedWeeklyHours <= 0
) {
  showToast({
    type: "warning",
    title: "Ungültige Wochen-Sollstunden",
    description:
      "Bitte gib gültige Wochen-Sollstunden ein.",
  });

  return;
}

if (
  !Number.isFinite(parsedMonthlyHours) ||
  parsedMonthlyHours <= 0
) {
  showToast({
    type: "warning",
    title: "Ungültige Monats-Sollstunden",
    description:
      "Bitte gib gültige Monats-Sollstunden ein.",
  });

  return;
}

      const parsedVacationDays = vacationDays ? Number(vacationDays) : 24;
      const parsedWorkDays = Number(workDaysPerWeek);

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

      const parsedMonthlySalary = newEmployeeMonthlySalary
        ? Number(newEmployeeMonthlySalary.replace(",", "."))
        : null;

      if (
        (newEmployeeWageType === "hourly" ||
          newEmployeeWageType === "fixed_hourly") &&
        parsedHourlyRate !== null &&
        (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate < 0)
      ) {
        showToast({
          type: "warning",
          title: "Ungültiger Stundenlohn",
          description: "Bitte gib einen gültigen Stundenlohn ein.",
        });
        return;
      }

      if (
        newEmployeeWageType === "salary" &&
        parsedMonthlySalary !== null &&
        (!Number.isFinite(parsedMonthlySalary) || parsedMonthlySalary < 0)
      ) {
        showToast({
          type: "warning",
          title: "Ungültiges Monatsgehalt",
          description: "Bitte gib ein gültiges Monatsgehalt ein.",
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
            wage_type: newEmployeeWageType,
            hourly_rate:
              newEmployeeWageType === "hourly" ||
              newEmployeeWageType === "fixed_hourly"
                ? parsedHourlyRate
                : null,
            monthly_salary:
              newEmployeeWageType === "salary" ? parsedMonthlySalary : null,
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
      setNewEmployeeWageType("hourly");
      setNewEmployeeHourlyRate("");
      setNewEmployeeMonthlySalary("");
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
                className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:border-[#CBD5E1]"
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

  setEditMonthlySalary(
    employee.monthly_salary !== null &&
      employee.monthly_salary !== undefined
      ? String(employee.monthly_salary)
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
    setEditAbsenceCalculationType("daily_average_13_weeks");
    setEditFixedAbsenceHours("");
    setEditPreferScheduledShiftForAbsence(true);
    setEditTimeAccountPeriod("monthly");
    setEditPositiveBalanceHandling("carry");
    setEditPayoutLimitHours("");
    setEditNegativeBalanceHandling("carry");
    setEditOpeningBalanceHours("0");
  }

  async function handleSaveEmployeePayroll() {
    if (!editingPayrollEmployee) return;

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
    const workDays = Number(editWorkDaysPerWeek);

    if (!Number.isFinite(weeklyTargetHours) || weeklyTargetHours <= 0) {
      showToast({
        type: "warning",
        title: "Ungültige Wochen-Sollstunden",
        description: "Bitte gib gültige Wochen-Sollstunden ein.",
      });
      return;
    }

    if (!Number.isFinite(monthlyTargetHours) || monthlyTargetHours <= 0) {
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

    const hourlyRate =
      (editWageType === "hourly" || editWageType === "fixed_hourly") &&
      editHourlyRate
        ? Number(editHourlyRate.replace(",", "."))
        : null;

    const monthlySalary =
      editWageType === "salary" && editMonthlySalary
        ? Number(editMonthlySalary.replace(",", "."))
        : null;

    if (
      (editWageType === "hourly" || editWageType === "fixed_hourly") &&
      (hourlyRate === null || !Number.isFinite(hourlyRate) || hourlyRate < 0)
    ) {
      showToast({
        type: "warning",
        title: "Ungültiger Stundenlohn",
        description: "Bitte gib einen gültigen Stundenlohn ein.",
      });
      return;
    }

    if (
      editWageType === "salary" &&
      (monthlySalary === null ||
        !Number.isFinite(monthlySalary) ||
        monthlySalary < 0)
    ) {
      showToast({
        type: "warning",
        title: "Ungültiges Monatsgehalt",
        description: "Bitte gib ein gültiges Monatsgehalt ein.",
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

    const { error: employeeUpdateError } = await supabase
      .from("employees")
      .update({
        birth_date: editBirthDate,
        employment_start_date: editEmploymentStartDate,
        employment_end_date: editEmploymentEndDate || null,
        employment_scope: editEmploymentScope,
        employment_type: editEmploymentType,
        vacation_days_per_year: vacationDaysPerYear,
        work_days_per_week: workDays,
        wage_type: editWageType,
        hourly_rate:
          editWageType === "hourly" || editWageType === "fixed_hourly"
            ? hourlyRate
            : null,
        monthly_salary: editWageType === "salary" ? monthlySalary : null,
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

    const fixedAbsenceHours =
  editAbsenceCalculationType === "fixed" &&
  editFixedAbsenceHours
    ? Number(editFixedAbsenceHours.replace(",", "."))
    : null;

const payoutLimitHours =
  editPositiveBalanceHandling === "payout_with_limit" &&
  editPayoutLimitHours
    ? Number(editPayoutLimitHours.replace(",", "."))
    : null;

const openingBalanceHours =
  Number(editOpeningBalanceHours.replace(",", "."));

if (
  fixedAbsenceHours !== null &&
  (!Number.isFinite(fixedAbsenceHours) || fixedAbsenceHours < 0)
) {
  showToast({
    type: "warning",
    title: "Ungültige Abwesenheitsstunden",
    description:
      "Bitte gib gültige feste Abwesenheitsstunden ein.",
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
    description:
      "Bitte gib ein gültiges Auszahlungslimit in Stunden ein.",
  });
  return;
}

if (!Number.isFinite(openingBalanceHours)) {
  showToast({
    type: "warning",
    title: "Ungültiger Startsaldo",
    description:
      "Bitte gib einen gültigen Startsaldo für das Arbeitszeitkonto ein.",
  });
  return;
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
  time_account_period: editTimeAccountPeriod,
  positive_balance_handling:
    editPositiveBalanceHandling,
  payout_limit_hours: payoutLimitHours,
  negative_balance_handling:
    editNegativeBalanceHandling,
  opening_balance_hours: openingBalanceHours,
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

    const employeeName = editingPayrollEmployee.name;

    closeEmployeeEditDialog();
    await loadEmployees();

    showToast({
      type: "success",
      title: "Mitarbeiterdaten gespeichert",
      description: `Die Stamm- und Lohndaten von ${employeeName} wurden aktualisiert.`,
    });
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
          <div className="mb-6 rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 md:p-6">
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

              <Input
                label="Monats-Sollstunden"
                type="number"
                min="0"
                step="0.01"
                placeholder="z. B. 165.30"
                value={monthlyHours}
                onChange={(event) => setMonthlyHours(event.target.value)}
                disabled={isSaving}
              />

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
                newEmployeeWageType === "fixed_hourly") && (
                <Input
                  label="Stundenlohn"
                  type="text"
                  placeholder="Stundenlohn in €"
                  value={newEmployeeHourlyRate}
                  onChange={(event) =>
                    setNewEmployeeHourlyRate(event.target.value)
                  }
                  disabled={isSaving}
                  inputMode="decimal"
                />
              )}

              {newEmployeeWageType === "salary" && (
                <Input
                  label="Monatsgehalt"
                  type="text"
                  placeholder="Monatsgehalt in €"
                  value={newEmployeeMonthlySalary}
                  onChange={(event) =>
                    setNewEmployeeMonthlySalary(event.target.value)
                  }
                  disabled={isSaving}
                  inputMode="decimal"
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
          "h-12 w-full rounded-2xl border border-[#CBD5E1] bg-white",
          "pl-12 pr-12 text-sm text-[#0F172A] outline-none",
          "placeholder:text-[#94A3B8]",
          "transition focus:border-[#005CA8]",
          "focus:ring-4 focus:ring-[#005CA8]/10",
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
  <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-12 text-center">
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
  <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-12 text-center">
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
  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
    {visibleActiveEmployees.map((employee) => (
      <EmployeeCard
        key={employee.id}
        employee={employee}
        isExpanded={expandedEmployeeId === employee.id}
        onToggleExpanded={() =>
          setExpandedEmployeeId((currentEmployeeId) =>
            currentEmployeeId === employee.id ? null : employee.id,
          )
        }
        canEditPayroll={canEditPayroll}
        canEditLocationTracking={canEditLocationTracking}
        hasUnsavedMonthlyHours={Boolean(
          unsavedMonthlyHours[employee.id],
        )}
        onMonthlyHoursChange={(value) => {
          setEmployees((currentEmployees) =>
            currentEmployees.map((currentEmployee) =>
              currentEmployee.id === employee.id
                ? {
                    ...currentEmployee,
                    monthly_target_hours: value,
                  }
                : currentEmployee,
            ),
          );

          setUnsavedMonthlyHours((current) => ({
            ...current,
            [employee.id]: true,
          }));
        }}
        onSaveMonthlyHours={() =>
          handleUpdateMonthlyHours(
            employee.id,
            employee.monthly_target_hours,
          )
        }
        onToggleAccountStatus={() =>
          handleToggleAccountStatus(
            employee.id,
            employee.account_status,
          )
        }
        onOpenLocationTracking={() =>
          handleOpenLocationTracking(employee)
        }
        onOpenPayroll={() => handleOpenEditPayroll(employee)}
        onDelete={() => setEmployeeToDelete(employee.id)}
        inviteContent={
          <EmployeeInviteCard
            invite={employee.invite}
            onOpenInvite={() => handleOpenExistingInvite(employee)}
          />
        }
        notesContent={renderNotes(employee)}
      />
    ))}
  </div>
)}

        {inactiveEmployees.length > 0 && (
  <div className="mt-8 border-t border-[#E2E8F0] pt-6">
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
            className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 transition hover:border-[#CBD5E1]"
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

    <Select
      label="Plusstunden behandeln"
      value={editPositiveBalanceHandling}
      onChange={(event) =>
        setEditPositiveBalanceHandling(
          event.target.value as PositiveBalanceHandling,
        )
      }
      options={[
        {
          value: "carry",
          label: "Auf Arbeitszeitkonto übertragen",
        },
        {
          value: "payout",
          label: "Vollständig auszahlen",
        },
        {
          value: "payout_with_limit",
          label: "Bis Limit auszahlen, Rest übertragen",
        },
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
        {
          value: "carry",
          label: "Auf Arbeitszeitkonto übertragen",
        },
        {
          value: "ignore",
          label: "Nicht übertragen",
        },
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
                    editWageType === "fixed_hourly") && (
                    <Input
                      label="Stundenlohn"
                      type="text"
                      inputMode="decimal"
                      placeholder="z. B. 15,50"
                      value={editHourlyRate}
                      onChange={(event) =>
                        setEditHourlyRate(event.target.value)
                      }
                    />
                  )}

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
                onClick={handleSaveEmployeePayroll}
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

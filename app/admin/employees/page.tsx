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


type LocationTrackingMode =
| "required"
| "remote_allowed"
| "disabled";

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
  wage_type?: "hourly" | "fixed_hourly" | "salary";
  hourly_rate?: number | null;
  monthly_salary?: number | null;
  datev_personnel_number?: string | null;
  cost_center?: string | null;
  eligible_for_surcharges?: boolean;

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
  invite_code: string;
  used_at: string | null;
};

type EmployeeWithTargetHours = Employee & {
  weekly_target_hours: number;
  monthly_target_hours: number;
  notes: EmployeeNote[];
  invite: EmployeeInvite | null;
};

function formatAccountStatus(status: string) {
  if (status === "active") return "Aktiv";
  if (status === "inactive") return "Deaktiviert";
  return status;
}

function getAccountStatusColor(status: string) {
  if (status === "active") return "text-green-600";
  if (status === "inactive") return "text-yellow-500";
  return "text-black";
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

export default function EmployeesPage() {
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<EmployeeWithTargetHours[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showInactiveEmployees, setShowInactiveEmployees] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");

  const [name, setName] = useState("");
  const [role, setRole] = useState("Mitarbeiter");
  const [pin, setPin] = useState("");
  const [monthlyHours, setMonthlyHours] = useState("173");
  const [vacationDays, setVacationDays] = useState("");
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState("5");

  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);

  const [showEmployeeLimitPopup, setShowEmployeeLimitPopup] =
    useState(false);
  const [employeeLimit, setEmployeeLimit] =
    useState<number | null>(null);
  const [isOpeningBillingPortal, setIsOpeningBillingPortal] =
    useState(false);

  const [newEmployeeWageType, setNewEmployeeWageType] =
    useState<"hourly" | "fixed_hourly" | "salary">("hourly");

  const [newEmployeeHourlyRate, setNewEmployeeHourlyRate] = useState("");
  const [newEmployeeMonthlySalary, setNewEmployeeMonthlySalary] = useState("");
  const [
    newEmployeeDatevPersonnelNumber,
    setNewEmployeeDatevPersonnelNumber,
  ] = useState("");
  const [newEmployeeCostCenter, setNewEmployeeCostCenter] = useState("");

  const [editingPayrollEmployee, setEditingPayrollEmployee] =
    useState<EmployeeWithTargetHours | null>(null);

  const [editWageType, setEditWageType] =
    useState<"hourly" | "fixed_hourly" | "salary">("hourly");

  const [editHourlyRate, setEditHourlyRate] = useState("");
  const [editMonthlySalary, setEditMonthlySalary] = useState("");
  const [editDatevPersonnelNumber, setEditDatevPersonnelNumber] = useState("");
  const [editCostCenter, setEditCostCenter] = useState("");

  const [unsavedMonthlyHours, setUnsavedMonthlyHours] =
    useState<Record<string, boolean>>({});

  const [editEligibleForSurcharges, setEditEligibleForSurcharges] =
    useState(true);

  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [noteTexts, setNoteTexts] = useState<Record<string, string>>({});

  const [editingLocationEmployee, setEditingLocationEmployee] =
  useState<EmployeeWithTargetHours | null>(null);

  const [editLocationTrackingMode, setEditLocationTrackingMode] =
  useState<LocationTrackingMode>("required");

  const [editLocationTrackingNote, setEditLocationTrackingNote] =
  useState("");

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
          "id, name, role, pin, status, account_status, hours, vacation_days_per_year, work_days_per_week, wage_type, hourly_rate, monthly_salary, datev_personnel_number, cost_center, eligible_for_surcharges, location_tracking_mode, location_tracking_note"
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
          .select("id, employee_id, invite_code, used_at")
          .eq("business_id", businessId)
          .in("employee_id", employeeIds);

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
          (targetHour) => targetHour.employee_id === employee.id
        );

        const employeeNotes = notes.filter(
          (note) => note.employee_id === employee.id
        );

        const invite =
          invites.find((inviteItem) => inviteItem.employee_id === employee.id) ||
          null;

        return {
          ...employee,
          weekly_target_hours: target?.weekly_hours ?? 40,
          monthly_target_hours: target?.monthly_hours ?? 173,
          notes: employeeNotes,
          invite,
        };
      });

      setEmployees(employeesWithData);
    } finally {
      setIsLoading(false);
    }
  }

  const canManageAdmins = currentUserRole === "owner";
  const canEditPayroll = currentUserRole === "owner";
  const canEditLocationTracking =
    currentUserRole === "owner" || 
    currentUserRole === "admin";

  useEffect(() => {
    loadEmployees();
  }, []);

  function showDiperaPopup(message: string) {
    setPopupMessage(message);
    setShowPopup(true);
  }

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

      const response = await fetch(
        "/api/stripe/create-portal-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        showToast({
          type: "error",
          title: "Abo-Verwaltung konnte nicht geöffnet werden",
          description:
            data.error || "Bitte versuche es erneut.",
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
      if (!name.trim() || !pin.trim()) {
        showToast({
          type: "warning",
          title: "Angaben fehlen",
          description: "Bitte gib Name und PIN ein.",
        });
        return;
      }

      if (pin.trim().length !== 4) {
        showToast({
          type: "warning",
          title: "Ungültige PIN",
          description: "Die PIN muss genau 4 Zahlen haben.",
        });
        return;
      }

      const parsedMonthlyHours = Number(monthlyHours);

      if (!parsedMonthlyHours || parsedMonthlyHours <= 0) {
        showToast({
          type: "warning",
          title: "Ungültige Sollstunden",
          description: "Bitte gib gültige Monats-Sollstunden ein.",
        });
        return;
      }

      const parsedVacationDays = vacationDays ? Number(vacationDays) : 24;
      const parsedWorkDays = Number(workDaysPerWeek);

      if (parsedWorkDays < 1 || parsedWorkDays > 7) {
        showToast({
          type: "warning",
          title: "Ungültige Arbeitstage",
          description: "Arbeitstage pro Woche müssen zwischen 1 und 7 liegen.",
        });
        return;
      }

      if (parsedVacationDays < 0) {
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

      if ((count || 0) >= businessData.employee_limit) {
        setEmployeeLimit(businessData.employee_limit);
        setShowEmployeeLimitPopup(true);
        return;
      }

      const { data: existingEmployeeWithPin, error: pinCheckError } =
        await supabase
          .from("employees")
          .select("id")
          .eq("business_id", businessId)
          .eq("pin", pin.trim())
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

      const { data: insertedEmployee, error: employeeError } = await supabase
        .from("employees")
        .insert([
          {
            name: name.trim(),
            role,
            pin: pin.trim(),
            status: "not_checked_in",
            account_status: "active",
            hours: "0 h",
            business_id: businessId,
            vacation_days_per_year: parsedVacationDays,
            work_days_per_week: parsedWorkDays,
            wage_type: newEmployeeWageType,
            hourly_rate:
              (newEmployeeWageType === "hourly" ||
                newEmployeeWageType === "fixed_hourly") &&
              newEmployeeHourlyRate
                ? Number(newEmployeeHourlyRate.replace(",", "."))
                : null,
            monthly_salary:
              newEmployeeWageType === "salary" && newEmployeeMonthlySalary
                ? Number(newEmployeeMonthlySalary.replace(",", "."))
                : null,
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
            employeeError?.message || "Bitte prüfe die Angaben und versuche es erneut.",
        });
        return;
      }

      const { error: targetHoursError } = await supabase
        .from("employee_target_hours")
        .insert([
          {
            employee_id: insertedEmployee.id,
            weekly_hours: Math.round(parsedMonthlyHours / 4.33),
            monthly_hours: parsedMonthlyHours,
          },
        ]);

      if (targetHoursError) {
        console.error(targetHoursError);
        showToast({
          type: "error",
          title: "Sollstunden konnten nicht gespeichert werden",
          description: "Der Mitarbeiter wurde angelegt, aber die Sollstunden fehlen.",
        });
        return;
      }

      const { error: inviteError } = await supabase
        .from("employee_invites")
        .insert([
          {
            business_id: businessId,
            employee_id: insertedEmployee.id,
            invite_code: generateInviteCode(),
          },
        ]);

      if (inviteError) {
        console.error(inviteError);
        showToast({
          type: "warning",
          title: "Einladung konnte nicht erstellt werden",
          description: "Der Mitarbeiter wurde angelegt, aber ohne Einladungscode.",
        });
      }

      setName("");
      setRole("Mitarbeiter");
      setPin("");
      setMonthlyHours("173");
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
        description: `${name.trim()} wurde erfolgreich hinzugefügt.`,
      });
    } finally {
      setIsSaving(false);
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
        title: "Owner kann nicht deaktiviert werden",
        description: "Der Hauptinhaber des Betriebs bleibt immer aktiv.",
      });
      return;
    }

    if (employee.role === "Admin" && currentUserRole !== "owner") {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Du darfst keine Admins deaktivieren.",
      });
      return;
    }

    const newStatus = currentStatus === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("employees")
      .update({ account_status: newStatus })
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
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
  async function handleUpdateMonthlyHours(
    employeeId: string,
    newMonthlyHours: number
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

    const calculatedWeeklyHours = Math.round(newMonthlyHours / 4.33);

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
          weekly_hours: calculatedWeeklyHours,
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
          weekly_hours: calculatedWeeklyHours,
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

  function renderInvite(employee: EmployeeWithTargetHours) {
    return (
      <div className="mt-4 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold text-[#0F172A]">
              Mitarbeiter-Zugang
            </h4>
            <p className="mt-1 text-sm text-[#64748B]">
              Einladung für das Mitarbeiter-Dashboard.
            </p>
          </div>

          {employee.invite?.used_at ? (
            <Badge variant="success" dot>
              Verwendet
            </Badge>
          ) : employee.invite ? (
            <Badge variant="primary" dot>
              Offen
            </Badge>
          ) : (
            <Badge variant="muted">Fehlt</Badge>
          )}
        </div>

        {employee.invite ? (
          <>
            <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 font-mono text-sm font-semibold tracking-wide text-[#0F172A]">
              {employee.invite.invite_code}
            </div>

            <p className="mt-2 text-xs leading-5 text-[#64748B]">
              {employee.invite.used_at
                ? "Dieser Code wurde bereits verwendet."
                : "Diesen Code gibt der Mitarbeiter später bei der Registrierung ein."}
            </p>
          </>
        ) : (
          <p className="text-sm text-[#64748B]">
            Für diesen Mitarbeiter wurde noch kein Einladungscode erstellt.
          </p>
        )}
      </div>
    );
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
            <Badge variant="muted">
              {employee.notes.length}
            </Badge>
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

  function handleOpenLocationTracking(
  employee: EmployeeWithTargetHours
) {
  if (!canEditLocationTracking) {
    showToast({
      type: "error",
      title: "Keine Berechtigung",
      description:
        "Du darfst die Standortprüfung nicht bearbeiten.",
    });
    return;
  }

  setEditingLocationEmployee(employee);
  setEditLocationTrackingMode(
    employee.location_tracking_mode ?? "required"
  );
  setEditLocationTrackingNote(
    employee.location_tracking_note ?? ""
  );
}

async function handleSaveLocationTracking() {
  if (!editingLocationEmployee || isSavingLocationTracking) {
    return;
  }

  if (!canEditLocationTracking) {
    showToast({
      type: "error",
      title: "Keine Berechtigung",
      description:
        "Du darfst die Standortprüfung nicht bearbeiten.",
    });
    return;
  }

  const businessId = await getBusinessId();

  if (!businessId) {
    showToast({
      type: "error",
      title: "Betrieb nicht gefunden",
      description:
        "Die Standortregel konnte nicht gespeichert werden.",
    });
    return;
  }

  setIsSavingLocationTracking(true);

  try {
    const { error } = await supabase
      .from("employees")
      .update({
        location_tracking_mode: editLocationTrackingMode,
        location_tracking_note:
          editLocationTrackingNote.trim() || null,
      })
      .eq("id", editingLocationEmployee.id)
      .eq("business_id", businessId);

    if (error) {
      console.error("SAVE LOCATION TRACKING ERROR:", error);

      showToast({
        type: "error",
        title:
          "Standortregel konnte nicht gespeichert werden",
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
        description: "Du darfst Lohndaten nicht bearbeiten.",
      });
      return;
    }

    setEditingPayrollEmployee(employee);

    setEditWageType(
      employee.wage_type === "fixed_hourly"
        ? "fixed_hourly"
        : employee.wage_type === "salary"
        ? "salary"
        : "hourly"
    );

    setEditHourlyRate(
      employee.hourly_rate !== null && employee.hourly_rate !== undefined
        ? String(employee.hourly_rate)
        : ""
    );

    setEditMonthlySalary(
      employee.monthly_salary !== null && employee.monthly_salary !== undefined
        ? String(employee.monthly_salary)
        : ""
    );

    setEditDatevPersonnelNumber(employee.datev_personnel_number || "");
    setEditCostCenter(employee.cost_center || "");
    setEditEligibleForSurcharges(employee.eligible_for_surcharges ?? true);
  }

  async function handleSaveEmployeePayroll() {
    if (!editingPayrollEmployee) return;

    if (!canEditPayroll) {
      showToast({
        type: "error",
        title: "Keine Berechtigung",
        description: "Du darfst Lohndaten nicht bearbeiten.",
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

    const { error } = await supabase
      .from("employees")
      .update({
        wage_type: editWageType,
        hourly_rate: hourlyRate,
        monthly_salary: monthlySalary,
        datev_personnel_number: editDatevPersonnelNumber.trim() || null,
        cost_center: editCostCenter.trim() || null,
        eligible_for_surcharges: editEligibleForSurcharges,
      })
      .eq("id", editingPayrollEmployee.id);

    if (error) {
      console.error(error);
      showToast({
        type: "error",
        title: "Lohndaten konnten nicht gespeichert werden",
        description: error.message,
      });
      return;
    }

    const employeeName = editingPayrollEmployee.name;

    setEditingPayrollEmployee(null);

    await loadEmployees();

    showToast({
      type: "success",
      title: "Lohndaten gespeichert",
      description: `Die Lohndaten von ${employeeName} wurden aktualisiert.`,
    });
  }

  const activeEmployees = employees.filter(
    (employee) => employee.account_status === "active"
  );

  const inactiveEmployees = employees.filter(
    (employee) => employee.account_status === "inactive"
  );

  const activeEmployeesCount = activeEmployees.length;
  const inactiveEmployeesCount = inactiveEmployees.length;
  const invitedEmployeesCount = employees.filter(
    (employee) => employee.invite && !employee.invite.used_at
  ).length;
  const registeredEmployeesCount = employees.filter(
    (employee) => employee.invite?.used_at
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
                label="Monats-Sollstunden"
                type="number"
                min="1"
                placeholder="z. B. 160"
                value={monthlyHours}
                onChange={(event) => setMonthlyHours(event.target.value)}
                disabled={isSaving}
              />

              <Select
                label="Lohnart"
                value={newEmployeeWageType}
                onChange={(event) =>
                  setNewEmployeeWageType(
                    event.target.value as "hourly" | "fixed_hourly" | "salary"
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
                onClick={() => setShowForm(true)}
              >
                Ersten Mitarbeiter anlegen
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4 xl:hidden">
              {activeEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="rounded-3xl border border-[#E2E8F0] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A]">
                        {employee.name}
                      </h3>

                      <p className="text-sm text-[#64748B]">
                        {employee.role}
                      </p>
                    </div>

                    <Badge
                      variant={
                        employee.account_status === "active"
                          ? "success"
                          : "warning"
                      }
                      dot
                    >
                      {formatAccountStatus(employee.account_status)}
                    </Badge>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <p className="mb-1 text-[#64748B]">PIN</p>
                      <p className="font-medium text-[#0F172A]">
                        {employee.pin}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <p className="mb-1 text-[#64748B]">Soll/Monat</p>
                      <p className="font-medium text-[#0F172A]">
                        {employee.monthly_target_hours} Std.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <p className="mb-1 text-[#64748B]">Vergütung</p>
                      <p className="font-medium text-[#0F172A]">
                        {employee.wage_type === "salary"
                          ? `${employee.monthly_salary ?? 0} € / Monat`
                          : `${employee.hourly_rate ?? 0} € / Std.`}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <p className="mb-1 text-[#64748B]">DATEV-Nr.</p>
                      <p className="font-medium text-[#0F172A]">
                        {employee.datev_personnel_number || "—"}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
                      <p className="mb-1 text-[#64748B]">Kostenstelle</p>
                      <p className="font-medium text-[#0F172A]">
                        {employee.cost_center || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-col gap-2">
                    <label className="text-sm font-semibold text-[#64748B]">
                      Monats-Sollstunden ändern
                    </label>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="number"
                        min="1"
                        value={employee.monthly_target_hours}
                        onChange={(event) => {
                          setEmployees((currentEmployees) =>
                            currentEmployees.map((currentEmployee) =>
                              currentEmployee.id === employee.id
                                ? {
                                    ...currentEmployee,
                                    monthly_target_hours: Number(
                                      event.target.value
                                    ),
                                  }
                                : currentEmployee
                            )
                          );

                          setUnsavedMonthlyHours((current) => ({
                            ...current,
                            [employee.id]: true,
                          }));
                        }}
                        className="flex-1"
                      />

                      {unsavedMonthlyHours[employee.id] && (
                        <Button
                          variant="primary"
                          type="button"
                          onClick={() =>
                            handleUpdateMonthlyHours(
                              employee.id,
                              employee.monthly_target_hours
                            )
                          }
                        >
                          Speichern
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="secondary"
                      type="button"
                      fullWidth
                      onClick={() =>
                        handleToggleAccountStatus(
                          employee.id,
                          employee.account_status
                        )
                      }
                    >
                      Deaktivieren
                    </Button>

                    {canEditLocationTracking && (
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      onClick={() =>
                        handleOpenLocationTracking(employee)
                      }
                    >
                      GPS
                    </Button>
                  )}

                    {canEditPayroll && (
                      <Button
                        variant="primary"
                        type="button"
                        fullWidth
                        onClick={() => handleOpenEditPayroll(employee)}
                      >
                        Lohndaten bearbeiten
                      </Button>
                    )}

                    <Button
                      variant="danger"
                      type="button"
                      fullWidth
                      onClick={() => setEmployeeToDelete(employee.id)}
                    >
                      Löschen
                    </Button>
                  </div>

                  {renderInvite(employee)}
                  {renderNotes(employee)}
                </div>
              ))}
            </div>

            <div className="hidden flex-col gap-4 xl:flex">
              <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.9fr_1fr_1.1fr_0.9fr_0.9fr_1.6fr] gap-3 rounded-2xl bg-[#F8FAFC] px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                <div>Name</div>
                <div>Rolle</div>
                <div>PIN</div>
                <div>Konto</div>
                <div>Soll/Monat</div>
                <div>Vergütung</div>
                <div>DATEV-Nr.</div>
                <div>Kostenstelle</div>
                <div className="text-right">Aktionen</div>
              </div>

              {activeEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="rounded-3xl border border-[#E2E8F0] bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#CBD5E1] hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
                >
                  <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.9fr_1fr_1.1fr_0.9fr_0.9fr_1.6fr] items-center gap-3">
                    <div className="font-semibold text-[#0F172A]">
                      {employee.name}
                    </div>

                    <div className="text-sm text-[#0F172A]">
                      {employee.role}
                    </div>

                    <div className="font-mono text-sm text-[#0F172A]">
                      {employee.pin}
                    </div>

                    <div>
                      <Badge
                        variant={
                          employee.account_status === "active"
                            ? "success"
                            : "warning"
                        }
                        dot
                      >
                        {formatAccountStatus(employee.account_status)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        defaultValue={employee.monthly_target_hours}
                        disabled={!canEditPayroll}
                        onBlur={(event) =>
                          handleUpdateMonthlyHours(
                            employee.id,
                            Number(event.target.value)
                          )
                        }
                        className="w-24"
                      />

                      <span className="text-sm text-[#64748B]">Std.</span>
                    </div>

                    <div className="text-sm text-[#0F172A]">
                      {employee.wage_type === "salary"
                        ? `${employee.monthly_salary ?? 0} € / Monat`
                        : `${employee.hourly_rate ?? 0} € / Std.`}
                    </div>

                    <div className="text-sm text-[#0F172A]">
                      {employee.datev_personnel_number || "—"}
                    </div>

                    <div className="text-sm text-[#0F172A]">
                      {employee.cost_center || "—"}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() =>
                          handleToggleAccountStatus(
                            employee.id,
                            employee.account_status
                          )
                        }
                      >
                        Deaktivieren
                      </Button>

                      {canEditLocationTracking && (
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          onClick={() =>
                            handleOpenLocationTracking(employee)
                          }
                        >
                          GPS
                        </Button>
                      )}

                      {canEditPayroll && (
                        <Button
                          variant="primary"
                          size="sm"
                          type="button"
                          onClick={() => handleOpenEditPayroll(employee)}
                        >
                          Lohndaten
                        </Button>
                      )}

                      <Button
                        variant="danger"
                        size="sm"
                        type="button"
                        onClick={() => setEmployeeToDelete(employee.id)}
                      >
                        Löschen
                      </Button>
                    </div>
                  </div>

                  {renderInvite(employee)}
                  {renderNotes(employee)}
                </div>
              ))}
            </div>
          </>
        )}

        {inactiveEmployees.length > 0 && (
          <div className="mt-8 border-t border-[#E2E8F0] pt-6">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowInactiveEmployees(!showInactiveEmployees)}
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
                            employee.account_status
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
              event.target.value as LocationTrackingMode
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
          Standortausnahmen zusammen mit der Stempelung
          protokolliert.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-[#E2E8F0] bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
            <div className="border-b border-[#E2E8F0] px-6 py-5">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-[#0F172A]">
                Lohndaten bearbeiten
              </h2>

              <p className="mt-1 text-sm text-[#64748B]">
                {editingPayrollEmployee.name}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
              <Select
                label="Lohnart"
                value={editWageType}
                onChange={(event) =>
                  setEditWageType(
                    event.target.value as
                      | "hourly"
                      | "fixed_hourly"
                      | "salary"
                  )
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
                  placeholder="Stundenlohn in €"
                  value={editHourlyRate}
                  onChange={(event) => setEditHourlyRate(event.target.value)}
                />
              )}

              {editWageType === "salary" && (
                <Input
                  label="Monatsgehalt"
                  type="text"
                  placeholder="Monatsgehalt in €"
                  value={editMonthlySalary}
                  onChange={(event) => setEditMonthlySalary(event.target.value)}
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
                onChange={(event) => setEditCostCenter(event.target.value)}
              />

              <label className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 md:col-span-2">
                <input
                  type="checkbox"
                  checked={editEligibleForSurcharges}
                  onChange={(event) =>
                    setEditEligibleForSurcharges(event.target.checked)
                  }
                  className="h-4 w-4 rounded border-[#CBD5E1] accent-[#2563EB]"
                />

                <span className="text-sm font-medium text-[#0F172A]">
                  Zuschlagsberechtigt
                </span>
              </label>
            </div>

            <div className="flex flex-col gap-3 border-t border-[#E2E8F0] px-6 py-5 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditingPayrollEmployee(null)}
              >
                Abbrechen
              </Button>

              <Button
                variant="primary"
                type="button"
                onClick={handleSaveEmployeePayroll}
              >
                Speichern
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
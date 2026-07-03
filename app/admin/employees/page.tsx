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
  wage_type?: "hourly" | "fixed_hourly" | "salary"
  hourly_rate?: number | null;
  monthly_salary?: number | null;
  datev_personnel_number?: string | null;
  cost_center?: string | null;
  eligible_for_surcharges?: boolean;
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
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<EmployeeWithTargetHours[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showInactiveEmployees, setShowInactiveEmployees] =
  useState(false);
  const [currentUserRole, setCurrentUserRole] = useState("");

  const [name, setName] = useState("");
  const [role, setRole] = useState("Mitarbeiter");
  const [pin, setPin] = useState("");
  const [monthlyHours, setMonthlyHours] = useState("173");
  const [vacationDays, setVacationDays] = useState("");
  const [workDaysPerWeek, setWorkDaysPerWeek] = useState("5");
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] =
  useState<string | null>(null);
  const [newEmployeeWageType, setNewEmployeeWageType] =
  useState<"hourly" | "fixed_hourly" | "salary">("hourly");

  const [newEmployeeHourlyRate, setNewEmployeeHourlyRate] = useState("");
  const [newEmployeeMonthlySalary, setNewEmployeeMonthlySalary] = useState("");
  const [newEmployeeDatevPersonnelNumber, setNewEmployeeDatevPersonnelNumber] = useState("");
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
const [
  editEligibleForSurcharges,
  setEditEligibleForSurcharges
] = useState(true);

  const [noteToDelete, setNoteToDelete] =
  useState<string | null>(null);

  const [noteTexts, setNoteTexts] = useState<Record<string, string>>({});

  async function loadEmployees() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  console.error("Kein Benutzer gefunden.");
  return;
}

const { data: currentProfile, error: profileError } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", user.id)
  .single();

if (profileError || !currentProfile) {
  console.error(profileError);
  return;
}

setCurrentUserRole(currentProfile.role);

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, role, pin, status, account_status, hours, vacation_days_per_year, work_days_per_week, wage_type, hourly_rate, monthly_salary, datev_personnel_number, cost_center, eligible_for_surcharges")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (employeeError) {
      console.error(employeeError);
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
  }

  const canManageAdmins = currentUserRole === "owner";
  const canEditPayroll = currentUserRole === "owner";

  useEffect(() => {
    loadEmployees();
  }, []);

  function showDiperaPopup(message: string) {
  setPopupMessage(message);
  setShowPopup(true);
}

  async function handleAddEmployee() {
    if (isSaving) return;

    setIsSaving(true);

    try {
      if (!name.trim() || !pin.trim()) {
        showDiperaPopup("Bitte Name und PIN eingeben.");
        return;
      }

      if (pin.trim().length !== 4) {
        showDiperaPopup("Die PIN muss genau 4 Zahlen haben.");
        return;
      }

      const parsedMonthlyHours = Number(monthlyHours);

      if (!parsedMonthlyHours || parsedMonthlyHours <= 0) {
        showDiperaPopup("Bitte gültige Monats-Sollstunden eingeben.");
        return;
      }

      const parsedVacationDays = vacationDays ? Number(vacationDays) : 24;

      const parsedWorkDays =
Number(workDaysPerWeek);

if (
parsedWorkDays < 1 ||
parsedWorkDays > 7
) {
showDiperaPopup(
"Arbeitstage pro Woche müssen zwischen 1–7 liegen."
);

return;
}

if (parsedVacationDays < 0) {
  showDiperaPopup("Bitte gültige Urlaubstage eingeben.");
  return;
}

      const businessId = await getBusinessId();

      if (!businessId) {
        showDiperaPopup("Keine Business-ID gefunden.");
        return;
      }

      const { data: businessData, error: businessError } =
  await supabase
    .from("businesses")
    .select("employee_limit")
    .eq("id", businessId)
    .single();

if (businessError || !businessData) {
  showDiperaPopup("Betriebsdaten konnten nicht geladen werden.");
  return;
}

const { count, error: countError } =
  await supabase
    .from("employees")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("business_id", businessId)
    .eq("account_status", "active");

if (countError) {
  showDiperaPopup("Mitarbeiteranzahl konnte nicht geprüft werden.");
  return;
}

if ((count || 0) >= businessData.employee_limit) {
showDiperaPopup(
  `Dein Tarif erlaubt maximal ${businessData.employee_limit} aktive Mitarbeiter.`
);

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
        showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
        return;
      }

      if (existingEmployeeWithPin) {
        showDiperaPopup("Diese PIN ist bereits vergeben. Bitte eine andere PIN wählen.");
        return;
      }

      if (
  currentUserRole !== "owner" &&
  role === "Admin"
) {
  showDiperaPopup(
    "Du hast keine Berechtigung, Admins anzulegen."
  );
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
            work_days_per_week:
            parsedWorkDays,
            wage_type: newEmployeeWageType,

            hourly_rate:
            (newEmployeeWageType === "hourly" ||
            newEmployeeWageType === "fixed_hourly") &&
            newEmployeeHourlyRate
            ? Number(
            newEmployeeHourlyRate.replace(",", ".")
            )
            : null,

            monthly_salary:
            newEmployeeWageType === "salary" &&
            newEmployeeMonthlySalary
            ? Number(
            newEmployeeMonthlySalary.replace(",", ".")
            )
            : null,

            datev_personnel_number:
            newEmployeeDatevPersonnelNumber.trim()
            || null,

            cost_center:
            newEmployeeCostCenter.trim()
            || null,
          },
        ])
        .select("id")
        .single();

      if (employeeError || !insertedEmployee) {
  console.error("EMPLOYEE INSERT ERROR:", employeeError);

  showDiperaPopup(
    employeeError?.message || "Mitarbeiter konnte nicht erstellt werden."
  );
  return;

        if (
          employeeError?.message?.includes("unique_employee_pin_per_business")
        ) {
          showDiperaPopup("Diese PIN ist bereits vergeben.");
          return;
        }
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
        showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
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
        showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
        return;
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
    } finally {
      setIsSaving(false);
    }
  }

async function handleDeleteEmployee(id: string) {
  const businessId = await getBusinessId();

  if (!businessId) {
    showDiperaPopup("Keine Business-ID gefunden.");
    return;
  }

  const employee = employees.find(
    (employee) => employee.id === id
  );

  if (!employee) {
    showDiperaPopup("Mitarbeiter wurde nicht gefunden.");
    return;
  }

  if (employee.role === "Owner") {
    showDiperaPopup("Der Owner kann nicht gelöscht werden.");
    return;
  }

  if (
    employee.role === "Admin" &&
    currentUserRole !== "owner"
  ) {
    showDiperaPopup(
      "Du hast keine Berechtigung, Admins zu löschen."
    );
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
      showDiperaPopup(
        "Dieser Mitarbeiter wurde bereits registriert. Bitte deaktiviere ihn stattdessen."
      );
      return;
    }

    console.error(error);
    showDiperaPopup("Mitarbeiter konnte nicht gelöscht werden.");
    return;
  }

  await loadEmployees();
}

async function handleToggleAccountStatus(id: string, currentStatus: string) {
  const businessId = await getBusinessId();

  if (!businessId) {
    showDiperaPopup("Keine Business-ID gefunden.");
    return;
  }

  const employee = employees.find(
    (employee) => employee.id === id
  );

  if (!employee) {
    showDiperaPopup("Mitarbeiter wurde nicht gefunden.");
    return;
  }

  if (employee.role === "Owner") {
    showDiperaPopup("Der Owner kann nicht deaktiviert werden.");
    return;
  }

  if (
    employee.role === "Admin" &&
    currentUserRole !== "owner"
  ) {
    showDiperaPopup(
      "Du hast keine Berechtigung, Admins zu deaktivieren."
    );
    return;
  }

  const newStatus =
    currentStatus === "active" ? "inactive" : "active";

  const { error } = await supabase
    .from("employees")
    .update({ account_status: newStatus })
    .eq("id", id)
    .eq("business_id", businessId);

  if (error) {
    console.error(error);
    showDiperaPopup("Es ist ein Fehler aufgetreten.");
    return;
  }

  await loadEmployees();
}

  async function handleUpdateMonthlyHours(
    employeeId: string,
    newMonthlyHours: number
  ) {

    if (!canEditPayroll) {
      showDiperaPopup("Du hast keine Berechtigung, Sollstunden zu bearbeiten.");
      return;
    }
    if (newMonthlyHours < 0) {
      showDiperaPopup("Bitte gültige Monats-Sollstunden eingeben.");
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
      showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
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
        showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
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
        showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
        return;
      }
    }

    await loadEmployees();

    showDiperaPopup("Die Monats-Sollstunden wurden erfolgreich gespeichert.");

    setUnsavedMonthlyHours((current) => ({
  ...current,
  [employeeId]: false,
}));
  }

  async function handleAddNote(employeeId: string) {
    const noteText = noteTexts[employeeId]?.trim();

    if (!noteText) {
      showDiperaPopup("Bitte eine Notiz eingeben.");
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showDiperaPopup("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase.from("employee_notes").insert([
      {
        employee_id: employeeId,
        business_id: businessId,
        note: noteText,
      },
    ]);

    if (error) {
      console.error(error);
      showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
      return;
    }

    setNoteTexts((current) => ({
      ...current,
      [employeeId]: "",
    }));

    await loadEmployees();
  }

  async function handleDeleteNote(noteId: string) {

    const businessId = await getBusinessId();

    if (!businessId) {
      showDiperaPopup("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase
      .from("employee_notes")
      .delete()
      .eq("id", noteId)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
      showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
      return;
    }

    await loadEmployees();
  }

  function renderInvite(employee: EmployeeWithTargetHours) {
    return (
      <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-100">
        <h4 className="font-bold text-blue-950 mb-2">
          Mitarbeiter-Zugang
        </h4>

        {employee.invite ? (
          <>
            <p className="text-sm text-gray-600 mb-2">
              Einladungscode für das Mitarbeiter-Dashboard:
            </p>

            <div className="bg-white rounded-lg p-3 border text-black font-bold tracking-wide">
              {employee.invite.invite_code}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              {employee.invite.used_at
                ? "Dieser Code wurde bereits verwendet."
                : "Diesen Code gibt der Mitarbeiter später bei der Registrierung ein."}
            </p>
          </>
        ) : (
          <p className="text-sm text-[#6B7280]">
            Für diesen Mitarbeiter wurde noch kein Einladungscode erstellt.
          </p>
        )}
      </div>
    );
  }

  function renderNotes(employee: EmployeeWithTargetHours) {
    return (
      <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4">
        <h4 className="mb-3 font-medium text-[#111827]">Interne Notizen</h4>

        <div className="flex flex-col gap-2 mb-4">
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

          <Button
            variant="primary"
            type="button"
            onClick={() => handleAddNote(employee.id)}
          >
            Notiz speichern
          </Button>
        </div>

        {employee.notes.length > 0 ? (
          <div className="flex flex-col gap-3">
            {employee.notes.map((note) => (
              <div
                key={note.id}
                className="flex flex-col gap-2 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-3"
              >
                <p className="text-black whitespace-pre-wrap">{note.note}</p>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[#6B7280]">
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
          <p className="text-[#6B7280]">Noch keine Notizen vorhanden.</p>
        )}
      </div>
    );
  }

  function handleOpenEditPayroll(employee: EmployeeWithTargetHours) {
    if (!canEditPayroll) {
  showDiperaPopup("Du hast keine Berechtigung, Lohndaten zu bearbeiten.");
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

  setEditDatevPersonnelNumber(
    employee.datev_personnel_number || ""
  );

  setEditCostCenter(
    employee.cost_center || ""
  );

  setEditEligibleForSurcharges(
  employee.eligible_for_surcharges ?? true
);
  
}

  const activeEmployees = employees.filter(
  (employee) => employee.account_status === "active"
);

async function handleSaveEmployeePayroll() {
  if (!editingPayrollEmployee) return;
  
  if (!canEditPayroll) {
  showDiperaPopup("Du hast keine Berechtigung, Lohndaten zu bearbeiten.");
  return;
}

  const hourlyRate =
  (editWageType === "hourly" ||
   editWageType === "fixed_hourly") &&
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
      datev_personnel_number:
        editDatevPersonnelNumber.trim() || null,
      cost_center:
        editCostCenter.trim() || null,
        eligible_for_surcharges:
  editEligibleForSurcharges,
    })
    .eq("id", editingPayrollEmployee.id);

  if (error) {
    console.error(error);
    showDiperaPopup(
      "Lohndaten konnten nicht gespeichert werden."
    );
    return;
  }

  showDiperaPopup(
    "Lohndaten wurden gespeichert."
  );

  setEditingPayrollEmployee(null);

  await loadEmployees();
}

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
      <StatCard
        title="Aktive Mitarbeiter"
        value={activeEmployeesCount}
      />

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
          <div className="mb-6 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 md:p-6">
            <h2 className="mb-4 text-2xl font-light tracking-[-0.02em] text-[#111827]">
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
                  onChange={(event) => setNewEmployeeHourlyRate(event.target.value)}
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
                  onChange={(event) => setNewEmployeeMonthlySalary(event.target.value)}
                  disabled={isSaving}
                  inputMode="decimal"
                />
              )}

              <Input
                label="DATEV-Personalnummer"
                type="text"
                placeholder="Optional"
                value={newEmployeeDatevPersonnelNumber}
                onChange={(event) => setNewEmployeeDatevPersonnelNumber(event.target.value)}
                disabled={isSaving}
              />

              <Input
                label="Kostenstelle"
                type="text"
                placeholder="Optional"
                value={newEmployeeCostCenter}
                onChange={(event) => setNewEmployeeCostCenter(event.target.value)}
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

        <div className="xl:hidden flex flex-col gap-4">
          {activeEmployees.map((employee) => (
            <div
              key={employee.id}
              className="bg-gray-50 rounded-2xl p-4 border shadow-sm"
            >
              <div className="flex justify-between items-start gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-blue-950">
                    {employee.name}
                  </h3>

                  <p className="text-sm text-[#6B7280]">{employee.role}</p>
                </div>

                <span
                  className={`text-sm font-bold ${getAccountStatusColor(
                    employee.account_status
                  )}`}
                >
                  {formatAccountStatus(employee.account_status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
                  <p className="mb-1 text-[#6B7280]">PIN</p>
                  <p className="font-medium text-[#111827]">{employee.pin}</p>
                </div>

                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
                  <p className="mb-1 text-[#6B7280]">Soll/Monat</p>
                  <p className="font-medium text-[#111827]">
                    {employee.monthly_target_hours} Std.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
                  <p className="mb-1 text-[#6B7280]">Vergütung</p>
                  <p className="font-medium text-[#111827]">
                    {employee.wage_type === "salary"
                      ? `${employee.monthly_salary ?? 0} € / Monat`
                      : `${employee.hourly_rate ?? 0} € / Std.`}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5E7EB] bg-white p-3">
                  <p className="mb-1 text-[#6B7280]">DATEV-Nr.</p>
                  <p className="font-medium text-[#111827]">
                    {employee.datev_personnel_number || "—"}
                  </p>
                </div>

                <div className="col-span-2 rounded-2xl border border-[#E5E7EB] bg-white p-3">
                  <p className="mb-1 text-[#6B7280]">Kostenstelle</p>
                  <p className="font-medium text-[#111827]">
                    {employee.cost_center || "—"}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-3">
  <label className="text-sm font-semibold text-gray-600">
    Monats-Sollstunden ändern
  </label>

  <div className="flex flex-col sm:flex-row gap-2">
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
                  monthly_target_hours: Number(event.target.value),
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
                  {employee.account_status === "active"
                    ? "Deaktivieren"
                    : "Aktivieren"}
                </Button>

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

        <div className="hidden xl:flex flex-col gap-4">
          {activeEmployees.map((employee) => (
            <div key={employee.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 transition hover:bg-[#F8FAFC]">
<div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.9fr_1fr_1.1fr_0.9fr_0.9fr_1.6fr] gap-3 items-center min-w-0">
  <div className="font-medium text-[#111827]">
    {employee.name}
  </div>

  <div className="text-[#111827]">{employee.role}</div>

  <div className="text-[#111827]">{employee.pin}</div>

  <div
    className={`font-bold ${getAccountStatusColor(
      employee.account_status
    )}`}
  >
    {formatAccountStatus(employee.account_status)}
  </div>

  <div className="flex items-center gap-2 text-black">
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

    <span>Std.</span>
  </div>

  <div className="text-[#111827]">
    {employee.wage_type === "salary"
      ? `${employee.monthly_salary ?? 0} € / Monat`
      : `${employee.hourly_rate ?? 0} € / Std.`}
  </div>

  <div className="text-[#111827]">
    {employee.datev_personnel_number || "—"}
  </div>

  <div className="text-[#111827]">
    {employee.cost_center || "—"}
  </div>

  <div className="flex flex-wrap gap-2 justify-end">
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
      {employee.account_status === "active"
        ? "Deaktivieren"
        : "Aktivieren"}
    </Button>

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

<div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.9fr_1fr_1.1fr_0.9fr_0.9fr_1.6fr] gap-3 text-sm text-gray-500 mt-3 border-t pt-3">
  <div>Name</div>
  <div>Rolle</div>
  <div>PIN</div>
  <div>Konto</div>
  <div>Soll/Monat</div>
  <div>Vergütung</div>
  <div>DATEV-Nr.</div>
  <div>Kostenstelle</div>
  <div>Aktionen</div>
</div>

              {renderInvite(employee)}
              {renderNotes(employee)}
            </div>
          ))}
        </div>

        {inactiveEmployees.length > 0 && (
  <div className="mt-8 border-t pt-6">

    <Button
      variant="secondary"
      type="button"
      onClick={() =>
        setShowInactiveEmployees(
          !showInactiveEmployees
        )
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
            className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4"
          >
            <div className="flex justify-between items-center">

              <div>
                <p className="font-bold text-black">
                  {employee.name}
                </p>

                <p className="text-sm text-[#6B7280]">
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

        {activeEmployees.length === 0 && (
          <p className="text-gray-500 mt-4">
            Noch keine Mitarbeiter vorhanden.
          </p>
        )}
      </Section>

<DiperaPopup
  open={showPopup}
  message={popupMessage}
  onClose={() => setShowPopup(false)}
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

{editingPayrollEmployee && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/40 p-6 backdrop-blur-sm">
    <div className="w-full max-w-xl rounded-3xl border border-[#E5E7EB] bg-white shadow-[0_24px_80px_rgba(17,24,39,0.18)]">
      <div className="border-b border-[#E5E7EB] px-6 py-5">
        <h2 className="text-2xl font-light tracking-[-0.02em] text-[#111827]">
          Lohndaten bearbeiten
        </h2>

        <p className="mt-1 text-sm text-[#6B7280]">
          {editingPayrollEmployee.name}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
        <Select
          label="Lohnart"
          value={editWageType}
          onChange={(event) =>
            setEditWageType(
              event.target.value as "hourly" | "fixed_hourly" | "salary"
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

        <label className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-3 md:col-span-2">
          <input
            type="checkbox"
            checked={editEligibleForSurcharges}
            onChange={(event) =>
              setEditEligibleForSurcharges(event.target.checked)
            }
            className="h-4 w-4 rounded border-[#CBD5E1] accent-[#2563EB]"
          />

          <span className="text-sm font-medium text-[#111827]">
            Zuschlagsberechtigt
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#E5E7EB] px-6 py-5 sm:flex-row sm:justify-end">
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
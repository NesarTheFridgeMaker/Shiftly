"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import DiperaPopup from "@/components/DiperaPopup";

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

const [noteToDelete, setNoteToDelete] =
  useState<string | null>(null);

  const [noteTexts, setNoteTexts] = useState<Record<string, string>>({});

  async function loadEmployees() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, role, pin, status, account_status, hours, vacation_days_per_year, work_days_per_week")
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
          },
        ])
        .select("id")
        .single();

      if (employeeError || !insertedEmployee) {
        console.error(employeeError);

        if (
          employeeError?.message?.includes("unique_employee_pin_per_business")
        ) {
          showDiperaPopup("Diese PIN ist bereits vergeben.");
          return;
        }

        showDiperaPopup("Mitarbeiter konnte nicht erstellt werden.");
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

    const newStatus = currentStatus === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("employees")
      .update({ account_status: newStatus })
      .eq("id", id)
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

  async function handleUpdateMonthlyHours(
    employeeId: string,
    newMonthlyHours: number
  ) {
    if (!newMonthlyHours || newMonthlyHours <= 0) {
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
          <p className="text-gray-500 text-sm">
            Für diesen Mitarbeiter wurde noch kein Einladungscode erstellt.
          </p>
        )}
      </div>
    );
  }

  function renderNotes(employee: EmployeeWithTargetHours) {
    return (
      <div className="mt-4 bg-white md:bg-gray-50 rounded-xl p-4 border">
        <h4 className="font-bold text-blue-950 mb-3">Interne Notizen</h4>

        <div className="flex flex-col gap-2 mb-4">
          <textarea
            value={noteTexts[employee.id] || ""}
            onChange={(event) =>
              setNoteTexts((current) => ({
                ...current,
                [employee.id]: event.target.value,
              }))
            }
            placeholder="z. B. keine Spätschichten, montags nicht verfügbar..."
            className="border p-3 rounded-lg bg-white text-black min-h-24"
          />

          <button
            type="button"
            onClick={() => handleAddNote(employee.id)}
            className="bg-blue-950 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition"
          >
            Notiz speichern
          </button>
        </div>

        {employee.notes.length > 0 ? (
          <div className="flex flex-col gap-3">
            {employee.notes.map((note) => (
              <div
                key={note.id}
                className="bg-gray-100 rounded-xl p-3 border flex flex-col gap-2"
              >
                <p className="text-black whitespace-pre-wrap">{note.note}</p>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">
                    {formatNoteDate(note.created_at)}
                  </span>

                  <button
                    type="button"
                    onClick={() => setNoteToDelete(note.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition text-sm"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Noch keine Notizen vorhanden.</p>
        )}
      </div>
    );
  }

  const activeEmployees = employees.filter(
  (employee) => employee.account_status === "active"
);

const inactiveEmployees = employees.filter(
  (employee) => employee.account_status === "inactive"
);

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold text-blue-950 mb-6 md:mb-8">
        Mitarbeiter
      </h1>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6">
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full md:w-auto bg-blue-950 text-white px-5 py-3 rounded-xl mb-6 cursor-pointer hover:bg-blue-900 hover:scale-105 transition"
        >
          Mitarbeiter hinzufügen
        </button>

        {showForm && (
          <div className="bg-gray-100 p-4 md:p-6 rounded-xl mb-6">
            <h2 className="text-2xl font-semibold mb-4 text-blue-950">
              Neuer Mitarbeiter
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSaving}
                className="border p-3 rounded-lg bg-white text-black disabled:bg-gray-200"
              />

              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                disabled={isSaving}
                className="border p-3 rounded-lg bg-white text-black disabled:bg-gray-200"
              >
                <option>Mitarbeiter</option>
                <option>Admin</option>
              </select>

              <input
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
                className="border p-3 rounded-lg bg-white text-black disabled:bg-gray-200"
              />

              <input
                type="number"
                min="1"
                placeholder="Monats-Sollstunden"
                value={monthlyHours}
                onChange={(event) => setMonthlyHours(event.target.value)}
                disabled={isSaving}
                className="border p-3 rounded-lg bg-white text-black disabled:bg-gray-200"
              />
            </div>

<div className="flex flex-col gap-1 max-w-[180px]">
  <label className="text-sm font-semibold text-gray-600">
    Urlaubstage/Jahr
  </label>

  <div className="flex flex-col gap-1 max-w-[180px]">
  <label className="text-sm font-semibold text-gray-600">
    Arbeitstage/Woche
  </label>

  <input
    type="number"
    min="1"
    max="7"
    placeholder="z. B. 5"
    value={workDaysPerWeek}
    onChange={(event) =>
      setWorkDaysPerWeek(
        event.target.value
      )
    }
    disabled={isSaving}
    className="border p-3 rounded-lg bg-white text-black disabled:bg-gray-200"
  />
</div>

  <input
    type="number"
    min="0"
    placeholder="z. B. 24"
    value={vacationDays}
    onChange={(event) => setVacationDays(event.target.value)}
    disabled={isSaving}
    className="border p-3 rounded-lg bg-white text-black disabled:bg-gray-200"
  />
</div>

            <div className="flex flex-col md:flex-row gap-3 mt-5">
              <button
                type="button"
                onClick={handleAddEmployee}
                disabled={isSaving}
                className="bg-green-600 text-white px-5 py-3 rounded-lg cursor-pointer hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSaving ? "Speichert..." : "Speichern"}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={isSaving}
                className="bg-gray-500 text-white px-5 py-3 rounded-lg cursor-pointer hover:bg-gray-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Abbrechen
              </button>
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

                  <p className="text-sm text-gray-500">{employee.role}</p>
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
                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">PIN</p>
                  <p className="font-semibold text-black">{employee.pin}</p>
                </div>

                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Soll/Monat</p>
                  <p className="font-semibold text-black">
                    {employee.monthly_target_hours} Std.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-3">
                <label className="text-sm font-semibold text-gray-600">
                  Monats-Sollstunden ändern
                </label>

                <input
                  type="number"
                  min="1"
                  defaultValue={employee.monthly_target_hours}
                  onBlur={(event) =>
                    handleUpdateMonthlyHours(
                      employee.id,
                      Number(event.target.value)
                    )
                  }
                  className="border p-3 rounded-lg bg-white text-black"
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleToggleAccountStatus(
                      employee.id,
                      employee.account_status
                    )
                  }
                  className="w-full bg-yellow-500 text-white px-3 py-3 rounded-lg hover:bg-yellow-600 transition"
                >
                  {employee.account_status === "active"
                    ? "Deaktivieren"
                    : "Aktivieren"}
                </button>

                <button
                  type="button"
                  onClick={() => setEmployeeToDelete(employee.id)}
                  className="w-full bg-red-600 text-white px-3 py-3 rounded-lg hover:bg-red-700 transition"
                >
                  Löschen
                </button>
              </div>

              {renderInvite(employee)}
              {renderNotes(employee)}
            </div>
          ))}
        </div>

        <div className="hidden xl:flex flex-col gap-4">
          {activeEmployees.map((employee) => (
            <div key={employee.id} className="border rounded-2xl p-4">
              <div className="grid grid-cols-[1.2fr_1fr_0.7fr_0.8fr_1fr_1.6fr] gap-3 items-center min-w-0">
                <div className="text-black font-semibold">
                  {employee.name}
                </div>

                <div className="text-black">{employee.role}</div>

                <div className="text-black">{employee.pin}</div>

                <div
                  className={`font-bold ${getAccountStatusColor(
                    employee.account_status
                  )}`}
                >
                  {formatAccountStatus(employee.account_status)}
                </div>

                <div className="flex items-center gap-2 text-black">
                  <input
                    type="number"
                    min="1"
                    defaultValue={employee.monthly_target_hours}
                    onBlur={(event) =>
                      handleUpdateMonthlyHours(
                        employee.id,
                        Number(event.target.value)
                      )
                    }
                    className="border p-2 rounded-lg bg-white text-black w-24"
                  />

                  <span>Std.</span>
                </div>

                <div className="flex flex-wrap gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      handleToggleAccountStatus(
                        employee.id,
                        employee.account_status
                      )
                    }
                    className="bg-yellow-500 text-white px-3 py-2 rounded-lg hover:bg-yellow-600 transition"
                  >
                    {employee.account_status === "active"
                      ? "Deaktivieren"
                      : "Aktivieren"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEmployeeToDelete(employee.id)}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition"
                  >
                    Löschen
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-4 text-sm text-gray-500 mt-3 border-t pt-3">
                <div>Name</div>
                <div>Rolle</div>
                <div>PIN</div>
                <div>Konto</div>
                <div>Soll/Monat</div>
                <div>Aktionen</div>
              </div>

              {renderInvite(employee)}
              {renderNotes(employee)}
            </div>
          ))}
        </div>

        {inactiveEmployees.length > 0 && (
  <div className="mt-8 border-t pt-6">

    <button
      type="button"
      onClick={() =>
        setShowInactiveEmployees(
          !showInactiveEmployees
        )
      }
      className="bg-gray-200 text-black px-4 py-2 rounded-lg hover:bg-gray-300 transition"
    >
      {showInactiveEmployees
        ? `Deaktivierte Mitarbeiter ausblenden (${inactiveEmployees.length})`
        : `Deaktivierte Mitarbeiter anzeigen (${inactiveEmployees.length})`}
    </button>

    {showInactiveEmployees && (
      <div className="mt-4 flex flex-col gap-3">

        {inactiveEmployees.map((employee) => (
          <div
            key={employee.id}
            className="border rounded-xl p-4 bg-gray-100"
          >
            <div className="flex justify-between items-center">

              <div>
                <p className="font-bold text-black">
                  {employee.name}
                </p>

                <p className="text-sm text-gray-500">
                  {employee.role}
                </p>
              </div>

              <button
                onClick={() =>
                  handleToggleAccountStatus(
                    employee.id,
                    employee.account_status
                  )
                }
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Reaktivieren
              </button>

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
      </div>

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
    </div>
  );
}
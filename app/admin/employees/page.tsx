"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

type Employee = {
  id: string;
  name: string;
  role: string;
  pin: string;
  status: string;
  account_status: string;
  hours: string;
};

type EmployeeTargetHour = {
  id: string;
  employee_id: string;
  weekly_hours: number;
};

type EmployeeWithTargetHours = Employee & {
  weekly_target_hours: number;
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

export default function EmployeesPage() {
  const [showForm, setShowForm] = useState(false);
  const [employees, setEmployees] = useState<EmployeeWithTargetHours[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Mitarbeiter");
  const [pin, setPin] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("40");

  async function loadEmployees() {
    const businessId = await getBusinessId();

    if (!businessId) {
      console.error("Keine Business-ID gefunden.");
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, role, pin, status, account_status, hours")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (employeeError) {
      console.error(employeeError);
      return;
    }

    const employeeIds = (employeeData || []).map((employee) => employee.id);

    let targetHours: EmployeeTargetHour[] = [];

    if (employeeIds.length > 0) {
      const { data: targetData, error: targetError } = await supabase
        .from("employee_target_hours")
        .select("id, employee_id, weekly_hours")
        .in("employee_id", employeeIds);

      if (targetError) {
        console.error(targetError);
      } else {
        targetHours = (targetData || []) as EmployeeTargetHour[];
      }
    }

    const employeesWithTargetHours = (employeeData || []).map((employee) => {
      const target = targetHours.find(
        (targetHour) => targetHour.employee_id === employee.id
      );

      return {
        ...employee,
        weekly_target_hours: target?.weekly_hours ?? 40,
      };
    });

    setEmployees(employeesWithTargetHours);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function handleAddEmployee() {
    if (isSaving) return;

    setIsSaving(true);

    try {
      if (!name.trim() || !pin.trim()) {
        alert("Bitte Name und PIN eingeben.");
        return;
      }

      const parsedWeeklyHours = Number(weeklyHours);

      if (!parsedWeeklyHours || parsedWeeklyHours <= 0) {
        alert("Bitte gültige Wochen-Sollstunden eingeben.");
        return;
      }

      const businessId = await getBusinessId();

      if (!businessId) {
        alert("Keine Business-ID gefunden.");
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
          },
        ])
        .select("id")
        .single();

      if (employeeError || !insertedEmployee) {
        console.error(employeeError);
        alert(JSON.stringify(employeeError, null, 2));
        return;
      }

      const { error: targetHoursError } = await supabase
        .from("employee_target_hours")
        .insert([
          {
            employee_id: insertedEmployee.id,
            weekly_hours: parsedWeeklyHours,
          },
        ]);

      if (targetHoursError) {
        console.error(targetHoursError);
        alert(JSON.stringify(targetHoursError, null, 2));
        return;
      }

      setName("");
      setRole("Mitarbeiter");
      setPin("");
      setWeeklyHours("40");
      setShowForm(false);

      await loadEmployees();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteEmployee(id: string) {
    const confirmed = confirm(
      "Möchtest du diesen Mitarbeiter wirklich löschen?"
    );

    if (!confirmed) return;

    const businessId = await getBusinessId();

    if (!businessId) {
      alert("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
      alert(JSON.stringify(error, null, 2));
      return;
    }

    await loadEmployees();
  }

  async function handleToggleAccountStatus(id: string, currentStatus: string) {
    const businessId = await getBusinessId();

    if (!businessId) {
      alert("Keine Business-ID gefunden.");
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
      alert(JSON.stringify(error, null, 2));
      return;
    }

    await loadEmployees();
  }

  async function handleUpdateWeeklyHours(
    employeeId: string,
    newWeeklyHours: number
  ) {
    if (!newWeeklyHours || newWeeklyHours <= 0) {
      alert("Bitte gültige Wochen-Sollstunden eingeben.");
      return;
    }

    const { data: existingTarget, error: existingError } = await supabase
      .from("employee_target_hours")
      .select("id")
      .eq("employee_id", employeeId)
      .maybeSingle();

    if (existingError) {
      console.error(existingError);
      alert(JSON.stringify(existingError, null, 2));
      return;
    }

    if (existingTarget) {
      const { error } = await supabase
        .from("employee_target_hours")
        .update({ weekly_hours: newWeeklyHours })
        .eq("id", existingTarget.id);

      if (error) {
        console.error(error);
        alert(JSON.stringify(error, null, 2));
        return;
      }
    } else {
      const { error } = await supabase.from("employee_target_hours").insert([
        {
          employee_id: employeeId,
          weekly_hours: newWeeklyHours,
        },
      ]);

      if (error) {
        console.error(error);
        alert(JSON.stringify(error, null, 2));
        return;
      }
    }

    await loadEmployees();
  }

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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                onChange={(event) => setPin(event.target.value)}
                disabled={isSaving}
                className="border p-3 rounded-lg bg-white text-black disabled:bg-gray-200"
              />

              <input
                type="number"
                min="1"
                placeholder="Wochen-Sollstunden"
                value={weeklyHours}
                onChange={(event) => setWeeklyHours(event.target.value)}
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

        <div className="md:hidden flex flex-col gap-4">
          {employees.map((employee) => (
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
                  <p className="text-gray-500 mb-1">Soll/Woche</p>
                  <p className="font-semibold text-black">
                    {employee.weekly_target_hours} Std.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-3">
                <label className="text-sm font-semibold text-gray-600">
                  Wochen-Sollstunden ändern
                </label>

                <input
                  type="number"
                  min="1"
                  defaultValue={employee.weekly_target_hours}
                  onBlur={(event) =>
                    handleUpdateWeeklyHours(
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
                  onClick={() => handleDeleteEmployee(employee.id)}
                  className="w-full bg-red-600 text-white px-3 py-3 rounded-lg hover:bg-red-700 transition"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Rolle</th>
                <th className="py-3 px-3">PIN</th>
                <th className="py-3 px-3">Konto</th>
                <th className="py-3 px-3">Soll/Woche</th>
                <th className="py-3 px-3">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b">
                  <td className="py-3 px-3 text-black">{employee.name}</td>

                  <td className="py-3 px-3 text-black">{employee.role}</td>

                  <td className="py-3 px-3 text-black">{employee.pin}</td>

                  <td
                    className={`py-3 px-3 font-bold ${getAccountStatusColor(
                      employee.account_status
                    )}`}
                  >
                    {formatAccountStatus(employee.account_status)}
                  </td>

                  <td className="py-3 px-3 text-black">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        defaultValue={employee.weekly_target_hours}
                        onBlur={(event) =>
                          handleUpdateWeeklyHours(
                            employee.id,
                            Number(event.target.value)
                          )
                        }
                        className="border p-2 rounded-lg bg-white text-black w-24"
                      />

                      <span>Std.</span>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex gap-3">
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
                        onClick={() => handleDeleteEmployee(employee.id)}
                        className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {employees.length === 0 && (
          <p className="text-gray-500 mt-4">
            Noch keine Mitarbeiter vorhanden.
          </p>
        )}
      </div>
    </div>
  );
}
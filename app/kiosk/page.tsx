"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type EmployeeStatus = "not_checked_in" | "checked_in" | "on_break";

type Employee = {
  id: string;
  name: string;
  pin: string;
  status: EmployeeStatus;
};

export default function KioskPage() {
  const [pin, setPin] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("id, name, pin, status");

    if (error) {
      console.error(error);
      return;
    }

    setEmployees(data as Employee[]);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function showMessage(text: string) {
    setMessage(text);
    setShowPopup(true);
    setPin("");
  }

  async function updateEmployeeStatus(
    employee: Employee,
    newStatus: EmployeeStatus
  ) {
    const { error } = await supabase
      .from("employees")
      .update({ status: newStatus })
      .eq("id", employee.id);

    if (error) {
      console.error(error);
      showMessage("Fehler beim Speichern.");
      return;
    }

    await loadEmployees();
  }

  async function createTimeEntry(employee: Employee, action: string) {
  const { error } = await supabase
    .from("time_entries")
    .insert([
      {
        employee_id: employee.id,
        employee_name: employee.name,
        action: action,
      },
    ]);

  if (error) {
    console.error(error);
    showMessage("Stempelschritt konnte nicht gespeichert werden.");
  }
}

  function findEmployeeByPin() {
    return employees.find((employee) => employee.pin === pin);
  }

  async function handleCheckIn() {
    const employee = findEmployeeByPin();

    if (!employee) {
      showMessage("Dieser PIN ist keinem Mitarbeiter zugeordnet.");
      return;
    }

    if (employee.status === "checked_in") {
      showMessage(`${employee.name} ist bereits eingestempelt.`);
      return;
    }

    if (employee.status === "on_break") {
      showMessage(`${employee.name} ist aktuell in der Pause.`);
      return;
    }

    await updateEmployeeStatus(employee, "checked_in");
    showMessage(`${employee.name} ist jetzt eingestempelt.`);

    await updateEmployeeStatus(employee, "checked_in");
    await createTimeEntry(employee, "check_in");
    showMessage(`${employee.name} ist jetzt eingestempelt.`);
  }

  async function handleStartBreak() {
    const employee = findEmployeeByPin();

    if (!employee) {
      showMessage("Dieser PIN ist keinem Mitarbeiter zugeordnet.");
      return;
    }

    if (employee.status === "not_checked_in") {
      showMessage("Du hast vergessen dich einzustempeln.");
      return;
    }

    if (employee.status === "on_break") {
      showMessage(`${employee.name} ist bereits in der Pause.`);
      return;
    }

    await updateEmployeeStatus(employee, "on_break");
    showMessage(`${employee.name} ist jetzt in der Pause.`);

    await updateEmployeeStatus(employee, "on_break");
    await createTimeEntry(employee, "break_start");
    showMessage(`${employee.name} ist jetzt in der Pause.`);
  }

  async function handleEndBreak() {
    const employee = findEmployeeByPin();

    if (!employee) {
      showMessage("Dieser PIN ist keinem Mitarbeiter zugeordnet.");
      return;
    }

    if (employee.status !== "on_break") {
      showMessage("Du hast keinen Pausenbeginn gestempelt.");
      return;
    }

    await updateEmployeeStatus(employee, "checked_in");
    showMessage(`${employee.name} arbeitet jetzt weiter.`);

    await updateEmployeeStatus(employee, "checked_in");
    await createTimeEntry(employee, "break_end");
    showMessage(`${employee.name} arbeitet jetzt weiter.`);
  }

  async function handleCheckOut() {
    const employee = findEmployeeByPin();

    if (!employee) {
      showMessage("Dieser PIN ist keinem Mitarbeiter zugeordnet.");
      return;
    }

    if (employee.status === "not_checked_in") {
      showMessage("Du hast vergessen dich einzustempeln.");
      return;
    }

    await updateEmployeeStatus(employee, "not_checked_in");
    showMessage(`${employee.name} ist jetzt ausgestempelt.`);

    await updateEmployeeStatus(employee, "not_checked_in");
    await createTimeEntry(employee, "check_out");
    showMessage(`${employee.name} ist jetzt ausgestempelt.`);
  }

  const activeEmployees = employees.filter(
    (employee) => employee.status === "checked_in"
  );

  const employeesOnBreak = employees.filter(
    (employee) => employee.status === "on_break"
  );

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 bg-white rounded-3xl shadow-xl p-10">
          <h1 className="text-5xl font-bold text-blue-950 mb-4 text-center">
            Shiftly Terminal
          </h1>

          <p className="text-center text-gray-500 mb-10">
            PIN eingeben und Stempelschritt auswählen
          </p>

          <input
            type="password"
            placeholder="4-stellige PIN"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            className="w-full border p-5 rounded-2xl text-3xl bg-white text-black text-center mb-8"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <button onClick={handleCheckIn} className="bg-green-600 text-white py-6 rounded-2xl text-2xl font-semibold hover:bg-green-700 transition hover:scale-105">
              Einstempeln
            </button>

            <button onClick={handleStartBreak} className="bg-yellow-500 text-white py-6 rounded-2xl text-2xl font-semibold hover:bg-yellow-600 transition hover:scale-105">
              Pause starten
            </button>

            <button onClick={handleEndBreak} className="bg-blue-600 text-white py-6 rounded-2xl text-2xl font-semibold hover:bg-blue-700 transition hover:scale-105">
              Pause beenden
            </button>

            <button onClick={handleCheckOut} className="bg-red-600 text-white py-6 rounded-2xl text-2xl font-semibold hover:bg-red-700 transition hover:scale-105">
              Ausstempeln
            </button>
          </div>
        </section>

        <aside className="bg-white rounded-3xl shadow-xl p-8">
          <h2 className="text-3xl font-bold text-blue-950 mb-6">
            Live-Status
          </h2>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-green-700 mb-3">
              Aktiv arbeitend
            </h3>

            {activeEmployees.length > 0 ? (
              <div className="flex flex-col gap-3">
                {activeEmployees.map((employee) => (
                  <div key={employee.id} className="bg-green-100 text-green-800 rounded-xl p-4 font-medium">
                    {employee.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">Niemand aktiv.</p>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-yellow-700 mb-3">
              In Pause
            </h3>

            {employeesOnBreak.length > 0 ? (
              <div className="flex flex-col gap-3">
                {employeesOnBreak.map((employee) => (
                  <div key={employee.id} className="bg-yellow-100 text-yellow-800 rounded-xl p-4 font-medium">
                    {employee.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">Niemand in Pause.</p>
            )}
          </div>
        </aside>
      </div>

      {showPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center">
            <p className="text-3xl font-bold text-blue-950 mb-8">
              {message}
            </p>

            <button onClick={() => setShowPopup(false)} className="bg-blue-950 text-white px-10 py-4 rounded-2xl text-xl font-semibold hover:bg-blue-900 transition hover:scale-105">
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
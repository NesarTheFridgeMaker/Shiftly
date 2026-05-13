"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Employee = {
  id: string;
  name: string;
  role: string;
  pin: string;
  status: string;
  account_status: string;
  hours: string;
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
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Mitarbeiter");
  const [pin, setPin] = useState("");

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setEmployees(data);
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  async function handleAddEmployee() {
    if (!name.trim() || !pin.trim()) return;

    const { error } = await supabase.from("employees").insert([
      {
        name,
        role,
        pin,
        status: "not_checked_in",
        account_status: "active",
        hours: "0 h",
      },
    ]);

    if (error) {
      console.error(error);
      return;
    }

    setName("");
    setRole("Mitarbeiter");
    setPin("");
    setShowForm(false);
    loadEmployees();
  }

  async function handleDeleteEmployee(id: string) {
    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    loadEmployees();
  }

  async function handleToggleAccountStatus(
    id: string,
    currentStatus: string
  ) {
    const newStatus =
      currentStatus === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("employees")
      .update({ account_status: newStatus })
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    loadEmployees();
  }

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold text-blue-950 mb-6 md:mb-8">
        Mitarbeiter
      </h1>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6">
        <button
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

            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="border p-3 rounded-lg bg-white text-black"
              />

              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="border p-3 rounded-lg bg-white text-black"
              >
                <option>Mitarbeiter</option>
                <option>Admin</option>
              </select>

              <input
                type="text"
                placeholder="4-stellige PIN"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                className="border p-3 rounded-lg bg-white text-black"
              />

              <button
                onClick={handleAddEmployee}
                className="bg-green-600 text-white py-3 rounded-lg cursor-pointer hover:bg-green-700 transition"
              >
                Speichern
              </button>
            </div>
          </div>
        )}

        {/* Mobile Kartenansicht */}
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

                  <p className="text-sm text-gray-500">
                    {employee.role}
                  </p>
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
                  <p className="font-semibold text-black">
                    {employee.pin}
                  </p>
                </div>

                <div className="bg-white rounded-xl p-3">
                  <p className="text-gray-500 mb-1">Stunden</p>
                  <p className="font-semibold text-black">
                    {employee.hours}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
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
                  onClick={() => handleDeleteEmployee(employee.id)}
                  className="w-full bg-red-600 text-white px-3 py-3 rounded-lg hover:bg-red-700 transition"
                >
                  Löschen
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Tabellenansicht */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-gray-600">
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Rolle</th>
                <th className="py-3 px-3">PIN</th>
                <th className="py-3 px-3">Konto</th>
                <th className="py-3 px-3">Stunden</th>
                <th className="py-3 px-3">Aktionen</th>
              </tr>
            </thead>

            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="border-b">
                  <td className="py-3 px-3 text-black">
                    {employee.name}
                  </td>

                  <td className="py-3 px-3 text-black">
                    {employee.role}
                  </td>

                  <td className="py-3 px-3 text-black">
                    {employee.pin}
                  </td>

                  <td
                    className={`py-3 px-3 font-bold ${getAccountStatusColor(
                      employee.account_status
                    )}`}
                  >
                    {formatAccountStatus(employee.account_status)}
                  </td>

                  <td className="py-3 px-3 text-black">
                    {employee.hours}
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex gap-3">
                      <button
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
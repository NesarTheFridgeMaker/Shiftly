"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

type ShiftTemplate = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

type WorkType = {
  id: string;
  name: string;
};

export default function SettingsPage() {
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);

  const [templateName, setTemplateName] = useState("");
  const [templateStart, setTemplateStart] = useState("");
  const [templateEnd, setTemplateEnd] = useState("");
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [workTypeName, setWorkTypeName] = useState(""); 

  async function loadShiftTemplates() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data, error } = await supabase
      .from("shift_templates")
      .select("id, name, start_time, end_time")
      .eq("business_id", businessId)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      alert(JSON.stringify(error, null, 2));
      return;
    }

    setShiftTemplates((data || []) as ShiftTemplate[]);
  }

  async function createShiftTemplate() {
    if (!templateName || !templateStart || !templateEnd) {
      alert("Bitte Name, Beginn und Ende ausfüllen.");
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      alert("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase.from("shift_templates").insert([
      {
        business_id: businessId,
        name: templateName,
        start_time: templateStart,
        end_time: templateEnd,
      },
    ]);

    if (error) {
      console.error(error);
      alert(JSON.stringify(error, null, 2));
      return;
    }

    setTemplateName("");
    setTemplateStart("");
    setTemplateEnd("");

    await loadShiftTemplates();
  }

  async function deleteShiftTemplate(id: string) {
    const confirmed = confirm("Möchtest du diese Schichtvorlage wirklich löschen?");

    if (!confirmed) return;

    const businessId = await getBusinessId();

    if (!businessId) {
      alert("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase
      .from("shift_templates")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
      alert(JSON.stringify(error, null, 2));
      return;
    }

    await loadShiftTemplates();
  }

  async function loadWorkTypes() {
  const businessId = await getBusinessId();

  if (!businessId) return;

  const { data, error } = await supabase
    .from("work_types")
    .select("id,name")
    .eq("business_id", businessId)
    .order("name");

  if (error) {
    console.error(error);
    return;
  }

  setWorkTypes((data || []) as WorkType[]);
}

async function createWorkType() {
  if (!workTypeName) return;

  const businessId = await getBusinessId();

  if (!businessId) return;

  const { error } = await supabase
    .from("work_types")
    .insert([
      {
        business_id: businessId,
        name: workTypeName,
      },
    ]);

  if (error) {
    console.error(error);
    return;
  }

  setWorkTypeName("");

  await loadWorkTypes();
}

async function deleteWorkType(id:string) {

const confirmed=confirm(
"Arbeitstyp löschen?"
);

if(!confirmed) return;

await supabase
.from("work_types")
.delete()
.eq("id",id);

await loadWorkTypes();

}

useEffect(() => {
  loadShiftTemplates();
  loadWorkTypes();
}, []);

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold text-blue-950 mb-6">
        Einstellungen
      </h1>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6 mb-8">
        <h2 className="text-2xl font-bold text-blue-950 mb-2">
          Schichtvorlagen
        </h2>

        <p className="text-gray-500 mb-6">
          Lege eigene Vorlagen wie Frühschicht, Mittelschicht oder Spätschicht
          fest. Diese können später im Dienstplan automatisch Zeiten ausfüllen.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-5">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Name
            </label>

            <input
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="z. B. Frühschicht"
              className="border p-3 rounded-lg bg-white text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Beginn
            </label>

            <input
              type="time"
              value={templateStart}
              onChange={(event) => setTemplateStart(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-600">
              Ende
            </label>

            <input
              type="time"
              value={templateEnd}
              onChange={(event) => setTemplateEnd(event.target.value)}
              className="border p-3 rounded-lg bg-white text-black"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={createShiftTemplate}
          className="w-full xl:w-auto bg-blue-950 text-white px-5 py-3 rounded-xl hover:bg-blue-900 transition"
        >
          Schichtvorlage speichern
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow p-4 md:p-6">
        <h2 className="text-2xl font-bold text-blue-950 mb-5">
          Gespeicherte Vorlagen
        </h2>

        {shiftTemplates.length > 0 ? (
          <div className="flex flex-col gap-3">
            {shiftTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-gray-50 rounded-xl p-4 border flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3"
              >
                <div>
                  <p className="font-bold text-blue-950">
                    {template.name}
                  </p>

                  <p className="text-gray-600">
                    {template.start_time.slice(0, 5)} -{" "}
                    {template.end_time.slice(0, 5)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => deleteShiftTemplate(template.id)}
                  className="w-full xl:w-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Löschen
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">
            Noch keine Schichtvorlagen vorhanden.
          </p>
        )}
      </div>
      <div className="bg-white rounded-2xl shadow p-4 md:p-6 mt-8">

<h2 className="text-2xl font-bold text-blue-950 mb-2">
Arbeitstypen
</h2>

<p className="text-gray-500 mb-5">
Lege Bereiche wie Küche, Service oder Information fest.
</p>

<div className="flex flex-col md:flex-row gap-3">
  <input
    type="text"
    placeholder="z.B. Service"
    value={workTypeName}
    onChange={(e) => setWorkTypeName(e.target.value)}
    className="
      flex-1
      border
      p-3
      rounded-xl
      bg-white
      text-black
      min-w-0
    "
  />

  <button
    type="button"
    onClick={createWorkType}
    className="
      w-full
      md:w-auto
      bg-blue-950
      text-white
      px-6
      py-3
      rounded-xl
      hover:bg-blue-900
      transition
    "
  >
    Hinzufügen
  </button>
</div>

<div className="flex flex-col gap-3">

{workTypes.map(type=>(

<div
key={type.id}
className="
bg-gray-50
rounded-xl
p-4
border
flex
justify-between
items-center
"
>

<p className="font-bold text-blue-950">

{type.name}

</p>

<button
onClick={()=>deleteWorkType(type.id)}
className="
bg-red-600
text-white
px-4 py-2
rounded-lg
"
>

Löschen

</button>

</div>

))}

</div>

</div>
    </div>
  );
}
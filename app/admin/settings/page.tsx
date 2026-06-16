"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";
import DiperaPopup from "@/components/DiperaPopup";
import { calculateSurcharges } from "@/lib/payroll/calculateSurcharges";

type PayRule = {
  id: string;
  business_id: string;
  name: string;
  rule_type: string;
  starts_at: string | null;
  ends_at: string | null;
  percentage: number;
  datev_wage_type: string | null;
  active: boolean;
};

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
  const [payRuleName, setPayRuleName] = useState("");
  const [payRuleType, setPayRuleType] = useState("night");
  const [payRuleStart, setPayRuleStart] = useState("");
  const [payRuleEnd, setPayRuleEnd] = useState("");
  const [payRulePercentage, setPayRulePercentage] = useState("");
  const [payRuleDatevType, setPayRuleDatevType] = useState("");
  const [payRules, setPayRules] =
  useState<PayRule[]>([]);
  const [federalState, setFederalState] =
  useState("BW");
  const [
  datevRegularHoursWageType,
  setDatevRegularHoursWageType
] = useState("100");
const [
  datevSalaryWageType,
  setDatevSalaryWageType
] = useState("101");

const [
  datevOvertimeWageType,
  setDatevOvertimeWageType
] = useState("130");

  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  

  const [confirmMessage, setConfirmMessage] = useState("");

  const [confirmAction, setConfirmAction] =
  useState<(() => void) | null>(null);

  const [showConfirmPopup, setShowConfirmPopup] =
  useState(false);

  const [
  datevVacationWageType,
  setDatevVacationWageType
] = useState("140");

const [
  datevSickWageType,
  setDatevSickWageType
] = useState("141");

  function showDiperaPopup(text:string){
  setPopupMessage(text);
  setShowPopup(true);
}

function showConfirm(
  text:string,
  action:()=>void
){
  setConfirmMessage(text);

  setConfirmAction(()=>action);

  setShowConfirmPopup(true);
}

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
      showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
      return;
    }

    setShiftTemplates((data || []) as ShiftTemplate[]);
  }

  async function createShiftTemplate() {
    if (!templateName || !templateStart || !templateEnd) {
      showDiperaPopup(
"Bitte Name, Beginn und Ende ausfüllen."
);
      return;
    }

    const businessId = await getBusinessId();

    if (!businessId) {
      showDiperaPopup(
"Keine Business-ID gefunden."
);
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
      showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
      return;
    }

    setTemplateName("");
    setTemplateStart("");
    setTemplateEnd("");

    await loadShiftTemplates();
  }

  async function deleteShiftTemplate(id: string) {

    const businessId = await getBusinessId();

    if (!businessId) {
      showDiperaPopup("Keine Business-ID gefunden.");
      return;
    }

    const { error } = await supabase
      .from("shift_templates")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error(error);
      showDiperaPopup(
"Es ist ein Fehler aufgetreten."
);
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

await supabase
.from("work_types")
.delete()
.eq("id",id);

await loadWorkTypes();

}

async function loadPayRules() {
  const businessId = await getBusinessId();

  if (!businessId) return;

  const { data } = await supabase
    .from("pay_rules")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (data) {
    setPayRules(data);
  }
}

async function handleCreatePayRule() {
  const businessId = await getBusinessId();

  if (!businessId) return;

  if (
    !payRuleName.trim() ||
    !payRulePercentage
  ) {
    return;
  }

  const { error } =
    await supabase
      .from("pay_rules")
      .insert([
        {
          business_id: businessId,
          name: payRuleName.trim(),
          rule_type: payRuleType,
          starts_at:
            payRuleStart || null,
          ends_at:
            payRuleEnd || null,
          percentage:
            Number(
              payRulePercentage
            ),
          datev_wage_type:
            payRuleDatevType.trim()
            || null
        }
      ]);

  if (error) {
    console.error(error);
    return;
  }

  setPayRuleName("");
  setPayRuleType("night");
  setPayRuleStart("");
  setPayRuleEnd("");
  setPayRulePercentage("");
  setPayRuleDatevType("");

  await loadPayRules();

  showDiperaPopup(
  "Zuschlag wurde erfolgreich erstellt."
);
}

  async function handleDeletePayRule(ruleId: string) {
  const { error } = await supabase
    .from("pay_rules")
    .delete()
    .eq("id", ruleId);

  if (error) {
    console.error(error);
    return;
  }

 await loadPayRules();

  showDiperaPopup(
  "Zuschlag wurde erfolgreich gelöscht."
);
}

async function handleTogglePayRuleActive(
  ruleId: string,
  currentActive: boolean
) {
  const { error } = await supabase
    .from("pay_rules")
    .update({
      active: !currentActive,
    })
    .eq("id", ruleId);

  if (error) {
    console.error(error);
    return;
  }

  await loadPayRules();

  showDiperaPopup(
    currentActive
      ? "Zuschlag wurde deaktiviert."
      : "Zuschlag wurde aktiviert."
  );
}

async function loadBusiness() {
  const businessId =
    await getBusinessId();

  if (!businessId) return;

  const { data, error } =
    await supabase
      .from("businesses")
      .select(
  "federal_state, datev_regular_hours_wage_type, datev_salary_wage_type, datev_overtime_wage_type, datev_vacation_wage_type, datev_sick_wage_type"
)
      .eq("id", businessId)
      .single();

      if (data?.datev_vacation_wage_type) {
  setDatevVacationWageType(data.datev_vacation_wage_type);
}

if (data?.datev_sick_wage_type) {
  setDatevSickWageType(data.datev_sick_wage_type);
}

      if (data?.datev_overtime_wage_type) {
  setDatevOvertimeWageType(
    data.datev_overtime_wage_type
  );
}

      if (data?.datev_salary_wage_type) {
  setDatevSalaryWageType(
    data.datev_salary_wage_type
  );
}

  if (error) {
    console.error(error);
    return;
  }

  if (data?.federal_state) {
    setFederalState(
      data.federal_state
    );
  }

  if (
  data?.datev_regular_hours_wage_type
) {
  setDatevRegularHoursWageType(
    data.datev_regular_hours_wage_type
  );
}
}



async function saveFederalState() {
  console.log("SAVE FEDERAL STATE CLICKED", federalState);

  const businessId = await getBusinessId();

  console.log("BUSINESS ID", businessId);

  if (!businessId) return;

  const { error } = await supabase
    .from("businesses")
    .update({
  federal_state: federalState,
  datev_regular_hours_wage_type:
    datevRegularHoursWageType.trim() || null,
    datev_salary_wage_type:
  datevSalaryWageType.trim() || null,
  datev_overtime_wage_type:
  datevOvertimeWageType.trim() || null,
  datev_vacation_wage_type:
  datevVacationWageType.trim() || null,

datev_sick_wage_type:
  datevSickWageType.trim() || null,
})
    .eq("id", businessId);

  if (error) {
    console.error("FEDERAL STATE SAVE ERROR:", error);
    showDiperaPopup("Bundesland konnte nicht gespeichert werden.");
    return;
  }

  console.log("FEDERAL STATE SAVED");

  showDiperaPopup("Daten gespeichert.");
}

useEffect(() => {
  loadShiftTemplates();
  loadWorkTypes();
  loadPayRules();
  loadBusiness();
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
                  onClick={()=>
                  showConfirm(
                  "Möchtest du diese Schichtvorlage wirklich löschen?",
                  ()=>deleteShiftTemplate(template.id)
                  )
                  }
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
Lohn & Zuschläge
</h2>

<div className="bg-white rounded-2xl shadow p-6 mb-8">
  <h2 className="text-2xl font-semibold text-blue-950 mb-4">
    Standort
  </h2>

  <div className="flex flex-col gap-4 max-w-md">

    <select
      value={federalState}
      onChange={(event) =>
        setFederalState(
          event.target.value
        )
      }
      className="border p-3 rounded-xl bg-white text-black"
    >
<option value="BW">Baden-Württemberg</option>
<option value="BY">Bayern</option>
<option value="BE">Berlin</option>
<option value="BB">Brandenburg</option>
<option value="HB">Bremen</option>
<option value="HH">Hamburg</option>
<option value="HE">Hessen</option>
<option value="MV">Mecklenburg-Vorpommern</option>
<option value="NI">Niedersachsen</option>
<option value="NW">Nordrhein-Westfalen</option>
<option value="RP">Rheinland-Pfalz</option>
<option value="SL">Saarland</option>
<option value="SN">Sachsen</option>
<option value="ST">Sachsen-Anhalt</option>
<option value="SH">Schleswig-Holstein</option>
<option value="TH">Thüringen</option>
    </select>

    <div className="flex flex-col gap-1">
  <label className="text-sm font-semibold text-gray-600">
    DATEV-Lohnart für reguläre Arbeitsstunden
  </label>

  <input
    type="text"
    value={datevRegularHoursWageType}
    onChange={(event) =>
      setDatevRegularHoursWageType(event.target.value)
    }
    placeholder="z. B. 100"
    className="border p-3 rounded-xl bg-white text-black"
  />
</div>

<div className="flex flex-col gap-1">
  <label className="text-sm font-semibold text-gray-600">
    DATEV-Lohnart Monatsgehalt
  </label>

  <input
    type="text"
    value={datevSalaryWageType}
    onChange={(event) =>
      setDatevSalaryWageType(event.target.value)
    }
    placeholder="z. B. 101"
    className="border p-3 rounded-xl bg-white text-black"
  />
</div>

<div className="flex flex-col gap-1">
  <label className="text-sm font-semibold text-gray-600">
    DATEV-Lohnart Überstunden
  </label>

  <input
    type="text"
    value={datevOvertimeWageType}
    onChange={(event) =>
      setDatevOvertimeWageType(event.target.value)
    }
    placeholder="z. B. 130"
    className="border p-3 rounded-xl bg-white text-black"
  />
</div>

<div className="flex flex-col gap-1">
  <label className="text-sm font-semibold text-gray-600">
    DATEV-Lohnart Urlaubstage
  </label>

  <input
    type="text"
    value={datevVacationWageType}
    onChange={(event) =>
      setDatevVacationWageType(event.target.value)
    }
    placeholder="z. B. 140"
    className="border p-3 rounded-xl bg-white text-black"
  />
</div>

<div className="flex flex-col gap-1">
  <label className="text-sm font-semibold text-gray-600">
    DATEV-Lohnart Krankheitstage
  </label>

  <input
    type="text"
    value={datevSickWageType}
    onChange={(event) =>
      setDatevSickWageType(event.target.value)
    }
    placeholder="z. B. 141"
    className="border p-3 rounded-xl bg-white text-black"
  />
</div>

    <button
      type="button"
      onClick={saveFederalState}
      className="bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition"
    >
      Bundesland & Lohnart speichern
    </button>

  </div>
</div>

<p className="text-gray-500 mb-6">
Lege Nacht-, Sonn- oder Feiertagszuschläge fest.
</p>

<div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

<div className="flex flex-col gap-1">
<label className="text-sm font-semibold text-gray-600">
Name
</label>

<input
value={payRuleName}
onChange={(e)=>setPayRuleName(e.target.value)}
placeholder="z.B. Nachtzuschlag"
className="border p-3 rounded-lg bg-white text-black"
/>
</div>

<div className="flex flex-col gap-1">
<label className="text-sm font-semibold text-gray-600">
Typ
</label>

<select
value={payRuleType}
onChange={(e)=>setPayRuleType(e.target.value)}
className="border p-3 rounded-lg bg-white text-black"
>
<option value="night">Nacht</option>
<option value="sunday">Sonntag</option>
<option value="holiday">Feiertag</option>
</select>
</div>

<div className="flex flex-col gap-1">
<label className="text-sm font-semibold text-gray-600">
Zuschlag %
</label>

<input
type="number"
value={payRulePercentage}
onChange={(e)=>setPayRulePercentage(e.target.value)}
placeholder="25"
className="border p-3 rounded-lg bg-white text-black"
/>
</div>

<div className="flex flex-col gap-1">
<label className="text-sm font-semibold text-gray-600">
Von
</label>

<input
type="time"
value={payRuleStart}
onChange={(e)=>setPayRuleStart(e.target.value)}
className="border p-3 rounded-lg bg-white text-black"
/>
</div>

<div className="flex flex-col gap-1">
<label className="text-sm font-semibold text-gray-600">
Bis
</label>

<input
type="time"
value={payRuleEnd}
onChange={(e)=>setPayRuleEnd(e.target.value)}
className="border p-3 rounded-lg bg-white text-black"
/>
</div>

<div className="flex flex-col gap-1">
<label className="text-sm font-semibold text-gray-600">
DATEV-Lohnart
</label>

<input
value={payRuleDatevType}
onChange={(e)=>setPayRuleDatevType(e.target.value)}
placeholder="z.B. 150"
className="border p-3 rounded-lg bg-white text-black"
/>
</div>

</div>

<button
type="button"
onClick={handleCreatePayRule}
className="mt-5 w-full xl:w-auto bg-blue-950 text-white px-5 py-3 rounded-xl"
>
Zuschlag speichern
</button>

<div className="mt-6 flex flex-col gap-3">

{payRules.map((rule)=>(

<div
key={rule.id}
className="border rounded-xl p-4"
>

<div className="font-bold text-blue-950">
  {rule.name}
</div>

<div
  className={`text-sm font-bold ${
    rule.active
      ? "text-green-600"
      : "text-red-600"
  }`}
>
  {rule.active
    ? "Aktiv"
    : "Inaktiv"}
</div>

<div className="text-sm text-gray-600">

{rule.rule_type === "night"
 ? "Nacht"
 : rule.rule_type === "sunday"
 ? "Sonntag"
 : rule.rule_type === "holiday"
 ? "Feiertag"
 : rule.rule_type}

{" • "}

{rule.percentage}%

{rule.starts_at &&
rule.ends_at &&
` • ${rule.starts_at} - ${rule.ends_at}`}

</div>

{rule.datev_wage_type && (

<div className="text-sm text-gray-500 mt-1">

DATEV:
{rule.datev_wage_type}

</div>


)}

<button
  type="button"
  onClick={() =>
    handleTogglePayRuleActive(
      rule.id,
      rule.active
    )
  }
  className={`mt-3 mr-2 px-3 py-2 rounded-lg text-white transition ${
    rule.active
      ? "bg-yellow-500 hover:bg-yellow-600"
      : "bg-green-600 hover:bg-green-700"
  }`}
>
  {rule.active ? "Deaktivieren" : "Aktivieren"}
</button>

<button
  type="button"
  onClick={() => handleDeletePayRule(rule.id)}
  className="mt-3 bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition"
>
  Löschen
</button>

</div>


))}

</div>


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
onClick={()=>
showConfirm(
"Arbeitstyp wirklich löschen?",
()=>deleteWorkType(type.id)
)
}
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
{showPopup && (
<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">

<div className="max-w-lg w-full text-center rounded-3xl bg-[#0B1220]/95 p-8">

<p className="text-2xl font-bold text-white mb-8">

{popupMessage}

</p>

<button
onClick={()=>setShowPopup(false)}
className="bg-blue-600 text-white px-10 py-4 rounded-2xl"
>

OK

</button>

</div>

</div>
)}

{showConfirmPopup && (

<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">

<div className="max-w-lg w-full text-center rounded-3xl bg-[#0B1220]/95 p-8">

<p className="text-2xl font-bold text-white mb-8">

{confirmMessage}

</p>

<div className="flex gap-3 justify-center">

<button
onClick={()=>
setShowConfirmPopup(false)
}
className="bg-gray-600 text-white px-8 py-4 rounded-xl"
>

Abbrechen

</button>

<button
onClick={()=>{
confirmAction?.();

setShowConfirmPopup(false);
}}
className="bg-red-600 text-white px-8 py-4 rounded-xl"
>

Löschen

</button>

</div>

</div>

</div>

)}
<DiperaPopup
  open={showPopup}
  message={popupMessage}
  onClose={() => {
    setShowPopup(false);
    setPopupMessage("");
  }}
/>
    </div>
  );
}
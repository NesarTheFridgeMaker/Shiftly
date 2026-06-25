"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getBusinessId } from "@/lib/getBusinessId";

type CorrectionRequest = {
  id: string;
  business_id: string;
  employee_id: string;
  employee_name: string;
  correction_date: string;
  requested_start_time: string | null;
  requested_end_time: string | null;
  reason: string | null;
  status: string;
  created_at: string;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("de-DE");
}

function formatStatus(status: string) {
  if (status === "pending") return "Offen";
  if (status === "approved") return "Genehmigt";
  if (status === "rejected") return "Abgelehnt";
  return status;
}

export default function CorrectionsPage() {
  const [requests, setRequests] = useState<CorrectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [popupMessage, setPopupMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  function showDiperaPopup(message: string) {
  setPopupMessage(message);
  setShowPopup(true);
}

  async function loadCorrectionRequests() {
    const businessId = await getBusinessId();

    if (!businessId) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("time_correction_requests")
      .select("*")
      .eq("business_id", businessId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setRequests(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadCorrectionRequests();
  }, []);

async function handleRejectRequest(request: CorrectionRequest) {
  console.log("Reject clicked", request.id);

  const { error } = await supabase
    .from("time_correction_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (error) {
    console.error("REJECT ERROR:", error);
    alert(error.message);
    return;
  }
  const { data: profile } = await supabase
  .from("profiles")
  .select("id")
  .eq("employee_id", request.employee_id)
  .single();
  
  if (profile?.id) {
  await supabase.from("notifications").insert([
  {
    business_id: request.business_id,
    user_id: profile?.id,
    employee_id: request.employee_id,
    title: "Korrekturantrag abgelehnt",
    message: `Dein Korrekturantrag für den ${formatDate(
      request.correction_date
    )} wurde abgelehnt.`,
    type: "time_correction",
    is_read: false,
  },
]);
}
  await loadCorrectionRequests();
  window.dispatchEvent(
  new Event("correctionRequestsChanged")
);
  showDiperaPopup("Der Antrag wurde erfolgreich abgelehnt.");
}

async function handleApproveRequest(request: CorrectionRequest) {
  if (!request.requested_start_time || !request.requested_end_time) {
    showDiperaPopup(
      "Der Antrag kann nicht genehmigt werden, weil Beginn oder Ende fehlt."
    );
    return;
  }

  const startDateTime =
    `${request.correction_date}T${request.requested_start_time}`;

  const endDateTime =
    `${request.correction_date}T${request.requested_end_time}`;

  const startDate = new Date(startDateTime);
  let endDate = new Date(endDateTime);

  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  const { error: insertError } = await supabase
    .from("time_entries")
    .insert([
      {
        business_id: request.business_id,
        employee_id: request.employee_id,
        employee_name: request.employee_name,
        action: "check_in",
        created_at: startDate.toISOString(),
      },
      {
        business_id: request.business_id,
        employee_id: request.employee_id,
        employee_name: request.employee_name,
        action: "check_out",
        created_at: endDate.toISOString(),
      },
    ]);

  if (insertError) {
    console.error(insertError);
    showDiperaPopup("Die Arbeitszeit konnte nicht erstellt werden.");
    return;
  }

  const { error: updateError } = await supabase
    .from("time_correction_requests")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", request.id);

  if (updateError) {
    console.error(updateError);
    showDiperaPopup(
      "Die Arbeitszeit wurde erstellt, aber der Antrag konnte nicht als genehmigt markiert werden."
    );
    return;
  }

  const { data: profile } = await supabase
  .from("profiles")
  .select("id")
  .eq("employee_id", request.employee_id)
  .single();

  if (profile?.id) {
  await supabase.from("notifications").insert([
    {
      business_id: request.business_id,
      user_id: profile?.id,
      employee_id: request.employee_id,
      title: "Korrekturantrag genehmigt",
      message: `Dein Korrekturantrag für den ${formatDate(
        request.correction_date
      )} wurde genehmigt.`,
      type: "time_correction",
      is_read: false,
    },
  ]);
}

  await loadCorrectionRequests();

  window.dispatchEvent(
    new Event("correctionRequestsChanged")
  );

  showDiperaPopup("Der Antrag wurde erfolgreich genehmigt.");
}

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-blue-950">
          Korrekturanträge
        </h1>

        <p className="text-gray-500 mt-2">
          Hier siehst du beantragte Korrekturen für vergessene oder fehlerhafte Stempelzeiten.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow p-6">
          Lade Korrekturanträge...
        </div>
      ) : requests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-6 text-gray-600">
          Aktuell liegen keine Korrekturanträge vor.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="bg-white rounded-2xl shadow p-5 border"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-blue-950">
                    {request.employee_name}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Antrag vom {formatDate(request.created_at)}
                  </p>
                </div>

                <span
                  className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                    request.status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : request.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {formatStatus(request.status)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                <div className="bg-gray-50 rounded-xl p-4 border">
                  <p className="text-sm text-gray-500">Datum</p>
                  <p className="font-bold text-blue-950">
                    {formatDate(request.correction_date)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border">
                  <p className="text-sm text-gray-500">Arbeitsbeginn</p>
                  <p className="font-bold text-blue-950">
                    {request.requested_start_time || "-"}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 border">
                  <p className="text-sm text-gray-500">Arbeitsende</p>
                  <p className="font-bold text-blue-950">
                    {request.requested_end_time || "-"}
                  </p>
                </div>
              </div>

              <div className="mt-5 bg-gray-50 rounded-xl p-4 border">
                <p className="text-sm text-gray-500 mb-1">Begründung</p>
                <p className="text-gray-800">
                  {request.reason || "Keine Begründung angegeben."}
                </p>
              </div>

              {request.status === "pending" && (
                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => handleApproveRequest(request)}
                    className="flex-1 bg-blue-950 text-white px-5 py-3 rounded-xl font-semibold hover:bg-blue-900 transition"
                  >
                    Genehmigen
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRejectRequest(request)}
                    className="flex-1 bg-red-600 text-white px-5 py-3 rounded-xl font-semibold hover:bg-red-700 transition"
                  >
                    Ablehnen
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showPopup && (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50">

    <div className="max-w-lg w-full text-center rounded-3xl border border-white/10 bg-[#0B1220]/95 shadow-2xl p-8 md:p-10">

      <p className="text-2xl md:text-3xl font-bold text-white mb-8 leading-snug">
        {popupMessage}
      </p>

      <button
        type="button"
        onClick={() => setShowPopup(false)}
        className="bg-gradient-to-r from-blue-700 to-blue-500 text-white px-12 py-4 rounded-2xl text-xl font-bold shadow-xl hover:scale-105 transition"
      >
        OK
      </button>

    </div>

  </div>
)}
      
    </div>
  );
}
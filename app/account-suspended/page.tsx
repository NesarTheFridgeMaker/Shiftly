export default function AccountSuspendedPage() {
  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-lg w-full text-center">
        <h1 className="text-3xl font-bold text-blue-950 mb-4">
          Zugang vorübergehend gesperrt
        </h1>

        <p className="text-gray-600 mb-6">
          Dieses Unternehmen ist aktuell nicht aktiv. Bitte wende dich an den
          Dipera-Support oder aktualisiere deine Zahlungsinformationen.
        </p>

        <a
          href="/login"
          className="inline-block bg-blue-950 text-white px-5 py-3 rounded-xl hover:bg-blue-900 transition"
        >
          Zurück zum Login
        </a>
      </div>
    </main>
  );
}
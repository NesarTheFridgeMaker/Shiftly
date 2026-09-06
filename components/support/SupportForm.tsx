"use client";

import { FormEvent, useState } from "react";
import { Mail, MessageSquare, Send } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useToast } from "@/components/ui/ToastProvider";

type SupportFormProps = {
  mode: "contact" | "feedback";
  defaultName?: string;
  defaultEmail?: string;
};

export default function SupportForm({
  mode,
  defaultName = "",
  defaultEmail = "",
}: SupportFormProps) {
  const { showToast } = useToast();

  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [subject, setSubject] = useState(
    mode === "feedback" ? "Feedback zu Dipera" : "",
  );
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      showToast({
        type: "warning",
        title: "Angaben fehlen",
        description: "Bitte fülle Name, E-Mail, Betreff und Nachricht aus.",
      });
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/support/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: mode,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
          website: honeypot,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          result?.error || "Die Nachricht konnte nicht gesendet werden.",
        );
      }

      setMessage("");

      if (mode === "contact") {
        setSubject("");
      } else {
        setSubject("Feedback zu Dipera");
      }

      showToast({
        type: "success",
        title:
          mode === "feedback"
            ? "Feedback gesendet"
            : "Nachricht gesendet",
        description:
          mode === "feedback"
            ? "Vielen Dank. Dein Feedback wurde an den Dipera-Support gesendet."
            : "Deine Nachricht wurde an den Dipera-Support gesendet.",
      });
    } catch (error) {
      showToast({
        type: "error",
        title: "Senden fehlgeschlagen",
        description:
          error instanceof Error
            ? error.message
            : "Bitte versuche es später erneut.",
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Dein Name"
        />

        <Input
          label="E-Mail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@unternehmen.de"
        />
      </div>

      <Input
        label="Betreff"
        value={subject}
        onChange={(event) => setSubject(event.target.value)}
        placeholder={
          mode === "feedback"
            ? "z. B. Feedback zur Schichtplanung"
            : "Worum geht es?"
        }
      />

      <div>
        <label className="mb-2 block text-sm font-medium text-[#334155]">
          {mode === "feedback" ? "Dein Feedback" : "Nachricht"}
        </label>

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={8}
          placeholder={
            mode === "feedback"
              ? "Was gefällt dir, was fehlt dir oder was sollte Dipera besser machen?"
              : "Beschreibe dein Anliegen möglichst genau."
          }
          className="w-full resize-y rounded-2xl border border-transparent bg-[#E9EEF4] px-4 py-3 text-sm text-[#0F172A] outline-none shadow-[0_3px_9px_rgba(15,23,42,0.05)] transition placeholder:text-[#94A3B8] hover:bg-[#E3E9F0] focus:border-[#60A5FA] focus:bg-white focus:ring-4 focus:ring-[#DBEAFE]"
        />
      </div>

      <input
        type="text"
        value={honeypot}
        onChange={(event) => setHoneypot(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <div className="rounded-2xl border border-[#CBD5E1] bg-[#EEF2F6] px-4 py-3 text-sm leading-6 text-[#64748B] shadow-[0_3px_10px_rgba(15,23,42,0.05)]">
        <div className="flex items-start gap-3">
          {mode === "feedback" ? (
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
          ) : (
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
          )}

          <p>
            {mode === "feedback"
              ? "Dein Feedback wird direkt an den Dipera-Support gesendet und hilft bei der Weiterentwicklung."
              : "Deine Nachricht wird direkt an support@dipera.de gesendet. Antworten erhältst du an die oben angegebene E-Mail-Adresse."}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={isSending}>
          <Send className="h-4 w-4" />
          {mode === "feedback" ? "Feedback senden" : "Nachricht senden"}
        </Button>
      </div>
    </form>
  );
}

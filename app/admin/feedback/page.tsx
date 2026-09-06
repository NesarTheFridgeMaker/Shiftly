"use client";

import { Lightbulb, MessageSquare } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import SupportForm from "@/components/support/SupportForm";

export default function FeedbackPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Feedback senden"
        description="Teile uns mit, was gut funktioniert und was Dipera noch besser machen sollte."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.55fr]">
        <Section
          title="Dein Feedback"
          description="Feature-Wünsche, Verbesserungsvorschläge oder allgemeine Rückmeldungen."
          action={<Badge variant="primary">Feedback</Badge>}
        >
          <div className="rounded-3xl border border-[#CBD5E1] bg-[#F8FAFC] p-5 shadow-[0_8px_22px_rgba(15,23,42,0.09)] md:p-6">
            <SupportForm mode="feedback" />
          </div>
        </Section>

        <div className="space-y-6">
          <div className="rounded-3xl border border-[#CBD5E1] bg-[#EEF2F6] p-6 shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F2FB] text-[#2563EB]">
              <Lightbulb className="h-5 w-5" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[#0F172A]">
              Besonders hilfreich
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Beschreibe möglichst konkret, in welchem Bereich du etwas ändern
              würdest und wie dein idealer Ablauf aussehen sollte.
            </p>
          </div>

          <div className="rounded-3xl border border-[#CBD5E1] bg-[#EEF2F6] p-6 shadow-[0_8px_22px_rgba(15,23,42,0.09)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F2FB] text-[#2563EB]">
              <MessageSquare className="h-5 w-5" />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[#0F172A]">
              Direkt beim Dipera-Team
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#64748B]">
              Dein Feedback wird direkt an den Support geschickt und nicht
              öffentlich veröffentlicht.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

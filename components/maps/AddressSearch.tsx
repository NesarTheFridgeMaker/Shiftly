"use client";

import { FormEvent, useState } from "react";
import { MapPin, Search } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export type AddressSearchResult = {
  featureId: string;
  featureType: string;
  name: string;
  displayName: string;

  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  countryCode: string;

  latitude: number;
  longitude: number;

  accuracy: string | null;
};

type AddressSearchProps = {
  onSelect: (result: AddressSearchResult) => void;
  initialQuery?: string;
  disabled?: boolean;
};

type SearchResponse = {
  results?: AddressSearchResult[];
  error?: string;
};

export default function AddressSearch({
  onSelect,
  initialQuery = "",
  disabled = false,
}: AddressSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSearch(event?: FormEvent) {
    event?.preventDefault();

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 3) {
      setErrorMessage("Bitte gib mindestens drei Zeichen ein.");
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setErrorMessage("");
    setHasSearched(false);

    try {
      const response = await fetch(
        `/api/geocoding/forward?q=${encodeURIComponent(trimmedQuery)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const payload = (await response.json()) as SearchResponse;

      if (!response.ok) {
        throw new Error(
          payload.error || "Die Adresse konnte nicht gesucht werden."
        );
      }

      const nextResults = payload.results ?? [];

      setResults(nextResults);
      setHasSearched(true);

      if (nextResults.length === 0) {
        setErrorMessage(
          "Keine passende Adresse gefunden. Ergänze Straße, Hausnummer und Ort."
        );
      }
    } catch (error) {
      console.error("ADDRESS SEARCH ERROR:", error);

      setResults([]);
      setHasSearched(true);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Bei der Adresssuche ist ein Fehler aufgetreten."
      );
    } finally {
      setIsSearching(false);
    }
  }

  function handleSelect(result: AddressSearchResult) {
    setQuery(result.displayName);
    setResults([]);
    setHasSearched(false);
    setErrorMessage("");

    onSelect(result);
  }

  return (
    <div>
      <form
  onSubmit={handleSearch}
  className="space-y-3"
>
  <Input
    label="Adresse oder Betrieb suchen"
    value={query}
    onChange={(event) => {
      setQuery(event.target.value);
      setErrorMessage("");
    }}
    placeholder="z. B. Musterladen Stuttgart oder Musterstraße 10"
    disabled={disabled || isSearching}
  />

  <Button
    type="submit"
    variant="secondary"
    loading={isSearching}
    disabled={disabled}
    fullWidth
  >
    <Search className="h-4 w-4" />
    Adresse suchen
  </Button>
</form>
      {errorMessage && (
        <div className="mt-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
          <p className="text-sm leading-6 text-[#B91C1C]">
            {errorMessage}
          </p>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
          {results.map((result) => (
            <button
              key={result.featureId}
              type="button"
              onClick={() => handleSelect(result)}
              className="flex w-full items-start gap-3 border-b border-[#E2E8F0] px-4 py-4 text-left transition last:border-b-0 hover:bg-[#F8FAFC] focus:bg-[#EFF6FF] focus:outline-none"
            >
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#005CA8]">
                <MapPin className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0F172A]">
                  {result.street
                    ? `${result.street}${
                        result.houseNumber
                          ? ` ${result.houseNumber}`
                          : ""
                      }`
                    : result.name || result.city || "Standort"}
                </p>

                <p className="mt-1 text-sm leading-5 text-[#64748B]">
                  {result.displayName}
                </p>

                {result.accuracy && (
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Genauigkeit: {result.accuracy}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {hasSearched &&
        !isSearching &&
        results.length === 0 &&
        !errorMessage && (
          <div className="mt-3 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-5 text-sm text-[#64748B]">
            Keine passende Adresse gefunden.
          </div>
        )}
    </div>
  );
}
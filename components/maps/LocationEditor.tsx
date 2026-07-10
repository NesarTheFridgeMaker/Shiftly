"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import {
  Crosshair,
  MapPin,
  Navigation,
  ShieldCheck,
} from "lucide-react";

import AddressSearch, {
  AddressSearchResult,
} from "@/components/maps/AddressSearch";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const BusinessLocationMap = dynamic(
  () => import("@/components/maps/BusinessLocationMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] items-center justify-center rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] md:h-[440px]">
        <p className="text-sm text-[#64748B]">
          Karte wird geladen …
        </p>
      </div>
    ),
  }
);

export type LocationEditorValue = {
  name: string;

  address: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: string;
  countryCode: string;

  mapboxFeatureId: string;

  latitude: number;
  longitude: number;
  radiusMeters: number;

  timezone: string;
};

type LocationEditorProps = {
  initialValue?: Partial<LocationEditorValue>;
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (value: LocationEditorValue) => void | Promise<void>;
};

type PositionState = "idle" | "loading" | "success" | "error";

const DEFAULT_RADIUS_METERS = 100;

export default function LocationEditor({
  initialValue,
  isSaving = false,
  onCancel,
  onSave,
}: LocationEditorProps) {
  const [name, setName] = useState(initialValue?.name ?? "");

  const [address, setAddress] = useState(
    initialValue?.address ?? ""
  );

  const [street, setStreet] = useState(
    initialValue?.street ?? ""
  );

  const [houseNumber, setHouseNumber] = useState(
    initialValue?.houseNumber ?? ""
  );

  const [postalCode, setPostalCode] = useState(
    initialValue?.postalCode ?? ""
  );

  const [city, setCity] = useState(initialValue?.city ?? "");

  const [country, setCountry] = useState(
    initialValue?.country ?? ""
  );

  const [countryCode, setCountryCode] = useState(
    initialValue?.countryCode ?? ""
  );

  const [mapboxFeatureId, setMapboxFeatureId] = useState(
    initialValue?.mapboxFeatureId ?? ""
  );

  const [latitude, setLatitude] = useState<number | null>(
    typeof initialValue?.latitude === "number"
      ? initialValue.latitude
      : null
  );

  const [longitude, setLongitude] = useState<number | null>(
    typeof initialValue?.longitude === "number"
      ? initialValue.longitude
      : null
  );

  const [radiusMeters, setRadiusMeters] = useState(
    initialValue?.radiusMeters ?? DEFAULT_RADIUS_METERS
  );

  const [timezone] = useState(
    initialValue?.timezone ?? "Europe/Berlin"
  );

  const [positionState, setPositionState] =
    useState<PositionState>("idle");

  const [positionAccuracy, setPositionAccuracy] = useState<
    number | null
  >(null);

  const [validationMessage, setValidationMessage] =
    useState("");

  const hasPosition =
    typeof latitude === "number" &&
    typeof longitude === "number";

  function handleAddressSelect(result: AddressSearchResult) {
    setAddress(result.displayName);
    setStreet(result.street);
    setHouseNumber(result.houseNumber);
    setPostalCode(result.postalCode);
    setCity(result.city);
    setCountry(result.country);
    setCountryCode(result.countryCode);
    setMapboxFeatureId(result.featureId);

    setLatitude(result.latitude);
    setLongitude(result.longitude);

    setPositionAccuracy(null);
    setPositionState("success");
    setValidationMessage("");

    if (!name.trim()) {
      const suggestedName =
        result.city && result.street
          ? `${result.street}${
              result.houseNumber
                ? ` ${result.houseNumber}`
                : ""
            }`
          : result.name || result.city || "Betriebsstandort";

      setName(suggestedName);
    }
  }

  function handleMapPositionChange(position: {
    latitude: number;
    longitude: number;
  }) {
    setLatitude(position.latitude);
    setLongitude(position.longitude);

    /*
     * Die Adresse bleibt als postalische Information erhalten.
     * Die GPS-Prüfung verwendet aber die manuell korrigierte
     * Markerposition.
     */
    setValidationMessage("");
  }

  function useCurrentPosition() {
    if (!navigator.geolocation) {
      setPositionState("error");
      setValidationMessage(
        "Dein Browser unterstützt die Standortbestimmung nicht."
      );
      return;
    }

    setPositionState("loading");
    setValidationMessage("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {
          latitude: currentLatitude,
          longitude: currentLongitude,
          accuracy,
        } = position.coords;

        setLatitude(currentLatitude);
        setLongitude(currentLongitude);
        setPositionAccuracy(Math.round(accuracy));
        setPositionState("success");

        /*
         * Eine GPS-Position besitzt zunächst keine postalische
         * Adresse. Die Koordinaten können trotzdem gespeichert
         * werden.
         */
        setMapboxFeatureId("");
      },
      (error) => {
        console.error("LOCATION EDITOR GEOLOCATION ERROR:", error);

        setPositionState("error");

        if (error.code === error.PERMISSION_DENIED) {
          setValidationMessage(
            "Der Standortzugriff wurde abgelehnt. Bitte erlaube ihn in den Browser-Einstellungen."
          );
          return;
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          setValidationMessage(
            "Deine aktuelle Position ist momentan nicht verfügbar."
          );
          return;
        }

        if (error.code === error.TIMEOUT) {
          setValidationMessage(
            "Die Standortermittlung hat zu lange gedauert. Bitte versuche es erneut."
          );
          return;
        }

        setValidationMessage(
          "Die aktuelle Position konnte nicht ermittelt werden."
        );
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000,
      }
    );
  }

  async function handleSave() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setValidationMessage(
        "Bitte gib einen Namen für den Betriebsstandort ein."
      );
      return;
    }

    if (!hasPosition) {
      setValidationMessage(
        "Bitte suche eine Adresse oder übernimm deine aktuelle Position."
      );
      return;
    }

    if (
      !Number.isInteger(radiusMeters) ||
      radiusMeters < 20 ||
      radiusMeters > 1000
    ) {
      setValidationMessage(
        "Der Radius muss zwischen 20 und 1000 Metern liegen."
      );
      return;
    }

    setValidationMessage("");

    await onSave({
      name: trimmedName,

      address: address.trim(),
      street: street.trim(),
      houseNumber: houseNumber.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
      country: country.trim(),
      countryCode: countryCode.trim(),

      mapboxFeatureId: mapboxFeatureId.trim(),

      latitude,
      longitude,
      radiusMeters,

      timezone,
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#005CA8]" />

          <div>
            <p className="text-sm font-semibold text-[#0F172A]">
              Standort für die Zeiterfassung
            </p>

            <p className="mt-1 text-sm leading-6 text-[#64748B]">
              Mitarbeiter können später innerhalb des festgelegten
              Radius stempeln. Individuelle GPS-Ausnahmen werden
              separat pro Mitarbeiter eingerichtet.
            </p>
          </div>
        </div>
      </div>

      <Input
        label="Standortname"
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setValidationMessage("");
        }}
        placeholder="z. B. Büro Stuttgart"
        disabled={isSaving}
      />

      <AddressSearch
        initialQuery={address}
        disabled={isSaving}
        onSelect={handleAddressSelect}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          loading={positionState === "loading"}
          disabled={isSaving}
          onClick={useCurrentPosition}
        >
          <Navigation className="h-4 w-4" />
          Aktuelle Position übernehmen
        </Button>

        {positionAccuracy !== null && (
          <p className="text-xs text-[#64748B]">
            GPS-Genauigkeit: ungefähr {positionAccuracy} Meter
          </p>
        )}
      </div>

      {hasPosition ? (
        <>
          <BusinessLocationMap
            latitude={latitude}
            longitude={longitude}
            radiusMeters={radiusMeters}
            disabled={isSaving}
            onPositionChange={handleMapPositionChange}
          />

          <div className="rounded-3xl border border-[#E2E8F0] bg-white p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-[#005CA8]" />

                  <p className="text-sm font-semibold text-[#0F172A]">
                    Erlaubter Stempelbereich
                  </p>
                </div>

                <p className="mt-1 text-sm leading-6 text-[#64748B]">
                  Passe den Radius an die Größe und die GPS-Situation
                  des Betriebs an.
                </p>
              </div>

              <div className="rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#005CA8]">
                {radiusMeters} Meter
              </div>
            </div>

            <input
              type="range"
              min="20"
              max="1000"
              step="10"
              value={radiusMeters}
              disabled={isSaving}
              onChange={(event) => {
                setRadiusMeters(Number(event.target.value));
                setValidationMessage("");
              }}
              className="mt-5 w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Radius des Betriebsstandorts"
            />

            <div className="mt-2 flex justify-between text-xs text-[#94A3B8]">
              <span>20 m</span>
              <span>1.000 m</span>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#005CA8]" />

              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0F172A]">
                  Ausgewählter Standort
                </p>

                {address ? (
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">
                    {address}
                  </p>
                ) : (
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">
                    Position wurde über GPS oder direkt auf der Karte
                    festgelegt.
                  </p>
                )}

                <p className="mt-2 break-all text-xs text-[#94A3B8]">
                  {latitude.toFixed(7)}, {longitude.toFixed(7)}
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-6 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#005CA8]">
            <MapPin className="h-5 w-5" />
          </div>

          <p className="mt-4 text-base font-semibold text-[#0F172A]">
            Noch keine Position ausgewählt
          </p>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748B]">
            Suche zuerst nach einer Adresse oder übernimm die aktuelle
            Position. Erst danach wird die Karte geladen.
          </p>
        </div>
      )}

      {validationMessage && (
        <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3">
          <p className="text-sm leading-6 text-[#B91C1C]">
            {validationMessage}
          </p>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-[#E2E8F0] pt-5 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={isSaving}
          onClick={onCancel}
        >
          Abbrechen
        </Button>

        <Button
          type="button"
          loading={isSaving}
          onClick={handleSave}
        >
          Standort speichern
        </Button>
      </div>
    </div>
  );
}
import { NextRequest, NextResponse } from "next/server";

const MAPBOX_FORWARD_URL =
  "https://api.mapbox.com/search/geocode/v6/forward";

type MapboxContextItem = {
  mapbox_id?: string;
  name?: string;
  text?: string;
  short_code?: string;
};

type MapboxFeature = {
  id?: string;

  geometry?: {
    type?: string;
    coordinates?: [number, number];
  };

  properties?: {
    mapbox_id?: string;
    feature_type?: string;
    name?: string;
    name_preferred?: string;
    full_address?: string;
    place_formatted?: string;

    coordinates?: {
      longitude?: number;
      latitude?: number;
      accuracy?: string;
    };

    context?: {
      address?: MapboxContextItem & {
        address_number?: string;
        street_name?: string;
      };

      street?: MapboxContextItem;
      postcode?: MapboxContextItem;
      place?: MapboxContextItem;
      locality?: MapboxContextItem;
      region?: MapboxContextItem;
      country?: MapboxContextItem;
    };
  };
};

type MapboxResponse = {
  features?: MapboxFeature[];
};

function getCoordinates(feature: MapboxFeature) {
  const longitude =
    feature.properties?.coordinates?.longitude ??
    feature.geometry?.coordinates?.[0];

  const latitude =
    feature.properties?.coordinates?.latitude ??
    feature.geometry?.coordinates?.[1];

  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 3) {
    return NextResponse.json(
      {
        error: "Bitte gib mindestens drei Zeichen ein.",
      },
      {
        status: 400,
      }
    );
  }

  if (query.length > 256) {
    return NextResponse.json(
      {
        error: "Der Suchbegriff ist zu lang.",
      },
      {
        status: 400,
      }
    );
  }

  const accessToken =
    process.env.MAPBOX_GEOCODING_ACCESS_TOKEN;

  if (!accessToken) {
    console.error(
      "MAPBOX_GEOCODING_ACCESS_TOKEN ist nicht gesetzt."
    );

    return NextResponse.json(
      {
        error: "Die Adresssuche ist nicht konfiguriert.",
      },
      {
        status: 500,
      }
    );
  }

  const url = new URL(MAPBOX_FORWARD_URL);

  url.searchParams.set("q", query);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("permanent", "true");
  url.searchParams.set("autocomplete", "false");
  url.searchParams.set("limit", "5");
  url.searchParams.set("language", "de");
  url.searchParams.set("types", "address,street,place");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "MAPBOX GEOCODING ERROR:",
        response.status,
        responseText
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        return NextResponse.json(
          {
            error:
              "Der Mapbox-Zugang ist nicht korrekt konfiguriert.",
          },
          {
            status: 502,
          }
        );
      }

      if (response.status === 429) {
        return NextResponse.json(
          {
            error:
              "Die Adresssuche wurde zu häufig aufgerufen. Bitte warte kurz.",
          },
          {
            status: 429,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "Der Adressdienst ist momentan nicht erreichbar.",
        },
        {
          status: 502,
        }
      );
    }

    const payload = JSON.parse(
      responseText
    ) as MapboxResponse;

    const results = (payload.features ?? []).flatMap(
      (feature) => {
        const coordinates = getCoordinates(feature);

        if (!coordinates) return [];

        const properties = feature.properties;
        const context = properties?.context;

        const street =
          context?.address?.street_name ??
          context?.street?.name ??
          context?.street?.text ??
          "";

        const houseNumber =
          context?.address?.address_number ?? "";

        const postalCode =
          context?.postcode?.name ??
          context?.postcode?.text ??
          "";

        const city =
          context?.place?.name ??
          context?.place?.text ??
          context?.locality?.name ??
          context?.locality?.text ??
          "";

        const country =
          context?.country?.name ??
          context?.country?.text ??
          "";

        const countryCode =
          context?.country?.short_code
            ?.replace(/^country\./, "")
            .toUpperCase() ?? "";

        const displayName =
          properties?.full_address ??
          [
            properties?.name_preferred ??
              properties?.name,
            properties?.place_formatted,
          ]
            .filter(Boolean)
            .join(", ");

        if (!displayName) return [];

        return [
          {
            featureId:
              properties?.mapbox_id ??
              feature.id ??
              "",

            featureType:
              properties?.feature_type ?? "",

            name:
              properties?.name_preferred ??
              properties?.name ??
              "",

            displayName,

            street,
            houseNumber,
            postalCode,
            city,
            country,
            countryCode,

            latitude: coordinates.latitude,
            longitude: coordinates.longitude,

            accuracy:
              properties?.coordinates?.accuracy ?? null,
          },
        ];
      }
    );

    return NextResponse.json({
      results,
    });
  } catch (error) {
    console.error("GEOCODING ROUTE ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Bei der Adresssuche ist ein unerwarteter Fehler aufgetreten.",
      },
      {
        status: 500,
      }
    );
  }
}
"use client";

import { useEffect, useRef } from "react";
import mapboxgl, {
  GeoJSONSource,
  LngLatLike,
  Map as MapboxMap,
  Marker,
} from "mapbox-gl";
import type { Feature, Polygon } from "geojson";

type BusinessLocationMapProps = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  onPositionChange: (position: {
    latitude: number;
    longitude: number;
  }) => void;
  disabled?: boolean;
};

const RADIUS_SOURCE_ID = "business-location-radius-source";
const RADIUS_FILL_LAYER_ID = "business-location-radius-fill";
const RADIUS_LINE_LAYER_ID = "business-location-radius-line";

/**
 * Erstellt näherungsweise einen Kreis als GeoJSON-Polygon.
 * Die Berechnung ist für Radien im niedrigen Kilometerbereich ausreichend genau.
 */
function createRadiusCircle(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  points = 64
): Feature<Polygon> {
  const earthRadiusMeters = 6_371_000;
  const angularDistance = radiusMeters / earthRadiusMeters;
  const latitudeRadians = (latitude * Math.PI) / 180;
  const longitudeRadians = (longitude * Math.PI) / 180;

  const coordinates: [number, number][] = [];

  for (let index = 0; index <= points; index += 1) {
    const bearing = (index / points) * Math.PI * 2;

    const circleLatitude = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(angularDistance) +
        Math.cos(latitudeRadians) *
          Math.sin(angularDistance) *
          Math.cos(bearing)
    );

    const circleLongitude =
      longitudeRadians +
      Math.atan2(
        Math.sin(bearing) *
          Math.sin(angularDistance) *
          Math.cos(latitudeRadians),
        Math.cos(angularDistance) -
          Math.sin(latitudeRadians) * Math.sin(circleLatitude)
      );

    coordinates.push([
      (circleLongitude * 180) / Math.PI,
      (circleLatitude * 180) / Math.PI,
    ]);
  }

  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
}

export default function BusinessLocationMap({
  latitude,
  longitude,
  radiusMeters,
  onPositionChange,
  disabled = false,
}: BusinessLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  /*
   * Wir speichern den Callback in einem Ref.
   * Dadurch muss die Map nicht neu initialisiert werden,
   * nur weil die übergeordnete Komponente neu rendert.
   */
  const onPositionChangeRef = useRef(onPositionChange);

  useEffect(() => {
    onPositionChangeRef.current = onPositionChange;
  }, [onPositionChange]);

  /*
   * Map nur einmal initialisieren.
   */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const accessToken =
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    if (!accessToken) {
      console.error(
        "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ist nicht gesetzt."
      );
      return;
    }

    mapboxgl.accessToken = accessToken;

    const initialCenter: LngLatLike = [longitude, latitude];

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: initialCenter,
      zoom: 17,
      attributionControl: true,
    });

    mapRef.current = map;

    map.addControl(
      new mapboxgl.NavigationControl({
        showCompass: false,
        showZoom: true,
      }),
      "top-right"
    );

    const markerElement = document.createElement("div");

    markerElement.className =
      "h-8 w-8 rounded-full border-4 border-white bg-[#005CA8] shadow-[0_6px_18px_rgba(15,23,42,0.35)]";

    const marker = new mapboxgl.Marker({
      element: markerElement,
      draggable: !disabled,
      anchor: "center",
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    markerRef.current = marker;

    marker.on("dragend", () => {
      if (disabled) return;

      const markerPosition = marker.getLngLat();

      onPositionChangeRef.current({
        latitude: markerPosition.lat,
        longitude: markerPosition.lng,
      });
    });

    map.on("click", (event) => {
      if (disabled) return;

      marker.setLngLat(event.lngLat);

      onPositionChangeRef.current({
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      });
    });

    map.on("load", () => {
      map.addSource(RADIUS_SOURCE_ID, {
        type: "geojson",
        data: createRadiusCircle(
          latitude,
          longitude,
          radiusMeters
        ),
      });

      map.addLayer({
        id: RADIUS_FILL_LAYER_ID,
        type: "fill",
        source: RADIUS_SOURCE_ID,
        paint: {
          "fill-color": "#005CA8",
          "fill-opacity": 0.14,
        },
      });

      map.addLayer({
        id: RADIUS_LINE_LAYER_ID,
        type: "line",
        source: RADIUS_SOURCE_ID,
        paint: {
          "line-color": "#005CA8",
          "line-width": 2,
          "line-opacity": 0.8,
        },
      });
    });

    /*
     * Hilft besonders, wenn die Karte in einem Dialog oder
     * auf einer zuvor ausgeblendeten Fläche angezeigt wird.
     */
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      marker.remove();
      map.remove();

      markerRef.current = null;
      mapRef.current = null;
    };
  }, []);

  /*
   * Marker und Kartenposition aktualisieren,
   * wenn außen neue Koordinaten gesetzt werden,
   * beispielsweise nach einer Adresssuche.
   */
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;

    if (!map || !marker) return;

    const currentPosition = marker.getLngLat();

    const positionChanged =
      Math.abs(currentPosition.lat - latitude) > 0.0000001 ||
      Math.abs(currentPosition.lng - longitude) > 0.0000001;

    if (positionChanged) {
      marker.setLngLat([longitude, latitude]);

      map.easeTo({
        center: [longitude, latitude],
        zoom: Math.max(map.getZoom(), 16),
        duration: 700,
      });
    }
  }, [latitude, longitude]);

  /*
   * Radius-Kreis aktualisieren.
   */
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource(
      RADIUS_SOURCE_ID
    ) as GeoJSONSource | undefined;

    source?.setData(
      createRadiusCircle(
        latitude,
        longitude,
        radiusMeters
      )
    );
  }, [latitude, longitude, radiusMeters]);

  /*
   * Dragging nachträglich aktivieren oder deaktivieren.
   */
  useEffect(() => {
    const marker = markerRef.current;

    if (!marker) return;

    marker.setDraggable(!disabled);
  }, [disabled]);

  return (
    <div className="overflow-hidden rounded-3xl border border-[#E2E8F0] bg-[#F8FAFC] shadow-sm">
      <div
        ref={mapContainerRef}
        className="h-[360px] w-full md:h-[440px]"
      />

      <div className="flex flex-col gap-1 border-t border-[#E2E8F0] bg-white px-4 py-3">
        <p className="text-sm font-semibold text-[#0F172A]">
          Position des Betriebs
        </p>

        <p className="text-xs leading-5 text-[#64748B]">
          Verschiebe den Marker oder klicke auf die Karte, um den
          Mittelpunkt des erlaubten Bereichs festzulegen.
        </p>
      </div>
    </div>
  );
}
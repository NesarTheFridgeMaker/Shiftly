/**
 * Mittlerer Erdradius in Metern.
 */
const EARTH_RADIUS = 6_371_000;

/**
 * Wandelt Grad in Radiant um.
 */
function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Berechnet die Luftlinienentfernung zwischen zwei GPS-Koordinaten
 * mittels der Haversine-Formel.
 *
 * Rückgabe:
 * Entfernung in Metern.
 */
export function calculateDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {
  const φ1 = toRadians(latitude1);
  const φ2 = toRadians(latitude2);

  const Δφ = toRadians(latitude2 - latitude1);
  const Δλ = toRadians(longitude2 - longitude1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) *
      Math.cos(φ2) *
      Math.sin(Δλ / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return EARTH_RADIUS * c;
}

/**
 * Prüft, ob sich eine Position innerhalb eines Radius befindet.
 */
export function isInsideRadius(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
  radiusMeters: number
): boolean {
  return (
    calculateDistanceMeters(
      latitude1,
      longitude1,
      latitude2,
      longitude2
    ) <= radiusMeters
  );
}
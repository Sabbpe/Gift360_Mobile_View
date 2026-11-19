// src/utils/geolocation.ts

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ReverseGeocodeResult {
  city: string;
  state: string;
  country: string;
  displayName: string;
  /** PIN code when OpenStreetMap knows it; may be empty. */
  postcode?: string;
}

export interface DevicePosition {
  lat: number;
  lng: number;
  accuracy: number;
  /** epoch ms when the device produced this fix */
  timestamp: number;
}

export type PositionErrorCode = "UNSUPPORTED" | "DENIED" | "UNAVAILABLE" | "TIMEOUT";

/**
 * Fresh device position for checkout (never a cached fix).
 * Resolves with the position or an error code; never throws.
 */
export const getDevicePosition = (): Promise<
  { ok: true; position: DevicePosition } | { ok: false; error: PositionErrorCode }
> => {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, error: "UNSUPPORTED" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          ok: true,
          position: {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy,
            timestamp: p.timestamp || Date.now(),
          },
        }),
      (e) =>
        resolve({
          ok: false,
          error: e.code === 1 ? "DENIED" : e.code === 3 ? "TIMEOUT" : "UNAVAILABLE",
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
};

/**
 * Get user's current latitude and longitude
 * @returns Promise with coordinates or null if failed
 */
export const getUserLocation = (): Promise<Coordinates | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Geolocation error:", error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Reverse geocode coordinates to get address using Nominatim (OpenStreetMap)
 */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Gift360App/1.0",
        },
      }
    );
    const data = await res.json();

    if (!data || data.error) return null;

    const address = data.address || {};
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.county ||
      address.state_district ||
      "";
    const state = address.state || "";
    const country = address.country || "";

    return {
      city,
      state,
      country,
      displayName: data.display_name || `${city}, ${state}, ${country}`,
      postcode: typeof address.postcode === "string" ? address.postcode.replace(/\s/g, "") : "",
    };
  } catch (err) {
    console.error("Reverse geocode failed:", err);
    return null;
  }
};

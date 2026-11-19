// src/lib/deviceId.ts
// A random per-install id, used only for send limits and fraud evidence.
// Not a fingerprint: it holds nothing about the device and resets if storage is cleared.
const KEY = "g360DeviceId";

const randomId = (): string => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
};

export const getDeviceId = (): string => {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;
    const id = randomId();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return randomId();
  }
};

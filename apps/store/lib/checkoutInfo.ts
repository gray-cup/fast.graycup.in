export interface SavedCheckoutInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  email: string;
}

const STORAGE_KEY = "graycup_checkout_info";

export function loadSavedCheckoutInfo(): SavedCheckoutInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCheckoutInfo(info: SavedCheckoutInfo): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {
    // localStorage unavailable (private browsing etc.) — safe to ignore
  }
}

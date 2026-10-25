import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";
import { API_URL } from "./config";

export type Track = { id: string; title: string; position: number; available: boolean };
export type LibAlbum = { album_id: string; order_id: string; title: string; cover_url: string | null; release_date: string | null; released: boolean; tracks: Track[] };
export type DeviceInfo = { id: string; name: string; current: boolean; last_seen_at: string };
export type DeviceOrder = { order_id: string; title: string; access_code: string; max: number; devices: DeviceInfo[] };
export type EventItem = {
  id: string; title: string; description: string | null; venue: string; city: string; starts_at: string;
  poster_url: string | null; ticket_price: number | null; currency: string; tickets_enabled: boolean; slug?: string | null;
};
export type AppSettings = {
  welcome_video_url: string | null; welcome_image_url: string | null; welcome_title: string | null;
  welcome_text: string | null; welcome_button: string | null;
  home_media_type: "none" | "photo" | "video"; home_media_url: string | null; home_title: string | null;
  home_text: string | null; home_button_label: string | null;
  home_button_target: "none" | "music" | "agenda" | "news" | "url"; home_button_url: string | null;
};
export type Article = {
  id: string; title: string; slug: string; excerpt: string | null; cover_url: string | null;
  published_at: string; featured: boolean; is_album?: boolean; album_slug?: string | null;
};

export const ssGet = (k: string) => SecureStore.getItemAsync(k).catch(() => null);
export const ssSet = (k: string, v: string) => SecureStore.setItemAsync(k, v).catch(() => {});
export const ssDel = (k: string) => SecureStore.deleteItemAsync(k).catch(() => {});

let tokenCache: string | null | undefined;
export async function getToken() {
  if (tokenCache === undefined) tokenCache = await ssGet("token");
  return tokenCache;
}
export async function setToken(t: string | null) {
  tokenCache = t;
  if (t) await ssSet("token", t);
  else await ssDel("token");
}

async function deviceId() {
  let id = await ssGet("device_id");
  if (!id) {
    id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    await ssSet("device_id", id);
  }
  return id;
}

export class AuthError extends Error {}

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) {
    const t = await getToken();
    if (t) headers.authorization = `Bearer ${t}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers as object) } });
  } catch {
    throw new Error("Pas de connexion. Vérifiez votre réseau.");
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) {
    await setToken(null);
    throw new AuthError(body.error ?? "Session expirée.");
  }
  if (!res.ok || body.ok === false) throw new Error(body.error ?? "Une erreur est survenue.");
  return body as T;
}

export async function redeem(code: string) {
  const r = await call<{ token: string }>(
    "/api/app/redeem",
    { method: "POST", body: JSON.stringify({ code, device_id: await deviceId(), device_name: Device.modelName ?? Device.deviceName ?? "Appareil" }) },
    false,
  );
  await setToken(r.token);
}
export const fetchLibrary = () => call<{ albums: LibAlbum[] }>("/api/app/library").then((r) => r.albums);
export const fetchDevices = () => call<{ orders: DeviceOrder[] }>("/api/app/devices").then((r) => r.orders);
export const removeDevice = (device: string) => call("/api/app/device-remove", { method: "POST", body: JSON.stringify({ device }) });
export const fetchContent = () => call<{ events: EventItem[]; articles: Article[]; settings: AppSettings | null }>("/api/app/content", {}, false);
export const trackSource = async (trackId: string) => ({
  uri: `${API_URL}/api/app/track/${trackId}`,
  headers: { authorization: `Bearer ${await getToken()}` },
});

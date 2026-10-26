import * as SecureStore from "expo-secure-store";
import * as Device from "expo-device";
import { API_URL } from "./config";

export type Track = { id: string; title: string; position: number; available: boolean };
export type LibAlbum = { album_id: string; order_id: string; kind?: "album" | "single"; title: string; cover_url: string | null; release_date: string | null; released: boolean; tracks: Track[] };
export type DeviceInfo = { id: string; name: string; current: boolean; last_seen_at: string };
export type DeviceOrder = { order_id: string; title: string; access_code: string; max: number; devices: DeviceInfo[] };
export type EventItem = {
  id: string; title: string; description: string | null; venue: string; city: string; starts_at: string;
  poster_url: string | null; ticket_price: number | null; currency: string; tickets_enabled: boolean; slug?: string | null;
  ticket_url?: string | null; online_purchase_enabled?: boolean;
};
export type AppSettings = {
  welcome_video_url: string | null; welcome_image_url: string | null; welcome_title: string | null;
  welcome_text: string | null; welcome_button: string | null;
  home_media_type: "none" | "photo" | "video"; home_media_url: string | null; home_title: string | null;
  home_text: string | null; home_button_label: string | null;
  home_button_target: "none" | "music" | "agenda" | "news" | "url"; home_button_url: string | null;
};
export type MediaItem = { type: "photo" | "video"; url: string };
export type Article = {
  id: string; title: string; slug: string; excerpt: string | null; content?: string | null; cover_url: string | null;
  media?: MediaItem[]; youtube_urls?: string[]; is_upcoming_event?: boolean; ticket_url?: string | null; organizer_contact?: string | null;
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
export const fetchLibrary = () => call<{ albums: LibAlbum[] }>("/api/app/library").then((r) => r.albums.map((a) => ({ ...a, cover_url: absUrl(a.cover_url) })));
export const fetchDevices = () => call<{ orders: DeviceOrder[] }>("/api/app/devices").then((r) => r.orders);
export const removeDevice = (device: string) => call("/api/app/device-remove", { method: "POST", body: JSON.stringify({ device }) });
/** Les fichiers téléversés ont une adresse relative (/api/public/media/…) : on la rend absolue. */
export const absUrl = <T extends string | null | undefined>(u: T): T =>
  (typeof u === "string" && u.startsWith("/") && !u.startsWith("//") ? `${API_URL}${u}` : u) as T;

export async function fetchContent() {
  const r = await call<{ events: EventItem[]; articles: Article[]; settings: AppSettings | null }>("/api/app/content", {}, false);
  const st = r.settings;
  return {
    events: (r.events ?? []).map((e) => ({ ...e, poster_url: absUrl(e.poster_url) })),
    articles: (r.articles ?? []).map((a) => ({
      ...a,
      cover_url: absUrl(a.cover_url),
      media: (a.media ?? []).map((m) => ({ ...m, url: absUrl(m.url) })),
      youtube_urls: a.youtube_urls ?? [],
    })),
    settings: st ? { ...st, welcome_video_url: absUrl(st.welcome_video_url), welcome_image_url: absUrl(st.welcome_image_url), home_media_url: absUrl(st.home_media_url) } : null,
  };
}

export type PayMethod = "orange_money" | "wave" | "card";
export type SaleType = { id: string; name: string; price: number; capacity: number | null; remaining: number | null };
export type EventSale = {
  simulation: boolean; sellable: boolean; types: SaleType[];
  event: { id: string; title: string; description: string | null; venue: string; city: string; country: string | null; starts_at: string; poster_url: string | null; currency: string };
};
export type AlbumSale = {
  simulation: boolean; released: boolean;
  item: { id: string; title: string; description: string | null; poster_url: string | null; starts_at: string; currency: string; slug?: string | null };
  album: { id: string; cover_url: string | null; presentation?: string | null; listen_url: string | null; digital_enabled: boolean; price_digital: number; physical_enabled: boolean; price_physical: number | null; physical_left: number | null };
  tracks: { id: string; position: number; title: string; preview_url?: string | null }[];
};
export type Placed = { orderId: string; next: "delivery" | "simulation" | "redirect"; url?: string; k?: string | null };

export const fetchEventSale = async (id: string): Promise<EventSale> => {
  const r = await call<EventSale>(`/api/app/event/${encodeURIComponent(id)}`, {}, false);
  return { ...r, event: { ...r.event, poster_url: absUrl(r.event.poster_url) } };
};
export const placeTicketOrder = (b: { eventId: string; items: { ticketTypeId: string; quantity: number }[]; name: string; email: string; phone?: string; paymentMethod: PayMethod }) =>
  call<Placed>("/api/app/ticket-order", { method: "POST", body: JSON.stringify(b) }, false);
export const ticketStatus = (id: string) =>
  call<{ status: string; email: string; total: number; currency: string; tickets: { code: string; type_name: string; seat_index?: number }[]; event: { title: string; venue: string; city: string; starts_at: string } }>(`/api/app/ticket-order/${id}`, {}, false);
export const simulateTicket = (orderId: string, method: PayMethod, outcome: "success" | "failure") =>
  call<{ paid: boolean }>("/api/app/ticket-simulate", { method: "POST", body: JSON.stringify({ orderId, method, outcome }) }, false);

export const fetchAlbumSale = async (id: string): Promise<AlbumSale> => {
  const r = await call<AlbumSale>(`/api/app/album/${encodeURIComponent(id)}`, {}, false);
  return {
    ...r,
    item: { ...r.item, poster_url: absUrl(r.item.poster_url) },
    album: { ...r.album, cover_url: absUrl(r.album.cover_url) },
    tracks: r.tracks.map((t) => ({ ...t, preview_url: absUrl(t.preview_url) })),
  };
};
export const placeAlbumOrder = (b: { articleId: string; mode: "digital" | "delivery"; quantity: number; name: string; email: string; phone?: string; paymentMethod?: PayMethod; address?: string; city?: string }) =>
  call<Placed>("/api/app/album-order", { method: "POST", body: JSON.stringify(b) }, false);
export const albumStatus = (id: string, k: string) =>
  call<{ status: string; mode: string; email: string; title: string; accessCode: string | null }>(`/api/app/album-order/${id}?k=${encodeURIComponent(k)}`, {}, false);
export const simulateAlbum = (orderId: string, k: string, method: PayMethod, outcome: "success" | "failure") =>
  call<{ paid: boolean }>("/api/app/album-simulate", { method: "POST", body: JSON.stringify({ orderId, k, method, outcome }) }, false);
export const trackSource = async (trackId: string) => ({
  uri: `${API_URL}/api/app/track/${trackId}`,
  headers: { authorization: `Bearer ${await getToken()}` },
});

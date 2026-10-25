import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { fetchContent, type Article, type EventItem, type AppSettings } from "./api";

type C = { events: EventItem[]; articles: Article[]; settings: AppSettings | null } | null;
type Ctx = { data: C; err: string | null; busy: boolean; load: () => Promise<void> };
const Content = createContext<Ctx>({ data: null, err: null, busy: false, load: async () => {} });
export const useContent = () => useContext(Content);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<C>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true); setErr(null);
    try { setData(await fetchContent()); } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <Content.Provider value={{ data, err, busy, load }}>{children}</Content.Provider>;
}

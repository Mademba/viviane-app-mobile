import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

export type Palette = {
  bg: string; card: string; bar: string; text: string; soft: string; muted: string;
  line: string; rose: string; gold: string; onRose: string; pink: string; dark: boolean;
};

export const dark: Palette = {
  bg: "#190104", card: "#260409", bar: "#100002", text: "#fff0ef", soft: "rgba(255,240,239,.85)",
  muted: "rgba(255,240,239,.62)", line: "rgba(255,240,239,.12)", rose: "#dd4677", gold: "#e3ad4b",
  onRose: "#ffffff", pink: "#f499a7", dark: true,
};
export const light: Palette = {
  bg: "#fbf4ef", card: "#ffffff", bar: "#ffffff", text: "#361116", soft: "rgba(54,17,22,.86)",
  muted: "rgba(54,17,22,.68)", line: "rgba(54,17,22,.12)", rose: "#c42c63", gold: "#8a5d0b",
  onRose: "#ffffff", pink: "#c42c63", dark: false,
};

export const serif = "CormorantGaramond_700Bold";
export const sans = "Inter_400Regular";
export const sansBold = "Inter_600SemiBold";

const Ctx = createContext<{ c: Palette; toggle: () => void }>({ c: light, toggle: () => {} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setDark] = useState(false);  // thème clair par défaut ; le choix du fan est conservé
  useEffect(() => {
    SecureStore.getItemAsync("theme").then((v) => v && setDark(v !== "light")).catch(() => {});
  }, []);
  const toggle = () =>
    setDark((d) => {
      SecureStore.setItemAsync("theme", d ? "light" : "dark").catch(() => {});
      return !d;
    });
  return <Ctx.Provider value={{ c: isDark ? dark : light, toggle }}>{children}</Ctx.Provider>;
}

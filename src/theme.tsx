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
  bg: "#fff6f4", card: "#ffffff", bar: "#ffffff", text: "#2a0710", soft: "rgba(42,7,16,.85)",
  muted: "rgba(42,7,16,.62)", line: "rgba(42,7,16,.12)", rose: "#c42b5e", gold: "#9a6a12",
  onRose: "#ffffff", pink: "#c42b5e", dark: false,
};

export const serif = "CormorantGaramond_700Bold";
export const sans = "Inter_400Regular";
export const sansBold = "Inter_600SemiBold";

const Ctx = createContext<{ c: Palette; toggle: () => void }>({ c: dark, toggle: () => {} });
export const useTheme = () => useContext(Ctx);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setDark] = useState(true);
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

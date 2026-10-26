import { createNavigationContainerRef } from "@react-navigation/native";

// Navigation globale (écrans empilés au-dessus des onglets).
export const nav = createNavigationContainerRef<Record<string, object | undefined>>();
export const go = (name: string, params?: object) => {
  if (nav.isReady()) (nav as unknown as { navigate: (n: string, p?: object) => void }).navigate(name, params);
};
export const goTab = (tab: string) => go("Tabs", { screen: tab });

// Ouvre le lecteur plein écran (défini par l'écran principal).
export const ui = { openPlayer: () => {} };

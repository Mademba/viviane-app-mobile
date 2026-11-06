import { useEffect } from "react";
import { AppState } from "react-native";
import { allowScreenCaptureAsync, preventScreenCaptureAsync } from "expo-screen-capture";

/**
 * Bloque les captures d'écran et enregistrements tant que l'écran est affiché (Android : FLAG_SECURE).
 * Contrairement au hook d'Expo, le blocage est ré-appliqué à chaque retour au premier plan : si Android
 * recrée la fenêtre de l'application (rotation, thème, mise en veille), le drapeau serait sinon perdu
 * alors que la bibliothèque croit toujours le blocage actif.
 */
export function useSecureScreen(key: string) {
  useEffect(() => {
    let n = 0;
    const apply = () => {
      const k = `${key}:refresh:${++n}`;
      preventScreenCaptureAsync(k).then(() => allowScreenCaptureAsync(k)).catch(() => {});
    };
    preventScreenCaptureAsync(key).catch(() => {});
    const sub = AppState.addEventListener("change", (s) => { if (s === "active") apply(); });
    // Ré-application peu après l'affichage : couvre une fenêtre recréée juste après le montage
    const t = setTimeout(apply, 800);
    return () => { clearTimeout(t); sub.remove(); void allowScreenCaptureAsync(key); };
  }, [key]);
}

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { getToken, pushEligible, registerPushToken } from "./api";

// Alertes de la veille pour l'équipe : l'autorisation de notifier n'est demandée que si l'e-mail du compte
// figure parmi les destinataires choisis dans l'administration (Veille > Mots-clés & alertes).
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const projectId = (): string | undefined => {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
};

async function allowed(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** À appeler à l'ouverture de l'application et après une connexion : sans effet pour les fans ordinaires. */
export async function registerTeamPush(): Promise<void> {
  try {
    if (!Device.isDevice || !(await getToken()) || !(await pushEligible())) return;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("veille", { name: "Veille — mentions", importance: Notifications.AndroidImportance.HIGH });
    }
    if (!(await allowed())) return;
    const id = projectId();
    const tok = await Notifications.getExpoPushTokenAsync(id ? { projectId: id } : undefined);
    await registerPushToken(tok.data, Platform.OS);
  } catch {
    /* hors ligne, autorisation refusée ou projet non configuré : on réessaiera à la prochaine ouverture */
  }
}

/** Ouvre le lien de la mention quand on touche la notification. */
export function listenPushTaps(): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const url = (r.notification.request.content.data as { url?: string | null } | undefined)?.url;
    if (typeof url === "string" && /^https?:\/\//i.test(url)) void WebBrowser.openBrowserAsync(url).catch(() => {});
  });
  return () => sub.remove();
}

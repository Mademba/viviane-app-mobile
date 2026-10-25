import { PayLogo } from "../ui";
import QrCode from "../QrCode";
import { withBrowser } from "../session";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { albumStatus, redeem, simulateAlbum, simulateTicket, ticketStatus, type PayMethod, type Placed } from "../api";
import { goTab } from "../nav";
import { Banner, Body, Button, openLink } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

type Kind = "ticket" | "album";
type State = { status: string; email?: string; accessCode?: string | null; tickets?: { code: string; type_name: string }[]; event?: { title: string; venue: string; city: string; starts_at: string }; title?: string };

/** Après la commande : ouvre la page de paiement PayDunya, surveille le paiement, puis confirme dans l'application. */
export default function PayFlow({ kind, placed, method, mode, onRetry }: { kind: Kind; placed: Placed; method: PayMethod; mode?: "digital" | "delivery"; onRetry: () => void }) {
  const { c } = useTheme();
  const [st, setSt] = useState<State>({ status: placed.next === "delivery" ? "delivery" : "pending" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<boolean | null>(null);
  const opened = useRef(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = useCallback(async () => {
    try {
      const s = kind === "ticket" ? await ticketStatus(placed.orderId) : await albumStatus(placed.orderId, placed.k ?? "");
      setSt(s as State);
      setErr(null);
      return (s as State).status;
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); return "pending"; }
  }, [kind, placed.orderId, placed.k]);

  const startPolling = useCallback(() => {
    if (poll.current) clearInterval(poll.current);
    let n = 0;
    poll.current = setInterval(async () => {
      n += 1;
      const s = await check();
      if (s === "paid" || s === "failed" || s === "cancelled" || n > 60) { if (poll.current) clearInterval(poll.current); }
    }, 3000);
  }, [check]);

  const openPay = useCallback(async () => {
    if (!placed.url) return;
    startPolling();
    try { await withBrowser(() => WebBrowser.openBrowserAsync(placed.url ?? "", { toolbarColor: "#190104", controlsColor: "#e3ad4b" })); } catch { /* fermé */ }
    void check();
  }, [placed.url, startPolling, check]);

  useEffect(() => {
    if (placed.next === "redirect" && !opened.current) { opened.current = true; void openPay(); }
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [placed.next, openPay]);

  // Album numérique payé : on ajoute automatiquement l'album à « Ma musique » avec le code d'accès.
  useEffect(() => {
    if (kind === "album" && st.status === "paid" && st.accessCode && added === null) {
      setAdded(false);
      redeem(st.accessCode).then(() => setAdded(true)).catch(() => setAdded(false));
    }
  }, [kind, st.status, st.accessCode, added]);

  const sim = async (outcome: "success" | "failure") => {
    setBusy(true); setErr(null);
    try {
      if (kind === "ticket") await simulateTicket(placed.orderId, method, outcome);
      else await simulateAlbum(placed.orderId, placed.k ?? "", method, outcome);
      await check();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); }
    setBusy(false);
  };

  const box = { borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, padding: 18, gap: 10 } as const;

  if (st.status === "paid") {
    return (
      <View style={box}>
        <Ionicons name="checkmark-circle" size={44} color={c.gold} />
        <Text style={{ fontFamily: serif, fontSize: 26, color: c.text }}>Paiement confirmé</Text>
        {kind === "ticket" ? (
          <>
            <Body>Vos tickets ont été envoyés à {st.email}. Présentez le code de chaque ticket à l'entrée.</Body>
            {st.tickets?.map((t) => (
              <View key={t.code} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12 }}>
                <Text style={{ fontFamily: sansBold, color: c.gold, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase" }}>{t.type_name}</Text>
                <Text selectable style={{ fontFamily: sansBold, color: c.text, fontSize: 18, letterSpacing: 2, marginTop: 4 }}>{t.code}</Text>
                <View style={{ alignItems: "center", marginTop: 12 }}><QrCode value={t.code} /></View>
              </View>
            ))}
          </>
        ) : mode === "delivery" ? (
          <Body>Paiement reçu, merci ! Nous vous contactons pour la livraison de votre CD.</Body>
        ) : (
          <>
            <Body>Votre album est prêt. Un e-mail avec votre code d'accès a aussi été envoyé à {st.email}.</Body>
            {st.accessCode ? <Text selectable style={{ fontFamily: sansBold, color: c.gold, fontSize: 22, letterSpacing: 3 }}>{st.accessCode}</Text> : null}
            {added === true ? <Banner kind="info" text="L'album a été ajouté à « Ma musique »." /> : null}
            {added === false && !st.accessCode ? <Banner text="Entrez le code reçu par e-mail dans « Ma musique »." kind="info" /> : null}
            <Button label="Écouter dans Ma musique" onPress={() => goTab("Ma musique")} />
          </>
        )}
      </View>
    );
  }
  if (st.status === "delivery" || st.status === "delivery_requested") {
    return (
      <View style={box}>
        <Ionicons name="checkmark-circle" size={44} color={c.gold} />
        <Text style={{ fontFamily: serif, fontSize: 26, color: c.text }}>Demande enregistrée</Text>
        <Body>Nous vous recontactons pour la livraison et le paiement à la remise.</Body>
      </View>
    );
  }
  if (st.status === "failed" || st.status === "cancelled") {
    return (
      <View style={box}>
        <Ionicons name="close-circle" size={44} color={c.rose} />
        <Text style={{ fontFamily: serif, fontSize: 26, color: c.text }}>Paiement non abouti</Text>
        <Body>Aucun montant n'a été débité. Vous pouvez réessayer.</Body>
        <Button label="Réessayer" onPress={onRetry} />
      </View>
    );
  }
  return (
    <View style={box}>
      <Text style={{ fontFamily: serif, fontSize: 24, color: c.text }}>{placed.next === "simulation" ? "Paiement de test" : "En attente du paiement"}</Text>
      <View style={{ alignSelf: "flex-start" }}><PayLogo method={method} /></View>
      {placed.next === "simulation" ? (
        <>
          <Body>Mode test : aucun argent n'est prélevé. Choisissez le résultat à simuler.</Body>
          <Button label="Simuler un paiement réussi" onPress={() => sim("success")} disabled={busy} />
          <Button ghost label="Simuler un échec" onPress={() => sim("failure")} disabled={busy} />
        </>
      ) : (
        <>
          <Body>Terminez le paiement dans la page sécurisée PayDunya. Cet écran se met à jour tout seul.</Body>
          <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>Vérification en cours…</Text>
          <Button label="J'ai payé : vérifier" onPress={() => void check()} />
          <Button ghost label="Rouvrir la page de paiement" onPress={() => void openPay()} />
        </>
      )}
      {err ? <Banner text={err} /> : null}
    </View>
  );
}

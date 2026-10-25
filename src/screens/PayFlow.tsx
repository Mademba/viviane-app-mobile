import { PayLogo } from "../ui";
import QrCode from "../QrCode";
import { withBrowser } from "../session";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { API_URL } from "../config";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { albumStatus, redeem, simulateAlbum, simulateTicket, ticketStatus, type PayMethod, type Placed } from "../api";
import { goTab } from "../nav";
import { Banner, Body, Button, openLink } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

type Kind = "ticket" | "album";
type State = { status: string; email?: string; accessCode?: string | null; tickets?: { code: string; type_name: string; seat_index?: number }[]; event?: { title: string; venue: string; city: string; starts_at: string }; title?: string };

const PAPER = "#fffaf5", INK = "#2a1620", BASE = "#d2456e", GOLD = "#b88d29";
const pdfUrl = (orderId: string, n?: number) => `${API_URL}/api/public/ticket-pdf/${orderId}${n === undefined ? "" : `?n=${n}`}`;
const downloadPdf = (url: string) => withBrowser(() => Linking.openURL(url)).catch(() => {});

/** Billet : même présentation que sur le site (bandeau, infos, talon avec QR code). */
function TicketCard({ t, i, total, st, orderId }: { t: { code: string; type_name: string; seat_index?: number }; i: number; total: number; st: State; orderId: string }) {
  const ev = st.event;
  const d = ev ? new Date(ev.starts_at) : null;
  const line = (label: string, v: string) => (
    <View style={{ marginTop: 8 }}>
      <Text style={{ fontFamily: sansBold, fontSize: 9.5, letterSpacing: 2, color: GOLD }}>{label}</Text>
      <Text style={{ fontFamily: sansBold, fontSize: 14.5, color: INK, marginTop: 2 }}>{v}</Text>
    </View>
  );
  return (
    <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: PAPER, borderTopWidth: 6, borderTopColor: BASE }}>
      <View style={{ padding: 18 }}>
        <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 3, color: GOLD }}>VIVIANE CHIDID · BILLET</Text>
        <Text style={{ fontFamily: serif, fontSize: 28, lineHeight: 30, color: BASE, marginTop: 6 }}>{ev?.title ?? st.title ?? "Événement"}</Text>
        {d ? line("DATE", d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })) : null}
        {ev ? line("LIEU", `${ev.venue}, ${ev.city}`) : null}
        {line("TARIF", t.type_name)}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 14, height: 28, borderTopRightRadius: 14, borderBottomRightRadius: 14, backgroundColor: "#190104" }} />
        <View style={{ flex: 1, borderTopWidth: 1.5, borderStyle: "dashed", borderColor: "#d9c3b3" }} />
        <View style={{ width: 14, height: 28, borderTopLeftRadius: 14, borderBottomLeftRadius: 14, backgroundColor: "#190104" }} />
      </View>
      <View style={{ alignItems: "center", padding: 18, gap: 8 }}>
        <QrCode value={t.code} size={176} />
        <Text selectable style={{ fontFamily: sansBold, fontSize: 15, letterSpacing: 2.5, color: INK }}>{t.code.slice(0, 12).toUpperCase()}</Text>
        <Text style={{ fontFamily: sans, fontSize: 12, color: "#6b5560" }}>Billet {i + 1} / {total} · valable une seule fois</Text>
        <Pressable accessibilityRole="button" onPress={() => void downloadPdf(pdfUrl(orderId, t.seat_index ?? i))} style={{ marginTop: 6, height: 44, paddingHorizontal: 20, borderRadius: 22, borderWidth: 1.5, borderColor: BASE, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="download-outline" size={18} color={BASE} />
          <Text style={{ fontFamily: sansBold, fontSize: 13, color: BASE }}>Ce billet en PDF</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Après la commande : ouvre la page de paiement PayDunya, surveille le paiement, puis confirme dans l'application. */
export default function PayFlow({ kind, placed, method, mode, onRetry }: { kind: Kind; placed: Placed; method: PayMethod; mode?: "digital" | "delivery"; onRetry: () => void }) {
  const { c } = useTheme();
  const [st, setSt] = useState<State>({ status: placed.next === "delivery" ? "delivery" : "pending" });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
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
            <Body>Vos billets (PDF) ont aussi été envoyés par e-mail à {st.email}. Présentez le QR code à l'entrée.</Body>
            <Button label="Télécharger tous les billets (PDF)" onPress={() => void downloadPdf(pdfUrl(placed.orderId))} />
            <View style={{ gap: 14, marginTop: 4 }}>
              {st.tickets?.map((t, i) => <TicketCard key={t.code} t={t} i={i} total={st.tickets!.length} st={st} orderId={placed.orderId} />)}
            </View>
          </>
        ) : mode === "delivery" ? (
          <Body>Paiement reçu, merci ! Nous vous contactons pour la livraison de votre CD.</Body>
        ) : (
          <>
            <Body>Votre album est prêt. Un e-mail avec votre code d'accès a aussi été envoyé à {st.email}.</Body>
            {st.accessCode ? (
              <View style={{ gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.gold, alignItems: "center" }}>
                <Text style={{ fontFamily: sans, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", color: c.muted }}>Votre code d'accès</Text>
                <Text selectable style={{ fontFamily: sansBold, color: c.gold, fontSize: 24, letterSpacing: 3 }}>{st.accessCode}</Text>
                <Button ghost label={copied ? "Code copié ✓" : "Copier le code"} onPress={() => { void Clipboard.setStringAsync(st.accessCode!).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {}); }} style={{ minHeight: 44, alignSelf: "stretch" }} />
              </View>
            ) : null}
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

import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchEventSale, placeTicketOrder, type EventSale, type PayMethod, type Placed } from "../api";
import PayFlow from "./PayFlow";
import { BackBar, Banner, Body, Button, Cover, Field, PayPicker, fmtDate, money, validEmail } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

export default function Ticket({ route, navigation }: { route: { params: { id: string } }; navigation: { goBack: () => void } }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [sale, setSale] = useState<EventSale | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PayMethod>("orange_money");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);

  useEffect(() => { fetchEventSale(route.params.id).then(setSale).catch((e) => setErr(e instanceof Error ? e.message : "Erreur")); }, [route.params.id]);

  const types = sale?.types ?? [];
  const total = types.reduce((s, t) => s + (qty[t.id] ?? 0) * t.price, 0);
  const count = Object.values(qty).reduce((a, b) => a + b, 0);
  const cur = sale?.event.currency ?? "XOF";
  const step = (id: string, d: number, max: number) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(max, (q[id] ?? 0) + d)) }));

  const pay = async () => {
    setErr(null);
    if (!sale) return;
    if (count < 1) return setErr("Choisissez au moins un ticket.");
    if (count > 5) return setErr("5 tickets maximum par personne.");
    if (name.trim().length < 2) return setErr("Entrez votre nom complet.");
    if (!validEmail(email)) return setErr("Entrez une adresse e-mail valide : vos tickets y seront envoyés.");
    setBusy(true);
    try {
      const items = types.filter((t) => (qty[t.id] ?? 0) > 0).map((t) => ({ ticketTypeId: t.id, quantity: qty[t.id]! }));
      setPlaced(await placeTicketOrder({ eventId: sale.event.id, items, name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, paymentMethod: method }));
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); }
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 140, gap: 14 }} keyboardShouldPersistTaps="handled">
        <BackBar onBack={navigation.goBack} label="Billetterie" />
        {!sale && !err ? <ActivityIndicator color={c.rose} style={{ marginTop: 30 }} /> : null}
        {err && !sale ? <Banner text={err} /> : null}
        {sale ? (
          <>
            {sale.event.poster_url ? <View style={{ borderRadius: 16, overflow: "hidden" }}><Cover uri={sale.event.poster_url} size="100%" radius={0} /></View> : null}
            <Text style={{ fontFamily: serif, fontSize: 28, color: c.text, lineHeight: 32 }}>{sale.event.title}</Text>
            <Text style={{ fontFamily: sans, fontSize: 14, color: c.soft }}>{fmtDate(sale.event.starts_at, true)} · {sale.event.venue}, {sale.event.city}</Text>
            {placed ? (
              <PayFlow kind="ticket" placed={placed} method={method} onRetry={() => setPlaced(null)} />
            ) : !sale.sellable ? (
              <Banner kind="info" text="La vente en ligne n'est pas ouverte pour cet événement." />
            ) : (
              <>
                <View style={{ borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
                  {types.map((t, i) => {
                    const max = Math.min(5, t.remaining ?? 5);
                    const q = qty[t.id] ?? 0;
                    return (
                      <View key={t.id} style={{ flexDirection: "row", alignItems: "center", padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: sansBold, fontSize: 15, color: c.text }}>{t.name}</Text>
                          <Text style={{ fontFamily: sansBold, fontSize: 13, color: c.gold, marginTop: 2 }}>{money(t.price, cur)}</Text>
                          {t.remaining !== null && t.remaining <= 10 ? <Text style={{ fontFamily: sans, fontSize: 12, color: c.pink }}>{t.remaining === 0 ? "Épuisé" : `Plus que ${t.remaining}`}</Text> : null}
                        </View>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Retirer un ticket ${t.name}`} onPress={() => step(t.id, -1, max)} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 22, color: c.text }}>−</Text></Pressable>
                        <Text style={{ width: 30, textAlign: "center", fontFamily: sansBold, fontSize: 17, color: c.text }}>{q}</Text>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Ajouter un ticket ${t.name}`} disabled={max === 0} onPress={() => step(t.id, 1, max)} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.rose, alignItems: "center", justifyContent: "center", opacity: max === 0 ? 0.4 : 1 }}><Text style={{ fontSize: 22, color: c.onRose }}>+</Text></Pressable>
                      </View>
                    );
                  })}
                </View>
                <Body style={{ fontSize: 12, color: c.muted }}>5 tickets maximum par personne.</Body>
                <Field label="Nom complet" value={name} onChange={setName} />
                <Field label="Adresse e-mail" value={email} onChange={setEmail} keyboard="email-address" />
                <Field label="Téléphone" value={phone} onChange={setPhone} keyboard="phone-pad" />
                <PayPicker value={method} onChange={setMethod} />
                {err ? <Banner text={err} /> : null}
              </>
            )}
          </>
        ) : null}
      </ScrollView>
      {sale && sale.sellable && !placed ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.bar, borderTopWidth: 1, borderTopColor: c.line, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View>
            <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>Total · {count} ticket{count > 1 ? "s" : ""}</Text>
            <Text style={{ fontFamily: serif, fontSize: 22, color: c.text }}>{money(total, cur)}</Text>
          </View>
          <Button label={busy ? "Patientez…" : "Payer"} onPress={pay} disabled={busy} style={{ flex: 1, borderRadius: 12 }} />
        </View>
      ) : null}
    </View>
  );
}

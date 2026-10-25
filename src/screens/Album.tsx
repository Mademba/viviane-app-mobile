import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchAlbumSale, placeAlbumOrder, type AlbumSale, type PayMethod, type Placed } from "../api";
import PayFlow from "./PayFlow";
import { BackBar, Banner, Body, Button, Cover, Field, PayPicker, fmtDate, money, validEmail } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

export default function Album({ route, navigation }: { route: { params: { id: string } }; navigation: { goBack: () => void } }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [sale, setSale] = useState<AlbumSale | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"digital" | "delivery">("digital");
  const [qty, setQty] = useState(1);
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState("");
  const [address, setAddress] = useState(""); const [city, setCity] = useState("");
  const [method, setMethod] = useState<PayMethod>("orange_money");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const player = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    fetchAlbumSale(route.params.id).then((s) => { setSale(s); if (!s.album.digital_enabled && s.album.physical_enabled) setMode("delivery"); }).catch((e) => setErr(e instanceof Error ? e.message : "Erreur"));
    return () => { player.current?.remove(); player.current = null; };
  }, [route.params.id]);

  const togglePreview = (id: string, url: string) => {
    if (playing === id) { player.current?.pause(); setPlaying(null); return; }
    if (!player.current) {
      player.current = createAudioPlayer(url);
      player.current.addListener("playbackStatusUpdate", (s) => { if (s.didJustFinish) setPlaying(null); });
    } else player.current.replace(url);
    player.current.play();
    setPlaying(id);
  };

  const a = sale?.album;
  const cur = sale?.item.currency ?? "XOF";
  const canDelivery = !!a && a.physical_enabled && a.price_physical !== null && (a.physical_left === null || a.physical_left > 0);
  const canDigital = !!a?.digital_enabled;
  const unit = mode === "digital" ? (a?.price_digital ?? 0) : (a?.price_physical ?? 0);
  const q = mode === "digital" ? 1 : qty;
  const maxQty = Math.min(100, a?.physical_left ?? 100);
  const pre = sale ? !sale.released : false;
  const intro = a?.presentation || sale?.item.description || "";

  const buy = async () => {
    setErr(null);
    if (!sale) return;
    if (name.trim().length < 2) return setErr("Entrez votre nom complet.");
    if (!validEmail(email)) return setErr("Entrez une adresse e-mail valide.");
    if (mode === "delivery" && (address.trim().length < 3 || city.trim().length < 2)) return setErr("Entrez l'adresse et la ville de livraison.");
    setBusy(true);
    try {
      player.current?.pause(); setPlaying(null);
      setPlaced(await placeAlbumOrder({ articleId: sale.item.id, mode, quantity: q, name: name.trim(), email: email.trim(), phone: phone.trim() || undefined, paymentMethod: mode === "digital" ? method : undefined, address: mode === "delivery" ? address.trim() : undefined, city: mode === "delivery" ? city.trim() : undefined }));
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); }
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: 340 }}>
          <Cover uri={a?.cover_url ?? sale?.item.poster_url} size="100%" radius={0} />
          <LinearGradient colors={["rgba(25,1,4,.25)", c.bg]} locations={[0.3, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ position: "absolute", left: 20, right: 20, top: insets.top + 8 }}><BackBar onBack={navigation.goBack} label="Album" /></View>
          {sale ? (
            <View style={{ position: "absolute", left: 20, right: 20, bottom: 14 }}>
              {pre ? <Text style={{ alignSelf: "flex-start", backgroundColor: c.rose, color: "#fff", fontFamily: sansBold, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: "hidden" }}>Précommande</Text> : null}
              <Text style={{ fontFamily: serif, fontSize: 38, color: c.text, lineHeight: 40, marginTop: 8 }}>{sale.item.title}</Text>
              <Text style={{ fontFamily: sans, fontSize: 14, color: c.soft, marginTop: 4 }}>Viviane Chidid · {pre ? "sortie le " : ""}{fmtDate(sale.item.starts_at, true)}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          {!sale && !err ? <ActivityIndicator color={c.rose} /> : null}
          {err && !placed ? <Banner text={err} /> : null}
          {intro ? <Body>{intro}</Body> : null}

          {sale && sale.tracks.length ? (
            <View>
              <Text style={{ fontFamily: serif, fontSize: 22, color: c.text, marginBottom: 4 }}>Tracklist</Text>
              {sale.tracks.map((t) => (
                <View key={t.id} style={{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
                  <Text style={{ width: 24, textAlign: "right", fontFamily: sans, color: c.muted }}>{String(t.position).padStart(2, "0")}</Text>
                  <Text style={{ flex: 1, fontFamily: sans, fontSize: 16, color: c.text }}>{t.title}</Text>
                  {t.preview_url ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={`Écouter un extrait de ${t.title}`} onPress={() => togglePreview(t.id, t.preview_url!)}
                      style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, borderColor: c.gold, flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name={playing === t.id ? "pause" : "play"} size={13} color={c.gold} />
                      <Text style={{ fontFamily: sansBold, fontSize: 12, color: c.gold }}>Extrait</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          {sale && !placed ? (
            <>
              <Text style={{ fontFamily: serif, fontSize: 22, color: c.text, marginTop: 6 }}>Choisir un format</Text>
              {canDigital ? <Format on={mode === "digital"} onPress={() => setMode("digital")} title="Album numérique" sub="Dans l'application, avec un code d'accès" price={money(a!.price_digital, cur)} /> : null}
              {canDelivery ? <Format on={mode === "delivery"} onPress={() => setMode("delivery")} title="CD livré" sub={a!.physical_left !== null ? `Plus que ${a!.physical_left} exemplaire(s)` : "Livraison à votre adresse"} price={money(a!.price_physical!, cur)} /> : null}
              {!canDigital && !canDelivery ? <Banner kind="info" text="Cet album n'est pas disponible à l'achat pour le moment." /> : null}
              {(canDigital || canDelivery) ? (
                <>
                  {mode === "delivery" ? (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={{ fontFamily: sans, color: c.text }}>Quantité</Text>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Pressable accessibilityRole="button" accessibilityLabel="Moins" onPress={() => setQty((v) => Math.max(1, v - 1))} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 22, color: c.text }}>−</Text></Pressable>
                        <Text style={{ width: 36, textAlign: "center", fontFamily: sansBold, fontSize: 17, color: c.text }}>{qty}</Text>
                        <Pressable accessibilityRole="button" accessibilityLabel="Plus" onPress={() => setQty((v) => Math.min(maxQty, v + 1))} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.rose, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 22, color: c.onRose }}>+</Text></Pressable>
                      </View>
                    </View>
                  ) : null}
                  <Field label="Nom complet" value={name} onChange={setName} />
                  <Field label="Adresse e-mail" value={email} onChange={setEmail} keyboard="email-address" />
                  <Field label="Téléphone" value={phone} onChange={setPhone} keyboard="phone-pad" />
                  {mode === "delivery" ? (<><Field label="Adresse de livraison" value={address} onChange={setAddress} /><Field label="Ville" value={city} onChange={setCity} /><Body style={{ fontSize: 12, color: c.muted }}>Paiement à la livraison.</Body></>) : <PayPicker value={method} onChange={setMethod} />}
                </>
              ) : null}
            </>
          ) : null}
          {placed ? <PayFlow kind="album" placed={placed} method={method} mode={mode} onRetry={() => setPlaced(null)} /> : null}
        </View>
      </ScrollView>
      {sale && !placed && (canDigital || canDelivery) ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.bar, borderTopWidth: 1, borderTopColor: c.line, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View>
            <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>{mode === "digital" ? "Album numérique" : `CD × ${q}`}</Text>
            <Text style={{ fontFamily: serif, fontSize: 22, color: c.text }}>{money(unit * q, cur)}</Text>
          </View>
          <Button label={busy ? "Patientez…" : pre ? "Précommander" : mode === "delivery" ? "Commander" : "Acheter"} onPress={buy} disabled={busy} style={{ flex: 1, borderRadius: 12 }} />
        </View>
      ) : null}
    </View>
  );
}

function Format({ on, onPress, title, sub, price }: { on: boolean; onPress: () => void; title: string; sub: string; price: string }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ padding: 14, borderRadius: 12, borderWidth: on ? 2 : 1, borderColor: on ? c.rose : c.line, backgroundColor: on ? "rgba(221,70,119,.16)" : "transparent", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: sansBold, fontSize: 15, color: c.text }}>{title}</Text>
        <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted, marginTop: 2 }}>{sub}</Text>
      </View>
      <Text style={{ fontFamily: sansBold, fontSize: 15, color: c.gold }}>{price}</Text>
    </Pressable>
  );
}

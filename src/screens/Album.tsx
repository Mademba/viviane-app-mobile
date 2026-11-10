import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchAlbumSale, placeAlbumOrder, type AlbumSale, type PayMethod, type Placed } from "../api";
import PayFlow from "./PayFlow";
import VideoPreview from "../VideoPreview";
import { BackBar, Banner, Body, Button, Field, NaturalImage, PayPicker, fmtDate, money, validEmail, COL } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";
import { cleanName, cleanPhone, nameError, phoneError } from "../identity";

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
  const [payNow, setPayNow] = useState(true);
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
  const isVideoUrl = (u?: string | null) => !!u && /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(u);
  const isClip = a?.kind === "clip" || !!sale?.tracks.some((t) => isVideoUrl(t.preview_url));
  const isSingle = !isClip && a?.kind === "single";
  const noun = isClip ? "clip" : isSingle ? "single" : "album";
  const canDelivery = !isClip && !!a && a.physical_enabled && a.price_physical !== null && (a.physical_left === null || a.physical_left > 0);
  const canDigital = !!a?.digital_enabled;
  const unit = mode === "digital" ? (a?.price_digital ?? 0) : (a?.price_physical ?? 0);
  const q = mode === "digital" ? 1 : qty;
  const maxQty = Math.min(100, a?.physical_left ?? 100);
  const pre = sale ? !sale.released : false;
  const intro = a?.presentation || sale?.item.description || "";

  const buy = async () => {
    setErr(null);
    if (!sale) return;
    const ne = nameError(name); if (ne) return setErr(ne);
    const pe = phoneError(phone, true); if (pe) return setErr(pe);
    if (!validEmail(email)) return setErr("Entrez une adresse e-mail valide.");
    if (mode === "delivery" && (address.trim().length < 3 || city.trim().length < 2)) return setErr("Entrez l'adresse et la ville de livraison.");
    setBusy(true);
    try {
      player.current?.pause(); setPlaying(null);
      setPlaced(await placeAlbumOrder({ articleId: sale.item.id, mode, quantity: q, name: cleanName(name), email: email.trim(), phone: cleanPhone(phone) ?? undefined, paymentMethod: mode === "digital" || payNow ? method : undefined, address: mode === "delivery" ? address.trim() : undefined, city: mode === "delivery" ? city.trim() : undefined }));
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); }
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ ...COL, paddingBottom: 150 }} keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 10 }}><BackBar onBack={navigation.goBack} label="Album" /></View>
        <NaturalImage uri={a?.cover_url ?? sale?.item.poster_url} min={isClip ? 1.2 : 0.7} max={isClip ? 1.9 : 1.2} />
        {sale ? (
          <View style={{ paddingHorizontal: 22, paddingTop: 22, paddingBottom: 6 }}>
            {pre ? <Text style={{ alignSelf: "flex-start", backgroundColor: c.rose, color: "#fff", fontFamily: sansBold, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>Précommande</Text> : null}
            <Text style={{ fontFamily: sansBold, fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: c.gold }}>{isClip ? "Clip vidéo exclusif" : isSingle ? "Single · Viviane Chidid" : "Viviane Chidid"}</Text>
            <Text style={{ fontFamily: serif, fontSize: 40, color: c.text, lineHeight: 42, marginTop: 8 }}>{sale.item.title}</Text>
            <Text style={{ fontFamily: sans, fontSize: 15, color: c.soft, marginTop: 8 }}>{pre ? "Sortie le " : "Sorti le "}{fmtDate(sale.item.starts_at, true)}</Text>
            <View style={{ height: 3, width: 48, borderRadius: 2, backgroundColor: c.rose, marginTop: 18 }} />
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 22, paddingTop: 12, gap: 18 }}>
          {!sale && !err ? <ActivityIndicator color={c.rose} /> : null}
          {err && !placed ? <Banner text={err} /> : null}
          {intro ? <Body>{intro}</Body> : null}

          {sale && isClip ? (
            <View style={{ gap: 10 }}>
              <Text style={{ fontFamily: serif, fontSize: 22, color: c.text }}>Aperçu</Text>
              {sale.tracks.find((t) => t.preview_url)?.preview_url ? <VideoPreview uri={sale.tracks.find((t) => t.preview_url)!.preview_url!} /> : <Body>{pre ? "L'extrait sera bientôt disponible." : "Aucun extrait disponible."}</Body>}
              <Body style={{ fontSize: 13 }}>Clip à regarder uniquement dans l'application, avec votre code d'accès (2 appareils). Contenu protégé : captures d'écran désactivées.</Body>
            </View>
          ) : null}

          {sale && !isClip && sale.tracks.length ? (
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
              {canDigital ? <Format on={mode === "digital"} onPress={() => setMode("digital")} title={isClip ? "Clip vidéo exclusif" : isSingle ? "Single numérique" : "Album numérique"} sub={isClip ? "À regarder dans l'application, avec un code d'accès" : "Dans l'application, avec un code d'accès"} price={money(a!.price_digital, cur)} /> : null}
              {canDelivery ? <Format on={mode === "delivery"} onPress={() => setMode("delivery")} title="CD livré" sub={a!.physical_left !== null ? `Plus que ${a!.physical_left} exemplaire(s)` : "Livraison à votre adresse"} price={money(a!.price_physical!, cur)} /> : null}
              {!canDigital && !canDelivery ? <Banner kind="info" text={`Ce ${noun} n'est pas disponible à l'achat pour le moment.`} /> : null}
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
                  <Field label="Téléphone (ex. 77 123 45 67)" value={phone} onChange={setPhone} keyboard="phone-pad" />
                  {mode === "delivery" ? (<><Field label="Adresse de livraison" value={address} onChange={setAddress} /><Field label="Ville" value={city} onChange={setCity} /><Format on={payNow} onPress={() => setPayNow(true)} title="Payer maintenant" sub="En ligne, puis livraison" price="" /><Format on={!payNow} onPress={() => setPayNow(false)} title="Payer à la livraison" sub="En espèces à la remise" price="" />{payNow ? <PayPicker value={method} onChange={setMethod} /> : null}</>) : <PayPicker value={method} onChange={setMethod} />}
                </>
              ) : null}
            </>
          ) : null}
          {placed ? <PayFlow kind="album" noun={noun} placed={placed} method={method} mode={mode} onRetry={() => setPlaced(null)} /> : null}
        </View>
      </ScrollView>
      {sale && !placed && (canDigital || canDelivery) ? (
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 12, backgroundColor: c.bar, borderTopWidth: 1, borderTopColor: c.line, flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View>
            <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>{mode === "digital" ? (isClip ? "Clip vidéo" : isSingle ? "Single numérique" : "Album numérique") : `CD × ${q}`}</Text>
            <Text style={{ fontFamily: serif, fontSize: 22, color: c.text }}>{money(unit * q, cur)}</Text>
          </View>
          <Button label={busy ? "Patientez…" : pre ? "Précommander" : mode === "delivery" && !payNow ? "Commander" : "Acheter"} onPress={buy} disabled={busy} style={{ flex: 1, borderRadius: 12 }} />
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

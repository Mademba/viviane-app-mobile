import { withBrowser } from "./session";
import React, { useEffect, useRef, useState } from "react";
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { sans, sansBold, serif, useTheme } from "./theme";

export function H1({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: serif, fontSize: 30, color: c.text, lineHeight: 34 }}>{children}</Text>;
}
export function Eyebrow({ children }: { children: React.ReactNode }) {
  const { c } = useTheme();
  return <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: c.gold }}>{children}</Text>;
}
export function Body({ children, style, numberOfLines }: { children: React.ReactNode; style?: object; numberOfLines?: number }) {
  const { c } = useTheme();
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: sans, fontSize: 15, lineHeight: 22, color: c.soft }, style]}>{children}</Text>;
}
export function Button({ label, onPress, ghost, disabled, style }: { label: string; onPress: () => void; ghost?: boolean; disabled?: boolean; style?: ViewStyle }) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[{
        minHeight: 52, borderRadius: 26, paddingHorizontal: 22, alignItems: "center", justifyContent: "center",
        backgroundColor: ghost ? "transparent" : c.rose, borderWidth: ghost ? 1 : 0, borderColor: c.line, opacity: disabled ? 0.5 : 1,
      }, style]}
    >
      <Text style={{ fontFamily: sansBold, fontSize: 13, letterSpacing: 1.6, textTransform: "uppercase", color: ghost ? c.text : c.onRose }}>{label}</Text>
    </Pressable>
  );
}
export function Cover({ uri: raw, size, radius = 12, label }: { uri?: string | null; size: number | "100%" | "fill"; radius?: number; label?: string }) {
  const { c } = useTheme();
  const uri = absUrl(raw);
  const s = size === "fill" ? { width: "100%" as const, height: "100%" as const } : size === "100%" ? { width: "100%" as const, aspectRatio: 1 } : { width: size, height: size };
  return uri ? (
    <Image source={{ uri }} style={[s, { borderRadius: radius, backgroundColor: c.card }]} resizeMode="cover" accessibilityLabel={label} />
  ) : (
    <LinearGradient colors={[c.rose, "#5b0020", c.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s, { borderRadius: radius }]} />
  );
}
export function Banner({ text, kind = "error" }: { text: string; kind?: "error" | "info" }) {
  const { c } = useTheme();
  return (
    <View style={{ padding: 12, borderRadius: 10, backgroundColor: kind === "error" ? "rgba(221,70,119,.16)" : c.card, borderWidth: 1, borderColor: c.line }}>
      <Text style={{ fontFamily: sans, color: c.text, fontSize: 14 }}>{text}</Text>
    </View>
  );
}
export const fmtDate = (iso: string, long = false) =>
  new Date(iso).toLocaleDateString("fr-FR", long ? { weekday: "long", day: "numeric", month: "long", year: "numeric" } : { day: "numeric", month: "short", year: "numeric" });
export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
export const styles = StyleSheet.create({ screen: { flex: 1 }, pad: { paddingHorizontal: 20 } });

// ───────── Éléments partagés ─────────
import { Ionicons } from "@expo/vector-icons";
import { TextInput, ActivityIndicator, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { absUrl, type PayMethod } from "./api";

export function ThemeButton() {
  const { c, toggle } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={c.dark ? "Passer en mode clair" : "Passer en mode sombre"} onPress={toggle}
      style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={c.dark ? "sunny-outline" : "moon-outline"} size={20} color={c.text} />
    </Pressable>
  );
}

/** En-tête commun : nom + titre à gauche, bouton clair/sombre (et éventuellement autre action) à droite. */
export function TopBar({ title, extra }: { title: string; extra?: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 3, textTransform: "uppercase", color: c.gold }}>Viviane Chidid</Text>
        <Text style={{ fontFamily: serif, fontSize: 30, color: c.text, marginTop: 6 }}>{title}</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>{extra}<ThemeButton /></View>
    </View>
  );
}

/** En-tête des écrans empilés : retour + titre court + bouton clair/sombre. */
export function BackBar({ onBack, label }: { onBack: () => void; label: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginLeft: -10 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={onBack} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 2, paddingRight: 12 }}>
        <Ionicons name="chevron-back" size={24} color={c.text} />
        <Text style={{ fontFamily: sansBold, fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: c.gold }}>{label}</Text>
      </Pressable>
      <ThemeButton />
    </View>
  );
}

export function Field({ label, value, onChange, keyboard, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; keyboard?: "email-address" | "phone-pad" | "default"; placeholder?: string; multiline?: boolean }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: sans, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", color: c.muted }}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} keyboardType={keyboard ?? "default"} placeholder={placeholder} placeholderTextColor={c.muted}
        autoCapitalize={keyboard === "email-address" ? "none" : "sentences"} autoCorrect={false} multiline={multiline} accessibilityLabel={label}
        style={{ minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: c.line, paddingHorizontal: 14, paddingVertical: multiline ? 10 : 0, color: c.text, fontFamily: sans, fontSize: 15, backgroundColor: c.card }}
      />
    </View>
  );
}

const LOGOS = {
  orange_money: require("../assets/payments/orange-money.png"),
  wave: require("../assets/payments/wave.png"),
  visa: require("../assets/payments/visa.png"),
  mastercard: require("../assets/payments/mastercard.png"),
};
const PAY: { id: PayMethod; label: string }[] = [{ id: "orange_money", label: "Orange Money" }, { id: "wave", label: "Wave" }, { id: "card", label: "Carte bancaire" }];
function Chip({ src, w, h }: { src: number; w: number; h: number }) {
  return (
    <View style={{ width: w, height: h, borderRadius: 8, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", padding: 4 }}>
      <Image source={src} style={{ width: "100%", height: "100%" }} resizeMode="contain" />
    </View>
  );
}
export function PayLogo({ method }: { method: PayMethod }) {
  if (method === "card") return <View style={{ flexDirection: "row", gap: 6 }}><Chip src={LOGOS.visa} w={52} h={34} /><Chip src={LOGOS.mastercard} w={52} h={34} /></View>;
  return <Chip src={method === "wave" ? LOGOS.wave : LOGOS.orange_money} w={64} h={44} />;
}
export function PayPicker({ value, onChange }: { value: PayMethod; onChange: (m: PayMethod) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: sans, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", color: c.muted }}>Moyen de paiement</Text>
      <View style={{ gap: 8 }}>
        {PAY.map((m) => {
          const on = m.id === value;
          return (
            <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={m.label} accessibilityState={{ selected: on }} onPress={() => onChange(m.id)}
              style={{ minHeight: 64, borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: on ? 2 : 1, borderColor: on ? c.rose : c.line, backgroundColor: on ? "rgba(221,70,119,.16)" : "transparent" }}>
              <PayLogo method={m.id} />
              <Text style={{ flex: 1, fontFamily: sansBold, fontSize: 15, color: c.text }}>{m.label}</Text>
              <Ionicons name={on ? "radio-button-on" : "radio-button-off"} size={22} color={on ? c.rose : c.muted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const money = (n: number, cur: string) => `${Number(n).toLocaleString("fr-FR")} ${cur}`;
export const validEmail = (e: string) => /^\S+@\S+\.\S+$/.test(e.trim());

export const openLink = (url: string) => (/^https?:\/\//i.test(url) ? withBrowser(() => WebBrowser.openBrowserAsync(url, { toolbarColor: "#190104", controlsColor: "#e3ad4b" })) : Linking.openURL(url).catch(() => {}));
export { ActivityIndicator };


// ───────── Photos : jamais coupées ─────────
/** Photo entière dans un cadre de ratio fixe : fond flouté + image « contain » (rien n'est rogné). */
export function FitImage({ uri: raw, ratio = 1.5, radius = 0, onPress, label }: { uri?: string | null; ratio?: number; radius?: number; onPress?: () => void; label?: string }) {
  const { c } = useTheme();
  const uri = absUrl(raw);
  const body = (
    <View style={{ width: "100%", aspectRatio: ratio, borderRadius: radius, overflow: "hidden", backgroundColor: c.card }}>
      {uri ? (
        <>
          <Image source={{ uri }} blurRadius={28} style={StyleSheet.absoluteFill} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,.25)" }]} />
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" accessibilityLabel={label} />
        </>
      ) : (
        <LinearGradient colors={[c.rose, "#5b0020", c.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="imagebutton" accessibilityLabel={label ?? "Agrandir la photo"} onPress={onPress}>{body}</Pressable> : body;
}

/** Photo pleine largeur à son format naturel (bornée), sans rognage. */
export function NaturalImage({ uri: raw, min = 0.8, max = 1.8, radius = 0 }: { uri?: string | null; min?: number; max?: number; radius?: number }) {
  const uri = absUrl(raw);
  const [ratio, setRatio] = useState(1.5);
  useEffect(() => {
    if (!uri) return;
    Image.getSize(uri, (w, h) => { if (w && h) setRatio(Math.min(max, Math.max(min, w / h))); }, () => {});
  }, [uri, min, max]);
  return <FitImage uri={uri} ratio={ratio} radius={radius} />;
}

/** Visionneuse plein écran : on glisse d'une photo à l'autre. */
export function Lightbox({ photos, start, onClose }: { photos: string[]; start: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [i, setI] = useState(0);
  const ref = useRef<FlatList<string>>(null);
  useEffect(() => { if (start !== null) setI(start); }, [start]);
  return (
    <Modal visible={start !== null} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        {start !== null ? (
          <FlatList ref={ref} data={photos} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(u) => u} initialScrollIndex={start}
            getItemLayout={(_, k) => ({ length: width, offset: width * k, index: k })}
            onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => <View style={{ width, height, justifyContent: "center" }}><Image source={{ uri: item }} style={{ width, height: height * 0.86 }} resizeMode="contain" /></View>} />
        ) : null}
        <View style={{ position: "absolute", top: 44, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: sansBold, color: "#fff", fontSize: 14 }}>{photos.length > 1 ? `${i + 1} / ${photos.length}` : ""}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Texte tronqué avec « Lire la suite ». */
export function Expandable({ text, limit = 380 }: { text: string; limit?: number }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const long = text.length > limit + 40;
  const shown = open || !long ? text : text.slice(0, text.lastIndexOf(" ", limit) > 200 ? text.lastIndexOf(" ", limit) : limit).trimEnd() + "…";
  return (
    <View style={{ gap: 12 }}>
      {shown.split(/\n{2,}/).map((t, i) => <Body key={i} style={{ fontSize: 16.5, lineHeight: 27 }}>{t.trim()}</Body>)}
      {long ? (
        <Pressable accessibilityRole="button" onPress={() => setOpen((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44 }}>
          <Text style={{ fontFamily: sansBold, fontSize: 15, color: c.pink }}>{open ? "Réduire" : "Lire la suite"}</Text>
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={c.pink} />
        </Pressable>
      ) : null}
    </View>
  );
}

import React from "react";
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
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
export function Body({ children, style }: { children: React.ReactNode; style?: object }) {
  const { c } = useTheme();
  return <Text style={[{ fontFamily: sans, fontSize: 15, lineHeight: 22, color: c.soft }, style]}>{children}</Text>;
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
export function Cover({ uri, size, radius = 12, label }: { uri?: string | null; size: number | "100%"; radius?: number; label?: string }) {
  const { c } = useTheme();
  const s = size === "100%" ? { width: "100%" as const, aspectRatio: 1 } : { width: size, height: size };
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

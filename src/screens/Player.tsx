import React from "react";
import { Pressable, Text, View } from "react-native";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../player";
import { Banner, Cover, fmtTime } from "../ui";
import Watermark, { wmText } from "../Watermark";
import { sans, serif, useTheme } from "../theme";

export default function Player({ onClose }: { onClose: () => void }) {
  usePreventScreenCapture("player");
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const t = p.now?.album.tracks[p.now.index];
  const pct = p.duration > 0 ? Math.min(1, p.position / p.duration) : 0;
  const Ctl = ({ label, glyph, onPress, big }: { label: string; glyph: string; onPress: () => void; big?: boolean }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={{ width: big ? 72 : 52, height: big ? 72 : 52, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: big ? c.text : "transparent" }}>
      <Text style={{ fontSize: big ? 28 : 26, color: big ? c.bg : c.text }}>{glyph}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: 28 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Réduire le lecteur" onPress={onClose} style={{ width: 44, height: 44, justifyContent: "center" }}>
        <Text style={{ fontSize: 26, color: c.text }}>⌄</Text>
      </Pressable>
      <View style={{ alignItems: "center", marginTop: 12 }}><Cover uri={p.now?.album.cover_url} size={300} radius={20} label="Pochette" /></View>
      <Text style={{ fontFamily: serif, fontSize: 26, color: c.text, marginTop: 28 }}>{t?.title ?? "—"}</Text>
      <Text style={{ fontFamily: sans, fontSize: 15, color: c.soft, marginTop: 4 }}>Viviane Chidid · {p.now?.album.title}</Text>
      {p.error ? <View style={{ marginTop: 12 }}><Banner text={p.error} /></View> : null}
      <View style={{ height: 4, borderRadius: 2, backgroundColor: c.line, marginTop: 24 }}><View style={{ width: `${pct * 100}%`, height: 4, borderRadius: 2, backgroundColor: c.rose }} /></View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
        <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>{fmtTime(p.position)}</Text>
        <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>{fmtTime(p.duration)}</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20, marginTop: 12 }}>
        <Ctl label="Morceau précédent" glyph="⏮" onPress={p.prev} />
        <Ctl big label={p.playing ? "Pause" : "Lecture"} glyph={p.playing ? "❚❚" : "▶"} onPress={p.toggle} />
        <Ctl label="Morceau suivant" glyph="⏭" onPress={p.next} />
      </View>
      <Watermark text={wmText(p.now?.album.fan)} opacity={0.1} />
    </View>
  );
}

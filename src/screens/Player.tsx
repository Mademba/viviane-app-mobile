import React from "react";
import { Pressable, Text, View } from "react-native";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../player";
import { Ionicons } from "@expo/vector-icons";
import { Banner, Cover, Page, cardLook, fmtTime } from "../ui";
import Watermark, { wmText } from "../Watermark";
import { sans, sansBold, serif, useTheme } from "../theme";

export default function Player({ onClose }: { onClose: () => void }) {
  usePreventScreenCapture("player");
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const t = p.now?.album.tracks[p.now.index];
  const pct = p.duration > 0 ? Math.min(1, p.position / p.duration) : 0;
  const accentShadow = c.dark ? {} : { shadowColor: c.rose, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 8 };
  const Ctl = ({ label, icon, onPress, big }: { label: string; icon: "play" | "pause" | "play-skip-back" | "play-skip-forward"; onPress: () => void; big?: boolean }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={[{ width: big ? 76 : 52, height: big ? 76 : 52, borderRadius: 38, alignItems: "center", justifyContent: "center", backgroundColor: big ? c.rose : "transparent" }, big ? accentShadow : {}]}>
      <Ionicons name={icon} size={big ? 32 : 26} color={big ? "#fff" : c.text} />
    </Pressable>
  );
  // Forme d'onde décorative : la partie déjà écoutée est en rose
  const heights = [10, 18, 26, 14, 30, 22, 12, 28, 34, 20, 16, 26, 12, 22, 30, 14, 24, 10, 18, 12, 26, 16, 30, 20];
  return (
    <Page>
    <View style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Réduire le lecteur" onPress={onClose} style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, cardLook(c)]}>
          <Ionicons name="chevron-down" size={22} color={c.text} />
        </Pressable>
        <Text numberOfLines={1} style={{ flex: 1, textAlign: "center", fontFamily: sansBold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: c.gold }}>{p.now?.album.title}</Text>
        <View style={{ width: 44 }} />
      </View>
      <View style={{ alignItems: "center", marginTop: 22 }}>
        <View style={{ borderRadius: 34, overflow: "hidden", shadowColor: "#8e1745", shadowOpacity: c.dark ? 0.4 : 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: 18 }, elevation: 10 }}>
          <Cover uri={p.now?.album.cover_url} size={290} radius={0} label="Pochette" />
        </View>
      </View>
      <View style={{ marginTop: 26, alignItems: "center" }}>
        <Text numberOfLines={2} style={{ fontFamily: serif, fontSize: 30, lineHeight: 33, color: c.text, textAlign: "center" }}>{t?.title ?? "—"}</Text>
        <Text style={{ fontFamily: sans, fontSize: 14, color: c.muted, marginTop: 4 }}>Viviane Chidid{p.now ? ` · titre ${p.now.index + 1} sur ${p.now.album.tracks.length}` : ""}</Text>
      </View>
      {p.error ? <View style={{ marginTop: 12 }}><Banner text={p.error} /></View> : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 36, marginTop: 22 }}>
        {heights.map((h, i) => <View key={i} style={{ flex: 1, height: h, borderRadius: 2, backgroundColor: i / heights.length < pct ? c.rose : (c.dark ? c.line : "#ecd6d0") }} />)}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>{fmtTime(p.position)}</Text>
        <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>{fmtTime(p.duration)}</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 26, marginTop: 14 }}>
        <Ctl label="Morceau précédent" icon="play-skip-back" onPress={p.prev} />
        <Ctl big label={p.playing ? "Pause" : "Lecture"} icon={p.playing ? "pause" : "play"} onPress={p.toggle} />
        <Ctl label="Morceau suivant" icon="play-skip-forward" onPress={p.next} />
      </View>
      <Watermark text={wmText(p.now?.album.fan)} opacity={0.1} />
    </View>
    </Page>
  );
}

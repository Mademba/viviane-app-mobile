import React, { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSecureScreen } from "../secure";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayer } from "../player";
import { Ionicons } from "@expo/vector-icons";
import { absUrl } from "../api";
import { Banner, COL, Cover, cardLook, fmtTime, useColW } from "../ui";
import Watermark, { wmText } from "../Watermark";
import { sans, sansBold, serif, useTheme } from "../theme";

type Icon = React.ComponentProps<typeof Ionicons>["name"];
const BARS = [10, 18, 26, 14, 30, 22, 12, 28, 34, 20, 16, 26, 12, 22, 30, 14, 24, 10, 18, 12, 26, 16, 30, 20, 14, 28, 22, 12, 32, 18, 24, 14, 20, 30, 16, 22];

export default function Player({ onClose }: { onClose: () => void }) {
  useSecureScreen("player");
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const colW = useColW();
  const p = usePlayer();
  const [barW, setBarW] = useState(0);
  const album = p.now?.album;
  const t = album?.tracks[p.now!.index];
  const pct = p.duration > 0 ? Math.min(1, p.position / p.duration) : 0;
  const cover = Math.min(colW - 56, 330);
  const bg = absUrl(album?.cover_url);
  const accentShadow = c.dark ? {} : { shadowColor: c.rose, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 8 };
  const seekBy = (d: number) => p.seek(Math.max(0, Math.min(p.duration || 0, p.position + d)));
  const Ctl = ({ label, icon, onPress, big, off }: { label: string; icon: Icon; onPress: () => void; big?: boolean; off?: boolean }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={off} hitSlop={6}
      style={[{ width: big ? 80 : 50, height: big ? 80 : 50, borderRadius: 40, alignItems: "center", justifyContent: "center", backgroundColor: big ? c.rose : "transparent", opacity: off ? 0.35 : 1 }, big ? accentShadow : {}]}>
      {big && p.loading ? <ActivityIndicator color="#fff" size="large" /> : <Ionicons name={icon} size={big ? 34 : 27} color={big ? "#fff" : c.text} />}
    </Pressable>
  );
  const last = album ? p.now!.index + 1 >= album.tracks.length : true;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Fond : la pochette, floutée, qui se fond dans la page */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 520, overflow: "hidden" }}>
        {bg ? <Image source={{ uri: bg }} blurRadius={45} resizeMode="cover" style={{ width: "100%", height: "100%", opacity: c.dark ? 0.5 : 0.65 }} /> : <LinearGradient colors={[c.dark ? "rgba(221,70,119,.35)" : "rgba(196,44,99,.28)", "rgba(0,0,0,0)"]} style={{ flex: 1 }} />}
        <LinearGradient colors={[`${c.bg}00`, c.bg]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 300 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32, paddingHorizontal: 24 }, COL]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Réduire le lecteur" onPress={onClose} style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: c.card }, cardLook(c)]}>
            <Ionicons name="chevron-down" size={22} color={c.text} />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center", paddingHorizontal: 8 }}>
            <Text style={{ fontFamily: sansBold, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: c.muted }}>Lecture en cours</Text>
            <Text numberOfLines={1} style={{ fontFamily: sansBold, fontSize: 13, color: c.text, marginTop: 2 }}>{album?.title}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <View style={{ alignItems: "center", marginTop: 24 }}>
          <View style={{ borderRadius: 30, overflow: "hidden", shadowColor: "#8e1745", shadowOpacity: c.dark ? 0.45 : 0.32, shadowRadius: 26, shadowOffset: { width: 0, height: 18 }, elevation: 12 }}>
            <Cover uri={album?.cover_url} size={cover} radius={0} label="Pochette" />
          </View>
        </View>

        <View style={{ marginTop: 26, alignItems: "center" }}>
          <Text numberOfLines={2} style={{ fontFamily: serif, fontSize: 31, lineHeight: 34, color: c.text, textAlign: "center" }}>{t?.title ?? "—"}</Text>
          <Text style={{ fontFamily: sans, fontSize: 14, color: c.muted, marginTop: 4 }}>Viviane Chidid{album ? ` · titre ${p.now!.index + 1} sur ${album.tracks.length}` : ""}</Text>
        </View>
        {p.error ? <View style={{ marginTop: 12 }}><Banner text={p.error} /></View> : null}

        {/* Barre de progression : touchez-la pour vous placer dans le morceau */}
        <Pressable accessibilityRole="adjustable" accessibilityLabel="Position dans le morceau" onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
          onPress={(e) => { if (barW > 0 && p.duration > 0) p.seek(Math.max(0, Math.min(1, e.nativeEvent.locationX / barW)) * p.duration); }}
          style={{ flexDirection: "row", alignItems: "flex-end", gap: 3, height: 44, marginTop: 24 }}>
          {BARS.map((h, i) => <View key={i} style={{ flex: 1, height: h, borderRadius: 2, backgroundColor: (i + 0.5) / BARS.length <= pct ? c.rose : (c.dark ? c.line : "#ecd6d0") }} />)}
        </Pressable>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
          <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>{fmtTime(p.position)}</Text>
          <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>{fmtTime(p.duration)}</Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingHorizontal: 2 }}>
          <Ctl label="Morceau précédent" icon="play-skip-back" onPress={p.prev} />
          <Ctl label="Reculer de 10 secondes" icon="play-back-outline" onPress={() => seekBy(-10)} />
          <Ctl big label={p.playing ? "Pause" : "Lecture"} icon={p.playing ? "pause" : "play"} onPress={p.toggle} />
          <Ctl label="Avancer de 10 secondes" icon="play-forward-outline" onPress={() => seekBy(10)} />
          <Ctl label="Morceau suivant" icon="play-skip-forward" onPress={p.next} off={last} />
        </View>

        {/* File d'écoute : les titres de l'album */}
        {album && album.tracks.length > 1 ? (
          <View style={{ marginTop: 30 }}>
            <Text style={{ fontFamily: serif, fontSize: 22, color: c.text, marginBottom: 8 }}>Titres de l'album</Text>
            {album.tracks.map((tr, i) => {
              const cur = i === p.now!.index;
              return (
                <Pressable key={tr.id} accessibilityRole="button" accessibilityLabel={`Lire ${tr.title}`} disabled={!tr.available} onPress={() => (cur ? p.toggle() : void p.play(album, i))}
                  style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, marginBottom: 8, opacity: tr.available ? 1 : 0.45 }, cur ? { backgroundColor: c.dark ? "rgba(221,70,119,.16)" : "#fbe3e8" } : cardLook(c)]}>
                  <View style={{ width: 26, alignItems: "center" }}>
                    {cur ? <Ionicons name={p.playing ? "volume-medium" : "play"} size={18} color={c.rose} /> : <Text style={{ fontFamily: sansBold, fontSize: 14, color: c.muted }}>{i + 1}</Text>}
                  </View>
                  <Text numberOfLines={1} style={{ flex: 1, fontFamily: cur ? sansBold : sans, fontSize: 15, color: cur ? c.rose : c.text }}>{tr.title}</Text>
                  {!tr.available ? <Ionicons name="lock-closed-outline" size={16} color={c.muted} /> : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
      <Watermark text={wmText(album?.fan)} opacity={0.1} />
    </View>
  );
}

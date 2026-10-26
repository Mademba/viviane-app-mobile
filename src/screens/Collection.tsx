import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LibAlbum } from "../api";
import { ui } from "../nav";
import { usePlayer } from "../player";
import { BackBar, Banner, Body, Button, NaturalImage, fmtDate } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

/** Dossier d'un album ou single acheté : pochette, puis tracklist. */
export default function Collection({ route, navigation }: { route: { params: { album: LibAlbum } }; navigation: { goBack: () => void } }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const a = route.params.album;
  const kind = a.kind === "single" ? "Single" : "Album";
  const first = a.tracks.findIndex((t) => t.available);
  const year = a.release_date ? new Date(a.release_date).getFullYear() : null;
  const start = async (i: number) => { await p.play(a, i); ui.openPlayer(); };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 48 }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: 10 }}><BackBar onBack={navigation.goBack} label="Ma musique" /></View>
      <NaturalImage uri={a.cover_url} min={0.7} max={1.2} />
      <View style={{ paddingHorizontal: 22, paddingTop: 22 }}>
        <Text style={{ fontFamily: sansBold, fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: c.gold }}>{kind}{year ? ` · ${year}` : ""}</Text>
        <Text style={{ fontFamily: serif, fontSize: 38, lineHeight: 40, color: c.text, marginTop: 8 }}>{a.title}</Text>
        <Text style={{ fontFamily: sans, fontSize: 14, color: c.muted, marginTop: 6 }}>{a.tracks.length} titre{a.tracks.length > 1 ? "s" : ""}</Text>

        {!a.released ? (
          <View style={{ marginTop: 18 }}><Banner kind="info" text={`Disponible le ${a.release_date ? fmtDate(a.release_date, true) : "jour de la sortie"} : l'écoute s'ouvrira automatiquement.`} /></View>
        ) : first >= 0 ? (
          <View style={{ marginTop: 18 }}><Button label="▶  Tout lire" onPress={() => void start(first)} /></View>
        ) : <View style={{ marginTop: 18 }}><Body>Les morceaux arrivent bientôt.</Body></View>}
        {p.error ? <View style={{ marginTop: 12 }}><Banner text={p.error} /></View> : null}

        <View style={{ marginTop: 18 }}>
          {a.tracks.map((t, i) => {
            const active = p.now?.album.album_id === a.album_id && p.now.index === i;
            const ok = t.available && a.released;
            return (
              <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`Écouter ${t.title}`} disabled={!ok} onPress={() => void start(i)}
                style={{ minHeight: 58, flexDirection: "row", alignItems: "center", gap: 14, borderBottomWidth: 1, borderBottomColor: c.line, opacity: ok ? 1 : 0.5 }}>
                <Text style={{ width: 24, textAlign: "right", fontFamily: sans, color: active ? c.rose : c.muted }}>{String(t.position).padStart(2, "0")}</Text>
                <Text style={{ flex: 1, fontFamily: active ? sansBold : sans, fontSize: 16.5, color: active ? c.rose : c.text }}>{t.title}</Text>
                <Ionicons name={!ok ? "lock-closed-outline" : active && p.playing ? "pause" : "play"} size={18} color={ok ? c.rose : c.muted} />
              </Pressable>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

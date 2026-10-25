import React, { useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Article as A } from "../api";
import { go } from "../nav";
import { BackBar, Button, Expandable, FitImage, Lightbox, NaturalImage, fmtDate, openLink } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

function InlineVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = false; });
  return <VideoView player={player} nativeControls fullscreenOptions={{ enable: true }} contentFit="contain" style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 14, backgroundColor: "#000" }} />;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: 28 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <Text style={{ fontFamily: sansBold, fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: c.gold }}>{title}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
      </View>
      {children}
    </View>
  );
}

export default function Article({ route, navigation }: { route: { params: { article: A } }; navigation: { goBack: () => void } }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const a = route.params.article;
  const photos = (a.media ?? []).filter((m) => m.type === "photo" && m.url !== a.cover_url).map((m) => m.url);
  const files = (a.media ?? []).filter((m) => m.type === "video").map((m) => m.url);
  const videos = a.youtube_urls ?? [];
  const [view, setView] = useState<number | null>(null);
  const text = (a.content ?? "").replace(/\r\n/g, "\n").trim();
  const gw = width - 44;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* 1. Photo de couverture entière, sans texte dessus */}
      <View>
        <NaturalImage uri={a.cover_url} min={0.9} max={1.5} />
        <View style={{ position: "absolute", left: 20, right: 20, top: insets.top + 8 }}><BackBar onBack={navigation.goBack} label="Actualités" /></View>
      </View>

      {/* 2. Titre, date, résumé */}
      <View style={{ paddingHorizontal: 22, paddingTop: 22 }}>
        <Text style={{ fontFamily: sansBold, fontSize: 12, letterSpacing: 2.4, textTransform: "uppercase", color: c.gold }}>{fmtDate(a.published_at, true)}</Text>
        <Text style={{ fontFamily: serif, fontSize: 34, lineHeight: 38, color: c.text, marginTop: 10 }}>{a.title}</Text>
        {a.excerpt ? <Text style={{ fontFamily: sans, fontSize: 18, lineHeight: 27, color: c.soft, marginTop: 14 }}>{a.excerpt}</Text> : null}
        <View style={{ height: 3, width: 48, borderRadius: 2, backgroundColor: c.rose, marginTop: 20 }} />

        {/* 3. Boutons d'action */}
        {a.is_album || (a.is_upcoming_event && (a.ticket_url || a.organizer_contact)) ? (
          <View style={{ gap: 10, marginTop: 22 }}>
            {a.is_album ? <Button label="Voir l'album" onPress={() => go("Album", { id: a.album_slug ?? a.id })} /> : null}
            {a.is_upcoming_event && a.ticket_url ? <Button label="Billetterie" onPress={() => void openLink(a.ticket_url!)} /> : null}
            {a.is_upcoming_event && a.organizer_contact ? <Button ghost label="Contacter les organisateurs" onPress={() => void openLink(/^(https?:|mailto:|tel:)/i.test(a.organizer_contact!) ? a.organizer_contact! : /@/.test(a.organizer_contact!) ? `mailto:${a.organizer_contact}` : `tel:${a.organizer_contact}`)} /> : null}
          </View>
        ) : null}

        {/* 4. Texte (début + « Lire la suite ») */}
        {text ? <View style={{ marginTop: 26 }}><Expandable text={text} /></View> : null}

        {/* 5. Vidéos */}
        {files.length || videos.length ? (
          <Section title="Vidéos">
            <View style={{ gap: 12 }}>
              {files.map((u) => <InlineVideo key={u} uri={u} />)}
              {videos.map((u, i) => (
                <Pressable key={u} accessibilityRole="button" onPress={() => void openLink(u)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
                  <Ionicons name="logo-youtube" size={28} color="#ff0033" />
                  <Text style={{ flex: 1, fontFamily: sansBold, color: c.text }}>{videos.length > 1 ? `Regarder la vidéo ${i + 1}` : "Regarder la vidéo"}</Text>
                  <Ionicons name="play-circle-outline" size={22} color={c.muted} />
                </Pressable>
              ))}
            </View>
          </Section>
        ) : null}

        {/* 6. Galerie : on touche une photo pour la voir en grand */}
        {photos.length ? (
          <Section title={`Photos (${photos.length})`}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={gw * 0.86 + 12} decelerationRate="fast" style={{ marginHorizontal: -22 }} contentContainerStyle={{ paddingHorizontal: 22, gap: 12 }}>
              {photos.map((u, k) => (
                <View key={u} style={{ width: gw * 0.86 }}><FitImage uri={u} ratio={4 / 3} radius={14} onPress={() => setView(k)} /></View>
              ))}
            </ScrollView>
            <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted, marginTop: 8 }}>Touchez une photo pour l'agrandir ; glissez pour voir les autres.</Text>
          </Section>
        ) : null}
      </View>
      <Lightbox photos={photos} start={view} onClose={() => setView(null)} />
    </ScrollView>
  );
}

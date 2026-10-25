import React from "react";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Article as A } from "../api";
import { go } from "../nav";
import { BackBar, Body, Button, Cover, fmtDate, openLink } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

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
  const photos = (a.media ?? []).filter((m) => m.type === "photo" && m.url !== a.cover_url);
  const videos = a.youtube_urls ?? [];
  const heroH = Math.round(width * 0.8);
  // Le contenu est découpé en paragraphes pour une lecture aérée
  const paras = (a.content ?? "").split(/\n{2,}|\r\n\r\n/).map((t) => t.trim()).filter(Boolean);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* 1. Photo de couverture, seule, sans texte dessus */}
      <View style={{ width: "100%", height: heroH + insets.top * 0.4, backgroundColor: c.card }}>
        <Cover uri={a.cover_url} size="fill" radius={0} />
        <LinearGradient colors={["rgba(0,0,0,.45)", "rgba(0,0,0,0)"]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: insets.top + 80 }} pointerEvents="none" />
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

        {/* 4. Texte */}
        {paras.length ? (
          <View style={{ marginTop: 26, gap: 16 }}>
            {paras.map((t, i) => <Body key={i} style={{ fontSize: 16.5, lineHeight: 27 }}>{t}</Body>)}
          </View>
        ) : null}

        {/* 5. Vidéos */}
        {videos.length ? (
          <Section title="Vidéos">
            <View style={{ gap: 10 }}>
              {videos.map((u, i) => (
                <Pressable key={u} accessibilityRole="button" onPress={() => void openLink(u)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
                  <Ionicons name="logo-youtube" size={28} color="#ff0033" />
                  <Text style={{ flex: 1, fontFamily: sansBold, color: c.text }}>{videos.length > 1 ? `Regarder la vidéo ${i + 1}` : "Regarder la vidéo"}</Text>
                  <Ionicons name="open-outline" size={18} color={c.muted} />
                </Pressable>
              ))}
            </View>
          </Section>
        ) : null}

        {/* 6. Galerie photos */}
        {photos.length ? (
          <Section title="Galerie">
            <View style={{ gap: 12 }}>
              {photos.map((m) => <Image key={m.url} source={{ uri: m.url }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: c.card }} resizeMode="cover" />)}
            </View>
          </Section>
        ) : null}
      </View>
    </ScrollView>
  );
}

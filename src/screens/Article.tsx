import React from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Article as A } from "../api";
import { go } from "../nav";
import { BackBar, Body, Button, Cover, fmtDate, openLink } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

export default function Article({ route, navigation }: { route: { params: { article: A } }; navigation: { goBack: () => void } }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const a = route.params.article;
  const photos = (a.media ?? []).filter((m) => m.type === "photo");
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ height: 320 }}>
        <Cover uri={a.cover_url} size="100%" radius={0} />
        <LinearGradient colors={["rgba(25,1,4,.2)", c.bg]} locations={[0.35, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
        <View style={{ position: "absolute", left: 20, right: 20, top: insets.top + 8 }}><BackBar onBack={navigation.goBack} label="Actualités" /></View>
        <View style={{ position: "absolute", left: 20, right: 20, bottom: 14 }}>
          <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 2.4, textTransform: "uppercase", color: c.gold }}>{fmtDate(a.published_at, true)}</Text>
          <Text style={{ fontFamily: serif, fontSize: 32, color: c.text, lineHeight: 35, marginTop: 6 }}>{a.title}</Text>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, gap: 16 }}>
        {a.excerpt ? <Text style={{ fontFamily: sans, fontSize: 17, lineHeight: 26, color: c.text }}>{a.excerpt}</Text> : null}
        {a.content ? <Body>{a.content}</Body> : null}
        {a.is_album ? <Button label="Voir l'album" onPress={() => go("Album", { id: a.album_slug ?? a.id })} /> : null}
        {a.is_upcoming_event && a.ticket_url ? <Button label="Billetterie" onPress={() => void openLink(a.ticket_url!)} /> : null}
        {a.is_upcoming_event && a.organizer_contact ? <Button ghost label="Contacter les organisateurs" onPress={() => void openLink(/^(https?:|mailto:|tel:)/i.test(a.organizer_contact!) ? a.organizer_contact! : /@/.test(a.organizer_contact!) ? `mailto:${a.organizer_contact}` : `tel:${a.organizer_contact}`)} /> : null}
        {(a.youtube_urls ?? []).map((u) => (
          <Pressable key={u} accessibilityRole="button" onPress={() => void openLink(u)} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: c.card }}>
            <Ionicons name="logo-youtube" size={26} color="#ff0033" />
            <Text style={{ flex: 1, fontFamily: sansBold, color: c.text }}>Regarder la vidéo</Text>
            <Ionicons name="open-outline" size={18} color={c.muted} />
          </Pressable>
        ))}
        {photos.map((m) => <Image key={m.url} source={{ uri: m.url }} style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 12, backgroundColor: c.card }} resizeMode="cover" />)}
      </View>
    </ScrollView>
  );
}

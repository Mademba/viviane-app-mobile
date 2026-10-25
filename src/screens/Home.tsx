import React from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../config";
import { useContent } from "../content";
import { usePlayer } from "../player";
import { Body, Button, Cover, Eyebrow, fmtDate, fmtTime } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

const open = (path: string) => WebBrowser.openBrowserAsync(`${API_URL}${path}`, { toolbarColor: "#190104", controlsColor: "#e3ad4b" });

function BannerVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} nativeControls={false} contentFit="cover" style={{ width: "100%", height: "100%" }} />;
}

export default function Home({ goTo }: { goTo: (tab: string) => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, busy, load, err } = useContent();
  const p = usePlayer();
  const st = data?.settings;
  const articles = data?.articles ?? [];
  const release = articles.find((a) => a.is_album);
  const news = articles.filter((a) => a !== release).slice(0, 8);
  const showBanner = Boolean(st && st.home_media_type !== "none" && st.home_media_url);
  const bannerGo = () => {
    if (!st) return;
    if (st.home_button_target === "url" && st.home_button_url) void open(st.home_button_url.startsWith("/") ? st.home_button_url : `/${st.home_button_url}`);
    else if (st.home_button_target === "music") goTo("Ma musique");
    else if (st.home_button_target === "agenda") goTo("Agenda");
    else if (st.home_button_target === "news") goTo("Actualités");
  };
  const last = p.last;
  const lastTrack = last?.album.tracks[last.index];
  const pct = last && last.duration > 0 ? Math.min(1, last.position / last.duration) : 0;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={c.rose} />}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Eyebrow>Viviane Chidid</Eyebrow>
          <Text style={{ fontFamily: serif, fontSize: 30, color: c.text, marginTop: 6 }}>Accueil</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Voir les actualités" onPress={() => goTo("Actualités")}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="notifications-outline" size={20} color={c.text} />
        </Pressable>
      </View>

      {err && !data ? <Text style={{ fontFamily: sans, color: c.pink, marginTop: 16 }}>{err}</Text> : null}

      {showBanner ? (
        <View style={{ marginTop: 22, borderRadius: 18, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <View style={{ aspectRatio: 16 / 10 }}>
            {st!.home_media_type === "video" ? <BannerVideo uri={st!.home_media_url!} /> : <Cover uri={st!.home_media_url} size="100%" radius={0} />}
          </View>
          {st!.home_title || st!.home_text || (st!.home_button_label && st!.home_button_target !== "none") ? (
            <View style={{ padding: 16, gap: 8 }}>
              {st!.home_title ? <Text style={{ fontFamily: serif, fontSize: 24, color: c.text }}>{st!.home_title}</Text> : null}
              {st!.home_text ? <Body>{st!.home_text}</Body> : null}
              {st!.home_button_label && st!.home_button_target !== "none" ? <Button label={st!.home_button_label} onPress={bannerGo} /> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {release ? (
        <View style={{ marginTop: 22, height: 250, borderRadius: 18, overflow: "hidden", backgroundColor: c.card }}>
          <View style={{ position: "absolute", inset: 0 } as never}><Cover uri={release.cover_url} size="100%" radius={0} /></View>
          <LinearGradient colors={["rgba(25,1,4,0)", "rgba(25,1,4,.88)"]} locations={[0.35, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ flex: 1, padding: 20, justifyContent: "flex-end" }}>
            <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 2.6, textTransform: "uppercase", color: "#e3ad4b" }}>Dernière sortie</Text>
            <Text numberOfLines={2} style={{ fontFamily: serif, fontSize: 32, lineHeight: 34, color: "#fff0ef", marginTop: 6 }}>{release.title}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable accessibilityRole="button" onPress={() => goTo("Ma musique")} style={{ height: 44, paddingHorizontal: 20, borderRadius: 22, backgroundColor: c.rose, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={{ fontFamily: sansBold, fontSize: 13, letterSpacing: 1.3, textTransform: "uppercase", color: "#fff" }}>Écouter</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => open(`/album/${release.album_slug ?? release.id}`)} style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,240,239,.55)", justifyContent: "center" }}>
                <Text style={{ fontFamily: sansBold, fontSize: 13, letterSpacing: 1.3, textTransform: "uppercase", color: "#fff0ef" }}>Détails</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {last && lastTrack ? (
        <>
          <Text style={{ fontFamily: serif, fontSize: 20, color: c.text, marginTop: 26 }}>Reprendre l'écoute</Text>
          <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 14, padding: 12, borderRadius: 14, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
            <Cover uri={last.album.cover_url} size={56} radius={10} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: sansBold, fontSize: 15, color: c.text }}>{lastTrack.title}</Text>
              <Text numberOfLines={1} style={{ fontFamily: sans, fontSize: 13, color: c.muted, marginTop: 3 }}>{last.album.title} · {fmtTime(last.position)} sur {fmtTime(last.duration)}</Text>
              <View style={{ marginTop: 8, height: 3, borderRadius: 2, backgroundColor: c.line }}><View style={{ width: `${pct * 100}%`, height: 3, borderRadius: 2, backgroundColor: c.rose }} /></View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Reprendre la lecture" onPress={() => void p.resume()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.text, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="play" size={18} color={c.bg} />
            </Pressable>
          </View>
        </>
      ) : null}

      {news.length ? (
        <>
          <View style={{ marginTop: 26, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: serif, fontSize: 20, color: c.text }}>Actualités</Text>
            <Pressable accessibilityRole="button" onPress={() => goTo("Actualités")} hitSlop={12}><Text style={{ fontFamily: sans, fontSize: 13, color: c.pink }}>Tout voir</Text></Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
            {news.map((a) => (
              <Pressable key={a.id} accessibilityRole="button" onPress={() => open(`/actualite/${a.slug}`)} style={{ width: 170 }}>
                <View style={{ height: 96, borderRadius: 12, overflow: "hidden" }}><Cover uri={a.cover_url} size="100%" radius={0} /></View>
                <Text numberOfLines={2} style={{ fontFamily: sansBold, fontSize: 14, color: c.text, marginTop: 8, lineHeight: 18 }}>{a.title}</Text>
                <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted, marginTop: 2 }}>{fmtDate(a.published_at)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
    </ScrollView>
  );
}

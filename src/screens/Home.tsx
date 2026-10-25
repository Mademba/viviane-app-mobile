import React, { useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../config";
import { go, goTab } from "../nav";
import { openArticle, openTickets } from "./Feed";
import type { Article } from "../api";
import { useContent } from "../content";
import { usePlayer } from "../player";
import { Body, Button, Cover, FitImage, Eyebrow, ThemeButton, fmtDate, fmtTime, money, openLink } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

function BannerVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} nativeControls={false} contentFit="cover" style={{ width: "100%", height: "100%" }} />;
}

function NewsCarousel({ items }: { items: Article[] }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const cardW = width - 32;
  const gap = 14;
  const ref = useRef<{ scrollTo: (o: { x: number; animated?: boolean }) => void } | null>(null);
  const idx = useRef(0);
  const pause = useRef(0);
  const [cur, setCur] = useState(0);
  // Défilement automatique, suspendu quand on touche la liste
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => {
      if (Date.now() < pause.current) return;
      idx.current = (idx.current + 1) % items.length;
      ref.current?.scrollTo({ x: idx.current * (cardW + gap), animated: true });
      setCur(idx.current);
    }, 4500);
    return () => clearInterval(t);
  }, [items.length, cardW]);
  return (
    <View style={{ marginTop: 14 }}>
      <ScrollView ref={ref as never} horizontal showsHorizontalScrollIndicator={false} snapToInterval={cardW + gap} decelerationRate="fast" style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ paddingHorizontal: 16, gap }}
        onScrollBeginDrag={() => { pause.current = Date.now() + 9000; }}
        onMomentumScrollEnd={(e) => { const i = Math.round(e.nativeEvent.contentOffset.x / (cardW + gap)); idx.current = i; setCur(i); }}>
        {items.map((a) => (
          <Pressable key={a.id} accessibilityRole="button" onPress={() => openArticle(a)} style={{ width: cardW, borderRadius: 20, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
            <FitImage uri={a.cover_url} ratio={1.8} />
            <View style={{ padding: 16, gap: 6, minHeight: 104 }}>
              <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: c.gold }}>{fmtDate(a.published_at)}</Text>
              <Text numberOfLines={2} style={{ fontFamily: serif, fontSize: 23, lineHeight: 26, color: c.text }}>{a.title}</Text>
              {a.excerpt ? <Text numberOfLines={2} style={{ fontFamily: sans, fontSize: 14, lineHeight: 20, color: c.muted }}>{a.excerpt}</Text> : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {items.length > 1 ? (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12 }}>
          {items.map((a, i) => <View key={a.id} style={{ width: i === cur ? 20 : 7, height: 7, borderRadius: 4, backgroundColor: i === cur ? c.rose : c.line }} />)}
        </View>
      ) : null}
    </View>
  );
}

export default function Home() {
  const { height } = useWindowDimensions();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, busy, load, err } = useContent();
  const p = usePlayer();
  const st = data?.settings;
  const articles = data?.articles ?? [];
  const release = articles.find((a) => a.is_album);
  const news = articles.filter((a) => a !== release).slice(0, 8);
  const showBanner = Boolean(st && st.home_media_type !== "none" && st.home_media_url);
  const goTo = goTab;
  const bannerGo = () => {
    if (!st) return;
    if (st.home_button_target === "url" && st.home_button_url) void openLink(/^https?:/i.test(st.home_button_url) ? st.home_button_url : `${API_URL}${st.home_button_url.startsWith("/") ? "" : "/"}${st.home_button_url}`);
    else if (st.home_button_target === "music") goTo("Ma musique");
    else if (st.home_button_target === "agenda") goTo("Agenda");
    else if (st.home_button_target === "news") goTo("Actualités");
  };
  const nextEvent = (data?.events ?? []).find((e) => new Date(e.starts_at).getTime() >= Date.now() - 6 * 3600e3);
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
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voir les actualités" onPress={() => goTo("Actualités")}
            style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="notifications-outline" size={20} color={c.text} />
          </Pressable>
          <ThemeButton />
        </View>
      </View>

      {err && !data ? <Text style={{ fontFamily: sans, color: c.pink, marginTop: 16 }}>{err}</Text> : null}

      {showBanner ? (
        <View style={{ marginTop: 22, borderRadius: 18, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <View style={{ aspectRatio: 4 / 3 }}>
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
        <View style={{ marginTop: 22, height: Math.max(360, Math.round(height * 0.5)), borderRadius: 22, overflow: "hidden", backgroundColor: c.card }}>
          <View style={{ position: "absolute", inset: 0 } as never}><Cover uri={release.cover_url} size="100%" radius={0} /></View>
          <LinearGradient colors={["rgba(25,1,4,0)", "rgba(25,1,4,.88)"]} locations={[0.35, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
          <View style={{ flex: 1, padding: 20, justifyContent: "flex-end" }}>
            <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 2.6, textTransform: "uppercase", color: "#e3ad4b" }}>Dernière sortie</Text>
            <Text numberOfLines={2} style={{ fontFamily: serif, fontSize: 40, lineHeight: 42, color: "#fff0ef", marginTop: 8 }}>{release.title}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <Pressable accessibilityRole="button" onPress={() => goTo("Ma musique")} style={{ height: 50, paddingHorizontal: 24, borderRadius: 25, backgroundColor: c.rose, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={{ fontFamily: sansBold, fontSize: 13, letterSpacing: 1.3, textTransform: "uppercase", color: "#fff" }}>Écouter</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => openArticle(release)} style={{ height: 50, paddingHorizontal: 22, borderRadius: 25, borderWidth: 1, borderColor: "rgba(255,240,239,.55)", justifyContent: "center" }}>
                <Text style={{ fontFamily: sansBold, fontSize: 13, letterSpacing: 1.3, textTransform: "uppercase", color: "#fff0ef" }}>Détails</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {nextEvent ? (
        <>
          <Text style={{ fontFamily: serif, fontSize: 20, color: c.text, marginTop: 32 }}>Prochain événement</Text>
          <Pressable accessibilityRole="button" onPress={() => goTo("Agenda")} style={{ marginTop: 12, borderRadius: 16, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
            {nextEvent.poster_url ? <View style={{ height: 240 }}><Cover uri={nextEvent.poster_url} size="100%" radius={0} /></View> : null}
            <View style={{ padding: 18, gap: 6 }}>
              <Text style={{ fontFamily: sansBold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: c.gold }}>{fmtDate(nextEvent.starts_at, true)}</Text>
              <Text style={{ fontFamily: serif, fontSize: 26, lineHeight: 29, color: c.text }}>{nextEvent.title}</Text>
              <Text style={{ fontFamily: sans, fontSize: 15, color: c.soft }}>{nextEvent.venue}, {nextEvent.city}{nextEvent.ticket_price ? ` · dès ${money(nextEvent.ticket_price, nextEvent.currency)}` : ""}</Text>
              {nextEvent.tickets_enabled ? <Button label="Acheter un ticket" onPress={() => openTickets(nextEvent)} style={{ marginTop: 10 }} /> : null}
            </View>
          </Pressable>
        </>
      ) : null}

      {last && lastTrack ? (
        <>
          <Text style={{ fontFamily: serif, fontSize: 22, color: c.text, marginTop: 32 }}>Reprendre l'écoute</Text>
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
          <View style={{ marginTop: 32, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: serif, fontSize: 22, color: c.text }}>Actualités</Text>
            <Pressable accessibilityRole="button" onPress={() => goTo("Actualités")} hitSlop={12}><Text style={{ fontFamily: sans, fontSize: 13, color: c.pink }}>Tout voir</Text></Pressable>
          </View>
          <NewsCarousel items={news} />
        </>
      ) : null}
    </ScrollView>
  );
}

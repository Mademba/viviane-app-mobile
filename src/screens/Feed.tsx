import React from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../config";
import type { Article, EventItem } from "../api";
import { useContent } from "../content";
import { useVideoPlayer, VideoView } from "expo-video";
import { Banner, Body, Button, Cover, Eyebrow, H1, fmtDate } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

const open = (path: string) => WebBrowser.openBrowserAsync(`${API_URL}${path}`, { toolbarColor: "#190104", controlsColor: "#e3ad4b" });
const articlePath = (a: Article) => (a.is_album ? `/album/${a.album_slug ?? a.id}` : `/actualite/${a.slug}`);
const eventPath = (e: EventItem) => `/billetterie/${e.slug ?? e.id}`;

function Screen({ title, children, refresh, busy }: { title: string; children: React.ReactNode; refresh: () => void; busy: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 32, gap: 14 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor={c.rose} />}>
      <View style={{ gap: 4 }}><Eyebrow>Viviane Chidid</Eyebrow><H1>{title}</H1></View>
      {children}
    </ScrollView>
  );
}

export function News() {
  const { c } = useTheme();
  const { data, err, busy, load } = useContent();
  const list = data?.articles ?? [];
  const top = list.find((a) => a.featured) ?? list[0];
  const rest = list.filter((a) => a !== top);
  return (
    <Screen title="Actualités" refresh={load} busy={busy}>
      {err ? <Banner text={err} /> : null}
      {!data && !err ? <ActivityIndicator color={c.rose} /> : null}
      {top ? (
        <Pressable accessibilityRole="button" onPress={() => open(articlePath(top))} style={{ borderRadius: 18, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <Cover uri={top.cover_url} size="100%" radius={0} />
          <View style={{ padding: 16, gap: 8 }}>
            <Text style={{ fontFamily: serif, fontSize: 22, color: c.text }}>{top.title}</Text>
            {top.excerpt ? <Body style={{ fontSize: 14 }}>{top.excerpt}</Body> : null}
            <Text style={{ fontFamily: sansBold, color: c.pink, fontSize: 13 }}>{top.is_album ? "Voir l'album" : "Lire la suite"}</Text>
          </View>
        </Pressable>
      ) : null}
      {rest.map((a) => (
        <Pressable key={a.id} accessibilityRole="button" onPress={() => open(articlePath(a))} style={{ flexDirection: "row", gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
          <Cover uri={a.cover_url} size={92} />
          <View style={{ flex: 1, justifyContent: "center", gap: 4 }}>
            <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 2, color: c.gold, textTransform: "uppercase" }}>{fmtDate(a.published_at)}</Text>
            <Text style={{ fontFamily: sansBold, fontSize: 16, color: c.text }}>{a.title}</Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

export function Agenda() {
  const { c } = useTheme();
  const { data, err, busy, load } = useContent();
  const now = Date.now();
  const events = (data?.events ?? []).filter((e) => new Date(e.starts_at).getTime() >= now - 6 * 3600e3);
  return (
    <Screen title="Agenda" refresh={load} busy={busy}>
      {err ? <Banner text={err} /> : null}
      {!data && !err ? <ActivityIndicator color={c.rose} /> : null}
      {data && !events.length ? <Body>Aucun événement à venir pour le moment.</Body> : null}
      {events.map((e) => {
        const d = new Date(e.starts_at);
        return (
          <View key={e.id} style={{ borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, padding: 14, gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <View style={{ width: 62, borderRadius: 12, backgroundColor: c.rose, alignItems: "center", justifyContent: "center", paddingVertical: 8 }}>
                <Text style={{ fontFamily: serif, fontSize: 28, color: c.onRose }}>{d.getDate()}</Text>
                <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 1.5, color: c.onRose, textTransform: "uppercase" }}>{d.toLocaleDateString("fr-FR", { month: "short" })}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontFamily: sansBold, fontSize: 16, color: c.text }}>{e.title}</Text>
                <Text style={{ fontFamily: sans, fontSize: 13, color: c.muted }}>{e.venue}, {e.city}</Text>
                {e.ticket_price ? <Text style={{ fontFamily: sansBold, fontSize: 13, color: c.gold }}>À partir de {Number(e.ticket_price).toLocaleString("fr-FR")} {e.currency}</Text> : null}
              </View>
            </View>
            {e.tickets_enabled ? <Button label="Acheter un ticket" onPress={() => open(eventPath(e))} /> : null}
          </View>
        );
      })}
    </Screen>
  );
}

function BannerVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} nativeControls={false} contentFit="cover" style={{ width: "100%", height: "100%" }} />;
}

export function Home({ goTo }: { goTo: (tab: string) => void }) {
  const { c } = useTheme();
  const { data, busy, load } = useContent();
  const st = data?.settings;
  const showBanner = st && st.home_media_type !== "none" && st.home_media_url;
  const onBanner = () => {
    if (!st) return;
    if (st.home_button_target === "url" && st.home_button_url) void open(st.home_button_url.startsWith("/") ? st.home_button_url : `/${st.home_button_url}`);
    else if (st.home_button_target === "music") goTo("Ma musique");
    else if (st.home_button_target === "agenda") goTo("Agenda");
    else if (st.home_button_target === "news") goTo("Actualités");
  };
  const next = (data?.events ?? []).find((e) => new Date(e.starts_at).getTime() >= Date.now());
  const latest = data?.articles?.[0];
  return (
    <Screen title="Accueil" refresh={load} busy={busy}>
      {showBanner ? (
        <View style={{ borderRadius: 18, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <View style={{ aspectRatio: 16 / 10, backgroundColor: c.card }}>
            {st!.home_media_type === "video" ? <BannerVideo uri={st!.home_media_url!} /> : <Cover uri={st!.home_media_url} size="100%" radius={0} />}
          </View>
          {st!.home_title || st!.home_text || (st!.home_button_label && st!.home_button_target !== "none") ? (
            <View style={{ padding: 16, gap: 8 }}>
              {st!.home_title ? <Text style={{ fontFamily: serif, fontSize: 24, color: c.text }}>{st!.home_title}</Text> : null}
              {st!.home_text ? <Body>{st!.home_text}</Body> : null}
              {st!.home_button_label && st!.home_button_target !== "none" ? <Button label={st!.home_button_label} onPress={onBanner} /> : null}
            </View>
          ) : null}
        </View>
      ) : <Body>Bienvenue dans l'univers de Viviane.</Body>}
      <Button label="Ma musique" onPress={() => goTo("Ma musique")} />
      {latest ? (
        <Pressable onPress={() => open(articlePath(latest))} accessibilityRole="button" style={{ borderRadius: 16, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <Cover uri={latest.cover_url} size="100%" radius={0} />
          <View style={{ padding: 14 }}><Eyebrow>À la une</Eyebrow><Text style={{ fontFamily: serif, fontSize: 22, color: c.text, marginTop: 6 }}>{latest.title}</Text></View>
        </Pressable>
      ) : null}
      {next ? (
        <Pressable onPress={() => goTo("Agenda")} accessibilityRole="button" style={{ borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, padding: 14, gap: 4 }}>
          <Eyebrow>Prochain événement</Eyebrow>
          <Text style={{ fontFamily: sansBold, fontSize: 16, color: c.text }}>{next.title}</Text>
          <Text style={{ fontFamily: sans, fontSize: 13, color: c.muted }}>{fmtDate(next.starts_at, true)} · {next.city}</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

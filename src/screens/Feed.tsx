import React, { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Article, EventItem } from "../api";
import { useContent } from "../content";
import { go } from "../nav";
import { Banner, Body, Button, Cover, TopBar, fmtDate, money } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

export const openArticle = (a: Article) => (a.is_album ? go("Album", { id: a.album_slug ?? a.id }) : go("Article", { article: a }));
export const openTickets = (e: EventItem) => go("Ticket", { id: e.slug ?? e.id });

function Screen({ title, children, refresh, busy }: { title: string; children: React.ReactNode; refresh: () => void; busy: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 32, gap: 14 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor={c.rose} />}>
      <TopBar title={title} />
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
      {data && !list.length ? <Body>Aucune actualité pour le moment.</Body> : null}
      {top ? (
        <Pressable accessibilityRole="button" onPress={() => openArticle(top)} style={{ borderRadius: 18, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <Cover uri={top.cover_url} size="100%" radius={0} />
          <View style={{ padding: 16, gap: 8 }}>
            <Text style={{ fontFamily: serif, fontSize: 22, color: c.text }}>{top.title}</Text>
            {top.excerpt ? <Body style={{ fontSize: 14 }}>{top.excerpt}</Body> : null}
            <Text style={{ fontFamily: sansBold, color: c.pink, fontSize: 13 }}>{top.is_album ? "Voir l'album" : "Lire la suite"}</Text>
          </View>
        </Pressable>
      ) : null}
      {rest.map((a) => (
        <Pressable key={a.id} accessibilityRole="button" onPress={() => openArticle(a)} style={{ flexDirection: "row", gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line }}>
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

const PAST_STEP = 4;

export function Agenda() {
  const { c } = useTheme();
  const { data, err, busy, load } = useContent();
  const [showAll, setShowAll] = useState(false);
  const limit = Date.now() - 6 * 3600e3;
  const all = data?.events ?? [];
  const upcoming = all.filter((e) => new Date(e.starts_at).getTime() >= limit);
  const past = all.filter((e) => new Date(e.starts_at).getTime() < limit).reverse();
  const featured = upcoming[0];
  const others = upcoming.slice(1);
  const shown = showAll ? past : past.slice(0, PAST_STEP);

  const row = (e: EventItem, isPast: boolean) => {
    const d = new Date(e.starts_at);
    return (
      <View key={e.id} style={{ borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, padding: 14, gap: 12, opacity: isPast ? 0.75 : 1 }}>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ width: 62, borderRadius: 12, backgroundColor: isPast ? c.line : c.rose, alignItems: "center", justifyContent: "center", paddingVertical: 8 }}>
            <Text style={{ fontFamily: serif, fontSize: 28, color: isPast ? c.text : c.onRose }}>{d.getDate()}</Text>
            <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 1.5, color: isPast ? c.text : c.onRose, textTransform: "uppercase" }}>{d.toLocaleDateString("fr-FR", { month: "short" })}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: sansBold, fontSize: 16, color: c.text }}>{e.title}</Text>
            <Text style={{ fontFamily: sans, fontSize: 13, color: c.muted }}>{e.venue}, {e.city} · {d.getFullYear()}</Text>
            {!isPast && e.ticket_price ? <Text style={{ fontFamily: sansBold, fontSize: 13, color: c.gold }}>À partir de {money(e.ticket_price, e.currency)}</Text> : null}
          </View>
        </View>
        {!isPast && e.tickets_enabled ? <Button label="Acheter un ticket" onPress={() => openTickets(e)} /> : null}
      </View>
    );
  };

  return (
    <Screen title="Agenda" refresh={load} busy={busy}>
      {err ? <Banner text={err} /> : null}
      {!data && !err ? <ActivityIndicator color={c.rose} /> : null}
      {data && !all.length ? <Body>Aucun événement pour le moment.</Body> : null}

      {featured ? (
        <View style={{ borderRadius: 20, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <View style={{ height: 230 }}>
            <Cover uri={featured.poster_url} size="100%" radius={0} />
            <LinearGradient colors={["rgba(25,1,4,0)", "rgba(25,1,4,.9)"]} locations={[0.3, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
            <Text style={{ position: "absolute", left: 14, top: 14, backgroundColor: c.rose, color: "#fff", fontFamily: sansBold, fontSize: 11, letterSpacing: 1.6, textTransform: "uppercase", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, overflow: "hidden" }}>À l'affiche</Text>
            <View style={{ position: "absolute", left: 16, right: 16, bottom: 14 }}>
              <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 2.2, textTransform: "uppercase", color: "#e3ad4b" }}>{fmtDate(featured.starts_at, true)}</Text>
              <Text numberOfLines={2} style={{ fontFamily: serif, fontSize: 28, lineHeight: 30, color: "#fff0ef", marginTop: 4 }}>{featured.title}</Text>
            </View>
          </View>
          <View style={{ padding: 16, gap: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="location-outline" size={18} color={c.pink} />
              <Text style={{ flex: 1, fontFamily: sans, fontSize: 14, color: c.soft }}>{featured.venue}, {featured.city}</Text>
              {featured.ticket_price ? <Text style={{ fontFamily: sansBold, fontSize: 14, color: c.gold }}>dès {money(featured.ticket_price, featured.currency)}</Text> : null}
            </View>
            {featured.tickets_enabled ? <Button label="Acheter un ticket" onPress={() => openTickets(featured)} /> : null}
          </View>
        </View>
      ) : data && all.length ? <Body>Aucun événement à venir pour le moment.</Body> : null}

      {others.length ? <Text style={{ fontFamily: serif, fontSize: 20, color: c.text, marginTop: 6 }}>À venir</Text> : null}
      {others.map((e) => row(e, false))}

      {past.length ? (
        <>
          <Text style={{ fontFamily: serif, fontSize: 20, color: c.text, marginTop: 10 }}>Événements passés</Text>
          {shown.map((e) => row(e, true))}
          {past.length > PAST_STEP ? (
            <Pressable accessibilityRole="button" onPress={() => setShowAll((v) => !v)} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Text style={{ fontFamily: sansBold, fontSize: 14, color: c.pink }}>{showAll ? "Réduire" : `Voir les ${past.length - PAST_STEP} autres`}</Text>
              <Ionicons name={showAll ? "chevron-up" : "chevron-down"} size={18} color={c.pink} />
            </Pressable>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

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
          <View style={{ height: 260 }}><Cover uri={top.cover_url} size="fill" radius={0} /></View>
          <View style={{ padding: 18, gap: 10 }}>
            <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 2, color: c.gold, textTransform: "uppercase" }}>{fmtDate(top.published_at, true)}</Text>
            <Text style={{ fontFamily: serif, fontSize: 28, lineHeight: 31, color: c.text }}>{top.title}</Text>
            {top.excerpt ? <Body numberOfLines={3} style={{ fontSize: 15 }}>{top.excerpt}</Body> : null}
            <Button label={top.is_album ? "Voir l'album" : "Lire l'article"} onPress={() => openArticle(top)} style={{ marginTop: 6 }} />
          </View>
        </Pressable>
      ) : null}
      {rest.map((a) => (
        <Pressable key={a.id} accessibilityRole="button" onPress={() => openArticle(a)} style={{ flexDirection: "row", gap: 14, padding: 12, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
          <Cover uri={a.cover_url} size={112} radius={12} />
          <View style={{ flex: 1, justifyContent: "center", gap: 6 }}>
            <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 2, color: c.gold, textTransform: "uppercase" }}>{fmtDate(a.published_at)}</Text>
            <Text numberOfLines={3} style={{ fontFamily: sansBold, fontSize: 17, lineHeight: 22, color: c.text }}>{a.title}</Text>
            {a.is_album ? (
              <View style={{ alignSelf: "flex-start", height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: c.rose, justifyContent: "center", marginTop: 2 }}>
                <Text style={{ fontFamily: sansBold, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: c.onRose }}>Voir l'album</Text>
              </View>
            ) : null}
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

      {featured ? ((() => {
        const d = new Date(featured.starts_at);
        const hour = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return (
          <View style={{ borderRadius: 22, overflow: "hidden", backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
            <View style={{ height: 300 }}>
              <Cover uri={featured.poster_url} size="fill" radius={0} />
              <Text style={{ position: "absolute", left: 14, top: 14, backgroundColor: c.rose, color: "#fff", fontFamily: sansBold, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: "hidden" }}>À l'affiche</Text>
            </View>
            <View style={{ padding: 20, gap: 14 }}>
              <Text style={{ fontFamily: serif, fontSize: 32, lineHeight: 35, color: c.text }}>{featured.title}</Text>
              <View style={{ gap: 10 }}>
                {([["calendar-outline", fmtDate(featured.starts_at, true)], ["time-outline", hour === "00:00" ? "Horaire à confirmer" : hour], ["location-outline", `${featured.venue}, ${featured.city}`]] as const).map(([icon, txt]) => (
                  <View key={icon} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(221,70,119,.16)", alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={18} color={c.pink} /></View>
                    <Text style={{ flex: 1, fontFamily: sans, fontSize: 16, lineHeight: 22, color: c.text }}>{txt}</Text>
                  </View>
                ))}
                {featured.ticket_price ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(227,173,75,.18)", alignItems: "center", justifyContent: "center" }}><Ionicons name="pricetag-outline" size={18} color={c.gold} /></View>
                    <Text style={{ fontFamily: sansBold, fontSize: 16, color: c.gold }}>À partir de {money(featured.ticket_price, featured.currency)}</Text>
                  </View>
                ) : null}
              </View>
              {featured.description ? <Body numberOfLines={4} style={{ fontSize: 14.5 }}>{featured.description}</Body> : null}
              {featured.tickets_enabled ? <Button label="Acheter un ticket" onPress={() => openTickets(featured)} /> : null}
            </View>
          </View>
        );
      })()
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

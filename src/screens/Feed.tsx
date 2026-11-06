import React, { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Article, EventItem } from "../api";
import { useContent } from "../content";
import { go } from "../nav";
import { Banner, Body, Button, FilterChip, FitImage, Lightbox, Page, TopBar, cardLook, fmtDate, money, tintOf } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

export const openArticle = (a: Article) => (a.is_album ? go("Album", { id: a.album_slug ?? a.id }) : go("Article", { article: a }));
export const openTickets = (e: EventItem) => go("Ticket", { id: e.slug ?? e.id });

function Screen({ title, sub, children, refresh, busy }: { title: string; sub: string; children: React.ReactNode; refresh: () => void; busy: boolean }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Page>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 130, gap: 14 }}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor={c.rose} />}>
        <TopBar title={title} sub={sub} />
        {children}
      </ScrollView>
    </Page>
  );
}

export function News() {
  const { c } = useTheme();
  const { data, err, busy, load } = useContent();
  const [filter, setFilter] = useState<"all" | "release" | "news">("all");
  const all = data?.articles ?? [];
  const top = all.find((a) => a.featured) ?? all[0];
  const list = all.filter((a) => filter === "all" || (filter === "release" ? a.is_album : !a.is_album)).sort((x, y) => Number(y === top) - Number(x === top));
  const Tag = ({ text }: { text: string }) => (
    <View style={{ position: "absolute", top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: "#ffffff" }}>
      <Text style={{ fontFamily: sansBold, fontSize: 10, letterSpacing: 0.9, textTransform: "uppercase", color: c.dark ? "#8a5d0b" : "#8a5d0b" }}>{text}</Text>
    </View>
  );
  return (
    <Screen title="Actualités" sub="Les nouvelles de Viviane" refresh={load} busy={busy}>
      {err ? <Banner text={err} /> : null}
      {!data && !err ? <ActivityIndicator color={c.rose} /> : null}
      {data && !all.length ? <Body>Aucune actualité pour le moment.</Body> : null}
      {all.length ? (
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <FilterChip label="Tout" on={filter === "all"} onPress={() => setFilter("all")} />
          <FilterChip label="Sorties" on={filter === "release"} onPress={() => setFilter("release")} />
          <FilterChip label="Actualités" on={filter === "news"} onPress={() => setFilter("news")} />
        </View>
      ) : null}
      {data && all.length && !list.length ? <Body>Rien dans cette catégorie pour le moment.</Body> : null}
      {list.map((a) => (
        <Pressable key={a.id} accessibilityRole="button" onPress={() => openArticle(a)} style={[{ borderRadius: 26, overflow: "hidden" }, cardLook(c)]}>
          <View>
            <FitImage uri={a.cover_url} ratio={a === top ? 1.2 : 1.6} />
            {a === top ? <Tag text="À la une" /> : a.is_album ? <Tag text="Sortie" /> : null}
          </View>
          <View style={{ padding: 16, gap: 6 }}>
            <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 1.5, color: c.gold, textTransform: "uppercase" }}>{fmtDate(a.published_at, true)}</Text>
            <Text style={{ fontFamily: serif, fontSize: a === top ? 28 : 24, lineHeight: a === top ? 31 : 27, color: c.text }}>{a.title}</Text>
            {a.excerpt ? <Body numberOfLines={a === top ? 4 : 2} style={{ fontSize: 14, lineHeight: 20, color: c.muted }}>{a.excerpt}</Body> : null}
            {a.is_album ? (
              <View style={{ alignSelf: "flex-start", height: 38, paddingHorizontal: 18, borderRadius: 19, backgroundColor: c.rose, justifyContent: "center", marginTop: 6 }}>
                <Text style={{ fontFamily: sansBold, fontSize: 12, letterSpacing: 1.2, textTransform: "uppercase", color: c.onRose }}>Voir l'album</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}

export function Agenda() {
  const { c } = useTheme();
  const { data, err, busy, load } = useContent();
  const [showAll, setShowAll] = useState(false);
  const [tab, setTab] = useState<"next" | "past">("next");
  const [poster, setPoster] = useState<string | null>(null);
  const limit = Date.now() - 6 * 3600e3;
  const all = data?.events ?? [];
  const upcoming = all.filter((e) => new Date(e.starts_at).getTime() >= limit);
  const past = all.filter((e) => new Date(e.starts_at).getTime() < limit).reverse();
  const featured = upcoming[0];
  const others = upcoming.slice(1);
  // Passés : l'année en cours reste affichée comme avant ; les années précédentes sont regroupées par année
  const thisYear = new Date().getFullYear();
  const pastNow = past.filter((e) => new Date(e.starts_at).getFullYear() >= thisYear);
  const pastOld = past.filter((e) => new Date(e.starts_at).getFullYear() < thisYear);
  const byYear = Object.entries(pastOld.reduce<Record<number, EventItem[]>>((acc, e) => { const y = new Date(e.starts_at).getFullYear(); (acc[y] ??= []).push(e); return acc; }, {})).sort((x, y) => Number(y[0]) - Number(x[0]));

  const row = (e: EventItem, isPast: boolean) => {
    const d = new Date(e.starts_at);
    return (
      <View key={e.id} style={[{ borderRadius: 24, padding: 14, gap: 12, opacity: isPast ? 0.8 : 1 }, cardLook(c)]}>
        <View style={{ flexDirection: "row", gap: 14 }}>
          <View style={{ width: 62, height: 70, borderRadius: 18, backgroundColor: isPast ? (c.dark ? c.line : "#f1e1dc") : tintOf(c), alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: serif, fontSize: 30, lineHeight: 32, color: isPast ? c.muted : c.rose }}>{d.getDate()}</Text>
            <Text style={{ fontFamily: sansBold, fontSize: 10, letterSpacing: 1.4, color: isPast ? c.muted : c.rose, textTransform: "uppercase" }}>{d.toLocaleDateString("fr-FR", { month: "short" })}</Text>
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: serif, fontSize: 21, lineHeight: 23, color: c.text }}>{e.title}</Text>
            <Text style={{ fontFamily: sans, fontSize: 13, color: c.muted }}>{e.venue}, {e.city} · {d.getFullYear()}</Text>
            {!isPast && e.ticket_price ? <Text style={{ fontFamily: sansBold, fontSize: 13, color: c.gold }}>À partir de {money(e.ticket_price, e.currency)}</Text> : null}
          </View>
        </View>
        {!isPast && e.tickets_enabled ? <Button label="Acheter un ticket" onPress={() => openTickets(e)} /> : null}
      </View>
    );
  };

  return (
    <Screen title="Agenda" sub="Concerts et événements" refresh={load} busy={busy}>
      {err ? <Banner text={err} /> : null}
      {!data && !err ? <ActivityIndicator color={c.rose} /> : null}
      {data && !all.length ? <Body>Aucun événement pour le moment.</Body> : null}

      {all.length ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <FilterChip label="À venir" on={tab === "next"} onPress={() => setTab("next")} />
          <FilterChip label="Passés" on={tab === "past"} onPress={() => setTab("past")} />
        </View>
      ) : null}

      {tab === "next" && featured ? ((() => {
        const d = new Date(featured.starts_at);
        const hour = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        return (
          <View style={[{ borderRadius: 26, overflow: "hidden" }, cardLook(c)]}>
            <View>
              <FitImage uri={featured.poster_url} ratio={1.75} onPress={() => setPoster(featured.poster_url)} label="Agrandir l'affiche" />
              <Text style={{ position: "absolute", left: 14, top: 14, backgroundColor: "#ffffff", color: c.rose, fontFamily: sansBold, fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: "hidden" }}>À l'affiche</Text>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <Text style={{ fontFamily: serif, fontSize: 28, lineHeight: 31, color: c.text }}>{featured.title}</Text>
              <View style={{ gap: 8 }}>
                {([["calendar-outline", fmtDate(featured.starts_at, true)], ["time-outline", hour === "00:00" ? "Horaire à confirmer" : hour], ["location-outline", `${featured.venue}, ${featured.city}`]] as const).map(([icon, txt]) => (
                  <View key={icon} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: tintOf(c), alignItems: "center", justifyContent: "center" }}><Ionicons name={icon} size={18} color={c.pink} /></View>
                    <Text style={{ flex: 1, fontFamily: sans, fontSize: 15, lineHeight: 20, color: c.text }}>{txt}</Text>
                  </View>
                ))}
                {featured.ticket_price ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.dark ? "rgba(227,173,75,.18)" : "#fdf0d3", alignItems: "center", justifyContent: "center" }}><Ionicons name="pricetag-outline" size={18} color={c.gold} /></View>
                    <Text style={{ fontFamily: sansBold, fontSize: 16, color: c.gold }}>À partir de {money(featured.ticket_price, featured.currency)}</Text>
                  </View>
                ) : null}
              </View>
              {featured.description ? <Body numberOfLines={3} style={{ fontSize: 14 }}>{featured.description}</Body> : null}
              {featured.tickets_enabled ? <Button label="Acheter un ticket" onPress={() => openTickets(featured)} /> : null}
            </View>
          </View>
        );
      })()
      ) : tab === "next" && data && all.length ? <Body>Aucun événement à venir pour le moment.</Body> : null}

      {tab === "next" && others.length ? <Text style={{ fontFamily: serif, fontSize: 24, color: c.text, marginTop: 6 }}>À venir</Text> : null}
      {tab === "next" ? others.map((e) => row(e, false)) : null}

      {tab === "past" && !past.length ? <Body>Aucun événement passé.</Body> : null}
      {tab === "past" && pastNow.length ? (
        <>
          <Text style={{ fontFamily: serif, fontSize: 24, color: c.text, marginTop: 6 }}>{thisYear}</Text>
          {pastNow.map((e) => row(e, true))}
        </>
      ) : null}
      {tab === "past" && pastOld.length ? (
        <>
          <Pressable accessibilityRole="button" onPress={() => setShowAll((v) => !v)} style={[{ minHeight: 52, borderRadius: 22, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, cardLook(c)]}>
            <Text style={{ fontFamily: sansBold, fontSize: 14, color: c.text }}>{showAll ? "Masquer les années précédentes" : `Voir les années précédentes (${pastOld.length})`}</Text>
            <Ionicons name={showAll ? "chevron-up" : "chevron-down"} size={18} color={c.pink} />
          </Pressable>
          {showAll ? byYear.map(([y, list]) => (
            <View key={y} style={{ gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
                <Text style={{ fontFamily: serif, fontSize: 24, color: c.text }}>{y}</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: c.line }} />
                <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>{list.length} événement{list.length > 1 ? "s" : ""}</Text>
              </View>
              {list.map((e) => row(e, true))}
            </View>
          )) : null}
        </>
      ) : null}
      <Lightbox photos={poster ? [poster] : []} start={poster ? 0 : null} onClose={() => setPoster(null)} />
    </Screen>
  );
}

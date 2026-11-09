import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL } from "../config";
import { go, goTab } from "../nav";
import { openArticle, openTickets } from "./Feed";
import { fetchDevices, getToken, type Article } from "../api";
import { useContent } from "../content";
import { usePlayer } from "../player";
import { fanFirstName } from "../fan";
import { Body, Button, Cover, FitImage, Lightbox, ThemeButton, cardLook, fmtDate, fmtTime, money, openLink } from "../ui";
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14, gap }}
        onScrollBeginDrag={() => { pause.current = Date.now() + 9000; }}
        onMomentumScrollEnd={(e) => { const i = Math.round(e.nativeEvent.contentOffset.x / (cardW + gap)); idx.current = i; setCur(i); }}>
        {items.map((a) => (
          <Pressable key={a.id} accessibilityRole="button" onPress={() => openArticle(a)} style={[{ width: cardW, borderRadius: 24, overflow: "hidden" }, cardLook(c)]}>
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

/** Compte à rebours en clair : « Ce soir », « Demain », « 9 jours »… */
function countdown(iso: string): { big: string; small: string } {
  const start = new Date(iso);
  const now = new Date();
  if (start.getTime() <= now.getTime() && start.getTime() >= now.getTime() - 6 * 3600e3) return { big: "Ce soir", small: "en cours" };
  const days = Math.round((new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400e3);
  if (days <= 0) return { big: "Ce soir", small: "aujourd'hui" };
  if (days === 1) return { big: "Demain", small: "" };
  return { big: String(days), small: "jours" };
}

/** Fan connecté (e-mail et prénom) : sert à personnaliser l'accueil. */
type Fan = { email: string; name: string | null } | null;

export default function Home() {
  const [poster, setPoster] = useState<string | null>(null);
  const [fan, setFan] = useState<Fan>(null);
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, busy, load, err } = useContent();
  const p = usePlayer();
  const st = data?.settings;
  const articles = data?.articles ?? [];
  const releases = articles.filter((a) => a.is_album).slice(0, 2);   // les deux plus récentes
  const news = articles.filter((a) => !a.is_album).slice(0, 8);
  const showBanner = Boolean(st && st.home_media_type !== "none" && st.home_media_url);
  const goTo = goTab;

  // Compte connecté : relu à chaque retour sur l'accueil (connexion ou déconnexion faite dans Profil)
  useFocusEffect(useCallback(() => {
    let live = true;
    (async () => {
      if (!(await getToken())) { if (live) setFan(null); return; }
      try {
        const o = (await fetchDevices())[0];
        if (live) setFan(o?.email ? { email: o.email, name: fanFirstName(o.name, o.email) } : null);
      } catch { if (live) setFan(null); }
    })();
    return () => { live = false; };
  }, []));

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
  const initial = (fan?.name ?? fan?.email ?? "").trim().charAt(0).toUpperCase();
  const cd = nextEvent ? countdown(nextEvent.starts_at) : null;

  const tint = c.dark ? "rgba(221,70,119,.18)" : "#fbe3e8";
  const softLine = c.dark ? "rgba(255,240,239,.22)" : "#e6cfc9";
  const accentShadow = c.dark ? {} : { shadowColor: c.rose, shadowOpacity: 0.32, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 5 };
  const Chip = ({ text, color }: { text: string; color: string }) => (
    <View style={{ position: "absolute", top: 10, left: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: "#ffffff" }}>
      <Text style={{ fontFamily: sansBold, fontSize: 10, letterSpacing: 0.9, textTransform: "uppercase", color }}>{text}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
    {/* Halo chaud en haut de l'écran */}
    <LinearGradient pointerEvents="none" colors={[c.dark ? "rgba(221,70,119,.16)" : "rgba(196,44,99,.14)", "rgba(0,0,0,0)"]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 320 }} />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 28 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={c.rose} />}>
      {/* En-tête : salutation et avatar */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={{ fontFamily: sans, fontSize: 14, color: c.muted }}>{fan ? "Content de vous revoir" : "Viviane Chidid"}</Text>
          <Text numberOfLines={1} style={{ fontFamily: serif, fontSize: 36, lineHeight: 40, color: c.text, marginTop: 2 }}>{fan ? (fan.name ?? "Bonjour") : "Bienvenue"}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <ThemeButton />
          <Pressable accessibilityRole="button" accessibilityLabel={fan ? "Mon profil" : "Me connecter"} onPress={() => goTo("Profil")}
            style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: fan ? c.rose : c.card, alignItems: "center", justifyContent: "center" }, fan ? accentShadow : cardLook(c)]}>
            {fan && initial ? <Text style={{ fontFamily: sansBold, fontSize: 18, color: "#fff" }}>{initial}</Text> : <Ionicons name="person-outline" size={20} color={c.text} />}
          </Pressable>
        </View>
      </View>

      {err && !data ? <Text style={{ fontFamily: sans, color: c.pink, marginTop: 16 }}>{err}</Text> : null}

      {/* Reprendre l'écoute (fan) ou invitation à se connecter (visiteur) */}
      {last && lastTrack ? (
        <View style={[{ marginTop: 22, flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 24 }, cardLook(c)]}>
          <Cover uri={last.album.cover_url} size={64} radius={18} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: c.gold }}>Reprendre l'écoute</Text>
            <Text numberOfLines={1} style={{ fontFamily: serif, fontSize: 20, lineHeight: 23, color: c.text, marginTop: 3 }}>{lastTrack.title}</Text>
            <Text numberOfLines={1} style={{ fontFamily: sans, fontSize: 12, color: c.muted, marginTop: 2 }}>{last.album.title} · {fmtTime(last.position)} sur {fmtTime(last.duration)}</Text>
            <View style={{ marginTop: 8, height: 4, borderRadius: 2, backgroundColor: c.dark ? c.line : "#f1e1dc" }}><View style={{ width: `${pct * 100}%`, height: 4, borderRadius: 2, backgroundColor: c.rose }} /></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Reprendre la lecture" onPress={() => void p.resume()} style={[{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.rose, alignItems: "center", justifyContent: "center" }, accentShadow]}>
            <Ionicons name="play" size={20} color="#fff" />
          </Pressable>
        </View>
      ) : !fan ? (
        <Pressable accessibilityRole="button" onPress={() => goTo("Profil")} style={[{ marginTop: 22, flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 24 }, cardLook(c)]}>
          <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}><Ionicons name="musical-notes-outline" size={24} color={c.rose} /></View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: sansBold, fontSize: 15, color: c.text }}>Retrouvez vos achats</Text>
            <Text style={{ fontFamily: sans, fontSize: 13, color: c.muted, marginTop: 2 }}>Connectez-vous avec votre e-mail pour écouter votre musique.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.muted} />
        </Pressable>
      ) : null}

      {showBanner ? (
        <View style={[{ marginTop: 14, borderRadius: 24, overflow: "hidden" }, cardLook(c)]}>
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

      {/* Prochain événement : compte à rebours, infos lisibles, bouton d'achat */}
      {nextEvent && cd ? (
        <View style={[{ marginTop: 14, padding: 16, borderRadius: 24, gap: 14 }, cardLook(c)]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View style={{ width: 76, height: 76, borderRadius: 20, backgroundColor: tint, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: serif, fontSize: cd.big.length > 4 ? 20 : 36, lineHeight: cd.big.length > 4 ? 24 : 40, color: c.rose }}>{cd.big}</Text>
              {cd.small ? <Text style={{ fontFamily: sansBold, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: c.rose }}>{cd.small}</Text> : null}
            </View>
            <Pressable accessibilityRole="button" onPress={() => goTo("Agenda")} style={{ flex: 1, gap: 3 }}>
              <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: c.gold }}>Prochain événement</Text>
              <Text numberOfLines={2} style={{ fontFamily: serif, fontSize: 22, lineHeight: 24, color: c.text }}>{nextEvent.title}</Text>
              <Text style={{ fontFamily: sans, fontSize: 13, color: c.muted }}>{fmtDate(nextEvent.starts_at, true)}</Text>
              <Text numberOfLines={1} style={{ fontFamily: sans, fontSize: 13, color: c.muted }}>{nextEvent.venue}, {nextEvent.city}{nextEvent.ticket_price ? ` · dès ${money(nextEvent.ticket_price, nextEvent.currency)}` : ""}</Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable accessibilityRole="button" onPress={() => (nextEvent.tickets_enabled ? openTickets(nextEvent) : goTo("Agenda"))}
              style={[{ flex: 1, height: 50, borderRadius: 25, backgroundColor: c.rose, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }, accentShadow]}>
              <Ionicons name={nextEvent.tickets_enabled ? "ticket-outline" : "calendar-outline"} size={19} color="#fff" />
              <Text style={{ fontFamily: sansBold, fontSize: 13, letterSpacing: 1.3, textTransform: "uppercase", color: "#fff" }}>{nextEvent.tickets_enabled ? "Acheter un ticket" : "Voir l'agenda"}</Text>
            </Pressable>
            {nextEvent.poster_url ? (
              <Pressable accessibilityRole="button" onPress={() => setPoster(nextEvent.poster_url)} style={{ height: 50, paddingHorizontal: 18, borderRadius: 25, borderWidth: 1.5, borderColor: softLine, justifyContent: "center" }}>
                <Text style={{ fontFamily: sansBold, fontSize: 13, color: c.text }}>Affiche</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* À découvrir : les deux sorties les plus récentes */}
      {releases.length ? (
        <>
          <View style={{ marginTop: 26, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: serif, fontSize: 24, color: c.text }}>À découvrir</Text>
            <Pressable accessibilityRole="button" onPress={() => goTo("Actualités")} hitSlop={12}><Text style={{ fontFamily: sansBold, fontSize: 13, color: c.rose }}>Tout voir</Text></Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 12, marginTop: 14 }}>
            {releases.map((a, i) => (
              <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={a.title} onPress={() => openArticle(a)} style={{ flex: 1 }}>
                <View style={[{ width: "100%", aspectRatio: 1, borderRadius: 22, overflow: "hidden" }, cardLook(c)]}>
                  <Cover uri={a.cover_url} size="100%" radius={0} />
                  <Chip text={i === 0 ? "Dernière sortie" : "Nouveauté"} color={i === 0 ? "#c42c63" : "#8a5d0b"} />
                </View>
                <Text numberOfLines={2} style={{ fontFamily: serif, fontSize: 20, lineHeight: 22, color: c.text, marginTop: 10 }}>{a.title}</Text>
                <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted, marginTop: 2 }}>{fmtDate(a.published_at)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {news.length ? (
        <>
          <View style={{ marginTop: 28, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: serif, fontSize: 24, color: c.text }}>Actualités</Text>
            <Pressable accessibilityRole="button" onPress={() => goTo("Actualités")} hitSlop={12}><Text style={{ fontFamily: sansBold, fontSize: 13, color: c.rose }}>Tout voir</Text></Pressable>
          </View>
          <NewsCarousel items={news} />
        </>
      ) : null}
      <Lightbox photos={poster ? [poster] : []} start={poster ? 0 : null} onClose={() => setPoster(null)} />
    </ScrollView>
    </View>
  );
}

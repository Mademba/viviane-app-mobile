import React, { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
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
import { Body, Button, COL, Cover, FitImage, Lightbox, ThemeButton, cardLook, fmtDate, money, openLink, useColW } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

function BannerVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} nativeControls={false} contentFit="cover" style={{ width: "100%", height: "100%" }} />;
}

function NewsCarousel({ items }: { items: Article[] }) {
  const { c } = useTheme();
  const colW = useColW();
  const cardW = colW - 32;
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

  const colW = useColW();
  const k = colW / 390;                       // échelle par rapport à la maquette (téléphone de 390 px)
  const SAND = "#c7ae90";                     // fond de la photo de l'artiste
  const heroH = 360 * k;
  const accentShadow = c.dark ? {} : { shadowColor: c.rose, shadowOpacity: 0.32, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 5 };
  const quick: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; onPress: () => void }[] = [
    { label: "Ma musique", icon: "musical-notes-outline", onPress: () => goTo("Ma musique") },
    { label: "Billets", icon: "ticket-outline", onPress: () => (nextEvent?.tickets_enabled ? openTickets(nextEvent) : goTo("Agenda")) },
    { label: "Agenda", icon: "calendar-outline", onPress: () => goTo("Agenda") },
    { label: "Clips", icon: "videocam-outline", onPress: () => goTo("Ma musique") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 150 }}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={c.rose} progressViewOffset={insets.top} />}>
      {/* Bandeau photo : la photo de l'artiste, fondue dans le fond */}
      <View style={{ backgroundColor: SAND, height: heroH, overflow: "hidden" }}>
        <View style={[{ height: heroH, overflow: "hidden" }, COL]}>
          <Image source={require("../../assets/artiste-accueil.jpg")} accessibilityLabel="Viviane Chidid" resizeMode="cover"
            style={{ position: "absolute", right: -44 * k, top: 6 * k, width: 330 * k, height: 495 * k }} />
          <View style={{ position: "absolute", left: 0, right: 0, top: 0, paddingTop: insets.top + 12, paddingHorizontal: 20, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
            <View style={{ width: 190 * k }}>
              <Text style={{ fontFamily: sans, fontSize: 14, color: "#361116" }}>{fan ? "Content de vous revoir" : "Viviane Chidid"}</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: serif, fontSize: 44, lineHeight: 46, color: "#2a0611", marginTop: 2 }}>{fan ? (fan.name ?? "Bonjour") : "Bienvenue"}</Text>
              <Pressable accessibilityRole="button" onPress={() => goTo("Profil")} disabled={Boolean(fan)}
                style={{ alignSelf: "flex-start", marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: "rgba(255,255,255,.78)" }}>
                <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase", color: "#7a1235" }}>{fan ? "Compte fan" : "Se connecter"}</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
              <ThemeButton />
              <Pressable accessibilityRole="button" accessibilityLabel={fan ? "Mon profil" : "Me connecter"} onPress={() => goTo("Profil")}
                style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: fan ? c.rose : "#ffffff", alignItems: "center", justifyContent: "center" }, fan ? accentShadow : cardLook(c)]}>
                {fan && initial ? <Text style={{ fontFamily: sansBold, fontSize: 18, color: "#fff" }}>{initial}</Text> : <Ionicons name="person-outline" size={20} color="#361116" />}
              </Pressable>
            </View>
          </View>
        </View>
        <LinearGradient pointerEvents="none" colors={[`${c.bg}00`, c.bg]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 160 * k }} />
      </View>
      {/* le dégradé du bandeau doit rejoindre le fond de page sur toute la largeur */}
      <View style={[{ marginTop: -52 * k, paddingHorizontal: 20 }, COL]}>
        {err && !data ? <Text style={{ fontFamily: sans, color: c.pink, marginBottom: 10 }}>{err}</Text> : null}

        {/* Mini-lecteur flottant : reprendre l'écoute (ou invitation à se connecter) */}
        {last && lastTrack ? (
          <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 10, paddingRight: 12, borderRadius: 26 }, cardLook(c), c.dark ? {} : { shadowOpacity: 0.14, shadowRadius: 15, elevation: 6 }]}>
            <Cover uri={last.album.cover_url} size={52} radius={16} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: sansBold, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", color: c.gold }}>Reprendre l'écoute</Text>
              <Text numberOfLines={1} style={{ fontFamily: serif, fontSize: 19, lineHeight: 21, color: c.text, marginTop: 1 }}>{lastTrack.title}</Text>
              <View style={{ marginTop: 6, height: 3, borderRadius: 2, backgroundColor: c.dark ? c.line : "#f1e1dc" }}><View style={{ width: `${pct * 100}%`, height: 3, borderRadius: 2, backgroundColor: c.rose }} /></View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Reprendre la lecture" onPress={() => void p.resume()} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.rose, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="play" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : !fan ? (
          <Pressable accessibilityRole="button" onPress={() => goTo("Profil")} style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 26 }, cardLook(c)]}>
            <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: c.dark ? "rgba(221,70,119,.18)" : "#fbe3e8", alignItems: "center", justifyContent: "center" }}><Ionicons name="musical-notes-outline" size={24} color={c.rose} /></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: sansBold, fontSize: 15, color: c.text }}>Retrouvez vos achats</Text>
              <Text style={{ fontFamily: sans, fontSize: 13, color: c.muted, marginTop: 1 }}>Connectez-vous avec votre e-mail.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.muted} />
          </Pressable>
        ) : null}

        {/* Accès rapides */}
        <View style={{ marginTop: 18, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 }}>
          {quick.map((q) => (
            <Pressable key={q.label} accessibilityRole="button" accessibilityLabel={q.label} onPress={q.onPress} style={{ width: 78, alignItems: "center", gap: 8 }}>
              <View style={[{ width: 58, height: 58, borderRadius: 20, backgroundColor: c.card, alignItems: "center", justifyContent: "center" }, cardLook(c)]}>
                <Ionicons name={q.icon} size={26} color={c.rose} />
              </View>
              <Text numberOfLines={1} style={{ fontFamily: sansBold, fontSize: 12, color: c.text }}>{q.label}</Text>
            </Pressable>
          ))}
        </View>

        {showBanner ? (
          <View style={[{ marginTop: 20, borderRadius: 24, overflow: "hidden" }, cardLook(c)]}>
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

        {/* Prochain événement : un billet bordeaux avec compte à rebours */}
        {nextEvent && cd ? (
          <View style={{ marginTop: 20, borderRadius: 26, overflow: "hidden", backgroundColor: "#3a0d1a", shadowColor: "#3a0d1a", shadowOpacity: c.dark ? 0 : 0.28, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 8 }}>
            <View>
              <View style={{ flexDirection: "row", alignItems: "stretch" }}>
                <Pressable accessibilityRole="button" onPress={() => goTo("Agenda")} style={{ flex: 1, paddingTop: 16, paddingBottom: 16, paddingLeft: 18, paddingRight: 12 }}>
                  <Text style={{ fontFamily: sansBold, fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", color: "#f0c26a" }}>Prochain événement</Text>
                  <Text numberOfLines={2} style={{ fontFamily: serif, fontSize: 24, lineHeight: 25, color: "#fff0ef", marginTop: 4 }}>{nextEvent.title}</Text>
                  <Text style={{ fontFamily: sans, fontSize: 13, color: "rgba(255,240,239,.82)", marginTop: 5 }}>{fmtDate(nextEvent.starts_at, true)}</Text>
                  <Text numberOfLines={1} style={{ fontFamily: sans, fontSize: 13, color: "rgba(255,240,239,.82)" }}>{nextEvent.venue}, {nextEvent.city}{nextEvent.ticket_price ? ` · dès ${money(nextEvent.ticket_price, nextEvent.currency)}` : ""}</Text>
                </Pressable>
                {/* perforation */}
                <View style={{ width: 2, marginVertical: 14, justifyContent: "space-between" }}>
                  {Array.from({ length: 9 }).map((_, i) => <View key={i} style={{ width: 2, height: 5, borderRadius: 1, backgroundColor: "rgba(255,240,239,.28)" }} />)}
                </View>
                <View style={{ width: 92, alignItems: "center", justifyContent: "center", paddingVertical: 12 }}>
                  <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: serif, fontSize: cd.big.length > 4 ? 22 : 44, lineHeight: cd.big.length > 4 ? 26 : 46, color: "#ff8fb0", maxWidth: 80 }}>{cd.big}</Text>
                  {cd.small ? <Text style={{ fontFamily: sansBold, fontSize: 10, letterSpacing: 1.8, textTransform: "uppercase", color: "#fff0ef", marginTop: 2 }}>{cd.small}</Text> : null}
                </View>
              </View>
              <View pointerEvents="none" style={{ position: "absolute", right: 82, top: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: c.bg }} />
              <View pointerEvents="none" style={{ position: "absolute", right: 82, bottom: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: c.bg }} />
            </View>
            <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 14, flexDirection: "row", gap: 10 }}>
              <Pressable accessibilityRole="button" onPress={() => (nextEvent.tickets_enabled ? openTickets(nextEvent) : goTo("Agenda"))}
                style={{ flex: 1, height: 46, borderRadius: 23, backgroundColor: c.rose, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: sansBold, fontSize: 13, letterSpacing: 1.3, textTransform: "uppercase", color: "#fff" }}>{nextEvent.tickets_enabled ? "Acheter un ticket" : "Voir l'agenda"}</Text>
              </Pressable>
              {nextEvent.poster_url ? (
                <Pressable accessibilityRole="button" onPress={() => setPoster(nextEvent.poster_url)} style={{ height: 46, paddingHorizontal: 18, borderRadius: 23, borderWidth: 1.5, borderColor: "rgba(255,240,239,.4)", justifyContent: "center" }}>
                  <Text style={{ fontFamily: sansBold, fontSize: 13, color: "#fff0ef" }}>Affiche</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* À découvrir : les deux sorties les plus récentes */}
        {releases.length ? (
          <>
            <View style={{ marginTop: 24, flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: serif, fontSize: 24, color: c.text }}>À découvrir</Text>
              <Pressable accessibilityRole="button" onPress={() => goTo("Actualités")} hitSlop={12}><Text style={{ fontFamily: sansBold, fontSize: 13, color: c.rose }}>Tout voir</Text></Pressable>
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              {releases.map((a) => (
                <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={a.title} onPress={() => openArticle(a)} style={[{ flex: 1, aspectRatio: 1, borderRadius: 22, overflow: "hidden" }, cardLook(c)]}>
                  <Cover uri={a.cover_url} size="100%" radius={0} />
                  <LinearGradient pointerEvents="none" colors={["rgba(25,1,4,0)", "rgba(25,1,4,.72)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" }} />
                  <Text numberOfLines={2} style={{ position: "absolute", left: 12, right: 12, bottom: 12, fontFamily: serif, fontSize: 20, lineHeight: 21, color: "#fff" }}>{a.title}</Text>
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
      </View>
      <Lightbox photos={poster ? [poster] : []} start={poster ? 0 : null} onClose={() => setPoster(null)} />
    </ScrollView>
    </View>
  );
}

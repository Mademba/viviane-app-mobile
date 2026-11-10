import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, Platform, Pressable, StatusBar, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSecureScreen } from "../secure";
import * as ScreenOrientation from "expo-screen-orientation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trackSource, type LibAlbum } from "../api";
import { usePlayer } from "../player";
import { BackBar, Banner } from "../ui";
import Watermark, { wmText } from "../Watermark";
import { sans, serif, useTheme } from "../theme";

type Src = { uri: string; headers: Record<string, string> };

const fmt = (n: number) => {
  const t = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

function IconBtn({ icon, onPress, label, size = 24 }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; size?: number }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={8} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
      <Ionicons name={icon} size={size} color="#fff" />
    </Pressable>
  );
}

/** Lecteur avec barre de contrôle en bas (standard) : lecture/pause, -10 s, +10 s, progression, plein écran. Filigrane conservé. */
function Video({ src, wm, full, onFull }: { src: Src; wm: string; full: boolean; onFull: (v: boolean) => void }) {
  const player = useVideoPlayer({ uri: src.uri, headers: src.headers }, (p) => { p.loop = false; p.timeUpdateEventInterval = 0.25; p.play(); });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const tu = useEvent(player, "timeUpdate", { currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: -1 });
  const [webFull, setWebFull] = useState(false);
  const [bar, setBar] = useState(true);
  const [w, setW] = useState(1);
  const [drag, setDrag] = useState<number | null>(null);
  const box = useRef<unknown>(null);
  const isWeb = Platform.OS === "web";
  const isFull = isWeb ? webFull : full;
  const dur = player.duration || 0;
  const cur = drag ?? tu.currentTime ?? 0;
  const ratio = dur > 0 ? Math.min(1, Math.max(0, cur / dur)) : 0;

  // La barre se masque seule pendant la lecture ; un tap sur la vidéo la réaffiche
  useEffect(() => {
    if (!bar || !isPlaying || drag !== null) return;
    const t = setTimeout(() => setBar(false), 3500);
    return () => clearTimeout(t);
  }, [bar, isPlaying, drag, tu.currentTime]);

  // Web : le plein écran du conteneur garde le filigrane par-dessus la vidéo
  useEffect(() => {
    if (!isWeb || typeof document === "undefined") return;
    const onChange = () => { if (!document.fullscreenElement) setWebFull(false); };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [isWeb]);

  const toggleFull = () => {
    if (isWeb && typeof document !== "undefined") {
      const el = box.current as unknown as HTMLElement | null;
      if (document.fullscreenElement) document.exitFullscreen?.();
      else { el?.requestFullscreen?.(); setWebFull(true); }
      return;
    }
    onFull(!full);
  };
  const toggle = () => { if (isPlaying) player.pause(); else { if (dur > 0 && cur >= dur - 0.3) player.currentTime = 0; player.play(); } setBar(true); };
  const seekAt = (x: number) => dur > 0 ? Math.min(dur, Math.max(0, (x / w) * dur)) : 0;

  const controls = bar ? (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 22, paddingBottom: isFull ? 14 : 6, paddingHorizontal: isFull ? 24 : 8, backgroundColor: "rgba(0,0,0,0.5)" }}>
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width || 1)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => setDrag(seekAt(e.nativeEvent.locationX))}
        onResponderMove={(e) => setDrag(seekAt(e.nativeEvent.locationX))}
        onResponderRelease={(e) => { player.currentTime = seekAt(e.nativeEvent.locationX); setDrag(null); }}
        onResponderTerminate={() => setDrag(null)}
        style={{ height: 22, justifyContent: "center", marginHorizontal: 8 }}
      >
        <View style={{ height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)" }}>
          <View style={{ width: `${ratio * 100}%`, height: 3, borderRadius: 2, backgroundColor: "#fff" }} />
        </View>
        <View style={{ position: "absolute", left: `${ratio * 100}%`, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: "#fff" }} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <IconBtn icon={isPlaying ? "pause" : "play"} label={isPlaying ? "Pause" : "Lecture"} onPress={toggle} size={26} />
        <IconBtn icon="play-back" label="Reculer de 10 secondes" onPress={() => { player.seekBy(-10); setBar(true); }} size={22} />
        <IconBtn icon="play-forward" label="Avancer de 10 secondes" onPress={() => { player.seekBy(10); setBar(true); }} size={22} />
        <Text style={{ color: "#fff", fontSize: 12, marginLeft: 8, flex: 1 }}>{fmt(cur)} / {fmt(dur)}</Text>
        <IconBtn icon={isFull ? "contract" : "expand"} label={isFull ? "Quitter le plein écran" : "Plein écran"} onPress={toggleFull} size={22} />
      </View>
    </View>
  ) : null;

  return (
    <View ref={box as never} style={[{ backgroundColor: "#000" }, full && !isWeb ? { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 } : { width: "100%", aspectRatio: 16 / 9 }]}>
      <VideoView player={player} nativeControls={false} fullscreenOptions={{ enable: false }} contentFit="contain" style={{ width: "100%", height: "100%" }} />
      <Pressable onPress={() => setBar((v) => !v)} accessibilityLabel="Afficher ou masquer les contrôles" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <Watermark marks={2} text={wm} opacity={0.2} />
      {controls}
      {/* Bouton de sortie du plein écran : toujours visible, en haut à gauche */}
      {isFull ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Quitter le plein écran" onPress={toggleFull} hitSlop={10}
          style={{ position: "absolute", top: 14, left: 18, flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.65)", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" }}>
          <Ionicons name="close" size={22} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Quitter</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Lecture d'un clip vidéo exclusif acheté (flux protégé, captures d'écran bloquées). */
export default function Clip({ route, navigation }: { route: { params: { album: LibAlbum } }; navigation: { goBack: () => void } }) {
  useSecureScreen("clip");
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const a = route.params.album;
  const [src, setSrc] = useState<Src | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const t = a.tracks.find((x) => x.available);

  // Plein écran : orientation paysage réelle (l'écran reste dans l'application, donc protégé et filigrané) ; portrait au retour
  useEffect(() => {
    if (Platform.OS === "web") return;
    void ScreenOrientation.lockAsync(full ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => null);
  }, [full]);
  useEffect(() => () => { if (Platform.OS !== "web") void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => null); }, []);
  // Bouton retour d'Android : quitte d'abord le plein écran
  useEffect(() => {
    if (!full) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { setFull(false); return true; });
    return () => sub.remove();
  }, [full]);

  useEffect(() => {
    // La musique en cours est mise en pause pendant le clip
    if (p.playing) p.toggle();
    if (!t) { setErr("Le clip n'est pas encore disponible."); return; }
    trackSource(t.id).then(async (s) => {
      const probe = await fetch(s.uri, { headers: { ...s.headers, range: "bytes=0-1" } }).catch(() => null);
      if (!probe) return setErr("Pas de connexion au site. Vérifiez votre réseau.");
      if (!probe.ok && probe.status !== 206) { const j = await probe.json().catch(() => null); return setErr(j?.error ?? `Lecture refusée (code ${probe.status}).`); }
      setSrc(s);
    }).catch(() => setErr("Lecture impossible pour le moment."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: full ? "#000" : c.bg, paddingTop: full ? 0 : insets.top + 8, paddingHorizontal: 0 }}>
      <StatusBar hidden={full} />
      {!full ? <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}><BackBar onBack={navigation.goBack} label={a.title} /></View> : null}
      {src ? <Video src={src} wm={wmText(a.fan)} full={full} onFull={setFull} /> : err ? <View style={{ paddingHorizontal: 20 }}><Banner text={err} /></View> : <ActivityIndicator color={c.rose} style={{ marginTop: 60 }} />}
      {!full ? (
        <View style={{ paddingHorizontal: 22, paddingTop: 22 }}>
          <Text style={{ fontFamily: serif, fontSize: 30, color: c.text }}>{a.title}</Text>
          <Text style={{ fontFamily: sans, fontSize: 14, color: c.muted, marginTop: 6 }}>Clip vidéo exclusif · Viviane Chidid</Text>
          <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted, marginTop: 14 }}>Contenu réservé : captures d'écran désactivées. Votre identifiant apparaît en filigrane sur la vidéo ; toute diffusion est tracée.</Text>
        </View>
      ) : null}
    </View>
  );
}

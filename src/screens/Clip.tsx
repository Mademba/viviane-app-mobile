import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StatusBar, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { usePreventScreenCapture } from "expo-screen-capture";
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
function Video({ src, wm }: { src: Src; wm: string }) {
  const player = useVideoPlayer({ uri: src.uri, headers: src.headers }, (p) => { p.loop = false; p.timeUpdateEventInterval = 0.25; p.play(); });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const tu = useEvent(player, "timeUpdate", { currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: -1 });
  const [full, setFull] = useState(false);
  const [bar, setBar] = useState(true);
  const [w, setW] = useState(1);
  const [drag, setDrag] = useState<number | null>(null);
  const box = useRef<unknown>(null);
  const win = useWindowDimensions();
  const isWeb = Platform.OS === "web";
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
    const onChange = () => { if (!document.fullscreenElement) setFull(false); };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [isWeb]);

  const toggleFull = () => {
    if (isWeb && typeof document !== "undefined") {
      const el = box.current as unknown as HTMLElement | null;
      if (document.fullscreenElement) document.exitFullscreen?.();
      else { el?.requestFullscreen?.(); setFull(true); }
      return;
    }
    setFull((v) => !v);
  };
  const toggle = () => { if (isPlaying) player.pause(); else { if (dur > 0 && cur >= dur - 0.3) player.currentTime = 0; player.play(); } setBar(true); };
  const seekAt = (x: number) => dur > 0 ? Math.min(dur, Math.max(0, (x / w) * dur)) : 0;

  const controls = bar ? (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 22, paddingBottom: 6, paddingHorizontal: 8, backgroundColor: "rgba(0,0,0,0.5)" }}>
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
        <IconBtn icon={full ? "contract" : "expand"} label={full ? "Quitter le plein écran" : "Plein écran"} onPress={toggleFull} size={22} />
      </View>
    </View>
  ) : null;

  const view = (style: object) => (
    <View ref={box as never} style={[{ backgroundColor: "#000" }, style]}>
      <VideoView player={player} nativeControls={false} fullscreenOptions={{ enable: false }} contentFit="contain" style={{ width: "100%", height: "100%" }} />
      <Pressable onPress={() => setBar((v) => !v)} accessibilityLabel="Afficher ou masquer les contrôles" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <Watermark text={wm} />
      {controls}
    </View>
  );

  // Mobile : plein écran = vidéo tournée en paysage dans une fenêtre qui couvre tout l'écran
  if (!isWeb && full) {
    return (
      <>
        <View style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" }} />
        <Modal visible animationType="fade" statusBarTranslucent onRequestClose={() => setFull(false)}>
          <StatusBar hidden />
          <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
            {view({ width: win.height, height: win.width, transform: [{ rotate: "90deg" }] })}
          </View>
        </Modal>
      </>
    );
  }
  return view({ width: "100%", aspectRatio: 16 / 9 });
}

/** Lecture d'un clip vidéo exclusif acheté (flux protégé, captures d'écran bloquées). */
export default function Clip({ route, navigation }: { route: { params: { album: LibAlbum } }; navigation: { goBack: () => void } }) {
  usePreventScreenCapture("clip");
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const a = route.params.album;
  const [src, setSrc] = useState<Src | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const t = a.tracks.find((x) => x.available);

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
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8, paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}><BackBar onBack={navigation.goBack} label={a.title} /></View>
      {src ? <Video src={src} wm={wmText(a.fan)} /> : err ? <View style={{ paddingHorizontal: 20 }}><Banner text={err} /></View> : <ActivityIndicator color={c.rose} style={{ marginTop: 60 }} />}
      <View style={{ paddingHorizontal: 22, paddingTop: 22 }}>
        <Text style={{ fontFamily: serif, fontSize: 30, color: c.text }}>{a.title}</Text>
        <Text style={{ fontFamily: sans, fontSize: 14, color: c.muted, marginTop: 6 }}>Clip vidéo exclusif · Viviane Chidid</Text>
        <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted, marginTop: 14 }}>Contenu réservé : captures d'écran désactivées. Votre identifiant apparaît en filigrane sur la vidéo ; toute diffusion est tracée.</Text>
      </View>
    </View>
  );
}

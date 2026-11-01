import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, StatusBar, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trackSource, type LibAlbum } from "../api";
import { usePlayer } from "../player";
import { BackBar, Banner } from "../ui";
import Watermark, { wmText } from "../Watermark";
import { sans, serif, useTheme } from "../theme";

type Src = { uri: string; headers: Record<string, string> };

function RoundBtn({ icon, onPress, label }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={6}
      style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center", marginLeft: 8 }}>
      <Ionicons name={icon} size={20} color="#fff" />
    </Pressable>
  );
}

/** Lecteur : pause / lecture et barre de progression (contrôles natifs), ±10 s et plein écran (filigrane conservé). */
function Video({ src, wm }: { src: Src; wm: string }) {
  const player = useVideoPlayer({ uri: src.uri, headers: src.headers }, (p) => { p.loop = false; p.play(); });
  const [full, setFull] = useState(false);
  const box = useRef<unknown>(null);
  const win = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  // Sur le web : plein écran du conteneur (le filigrane reste par-dessus la vidéo)
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

  const controls = (
    <View style={{ position: "absolute", right: 8, top: 8, flexDirection: "row" }} pointerEvents="box-none">
      <RoundBtn icon="play-back" label="Reculer de 10 secondes" onPress={() => player.seekBy(-10)} />
      <RoundBtn icon="play-forward" label="Avancer de 10 secondes" onPress={() => player.seekBy(10)} />
      <RoundBtn icon={full ? "contract" : "expand"} label={full ? "Quitter le plein écran" : "Plein écran"} onPress={toggleFull} />
    </View>
  );

  const view = (style: object) => (
    <View ref={box as never} style={[{ backgroundColor: "#000" }, style]}>
      <VideoView player={player} nativeControls fullscreenOptions={{ enable: false }} contentFit="contain" style={{ width: "100%", height: "100%" }} />
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

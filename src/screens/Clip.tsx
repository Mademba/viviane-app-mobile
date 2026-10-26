import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trackSource, type LibAlbum } from "../api";
import { usePlayer } from "../player";
import { BackBar, Banner } from "../ui";
import { sans, serif, useTheme } from "../theme";

type Src = { uri: string; headers: Record<string, string> };

function Video({ src }: { src: Src }) {
  const player = useVideoPlayer({ uri: src.uri, headers: src.headers }, (p) => { p.loop = false; p.play(); });
  return <VideoView player={player} nativeControls fullscreenOptions={{ enable: true }} contentFit="contain" style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" }} />;
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
      {src ? <Video src={src} /> : err ? <View style={{ paddingHorizontal: 20 }}><Banner text={err} /></View> : <ActivityIndicator color={c.rose} style={{ marginTop: 60 }} />}
      <View style={{ paddingHorizontal: 22, paddingTop: 22 }}>
        <Text style={{ fontFamily: serif, fontSize: 30, color: c.text }}>{a.title}</Text>
        <Text style={{ fontFamily: sans, fontSize: 14, color: c.muted, marginTop: 6 }}>Clip vidéo exclusif · Viviane Chidid</Text>
        <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted, marginTop: 14 }}>Contenu réservé : captures et enregistrements d'écran désactivés.</Text>
      </View>
    </View>
  );
}

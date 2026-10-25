import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { useContent } from "../content";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Eyebrow } from "../ui";
import { sans, serif, useTheme } from "../theme";

const BARS = [0.4, 0.7, 0.55, 0.9, 0.65, 1, 0.6, 0.8, 0.45, 0.75, 0.5, 0.85];

function Bar({ h, delay, color }: { h: number; delay: number; color: string }) {
  const v = useRef(new Animated.Value(0.25)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 1200, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0.25, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [v, delay]);
  return <Animated.View style={{ flex: 1, height: `${h * 100}%`, borderRadius: 3, backgroundColor: color, transform: [{ scaleY: v }] }} />;
}

function BgVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; p.play(); });
  return <VideoView player={player} nativeControls={false} contentFit="cover" style={StyleSheet.absoluteFill} />;
}

export default function Welcome({ onEnter }: { onEnter: () => void }) {
  const { c, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const st = useContent().data?.settings;
  const media = Boolean(st?.welcome_video_url || st?.welcome_image_url);
  const fade = c.dark ? "25,1,4" : "255,246,244";
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <LinearGradient colors={c.dark ? ["#3a000c", "#190104"] : ["#ffd9e2", "#fff6f4"]} style={StyleSheet.absoluteFill} />
      {st?.welcome_image_url ? <Image source={{ uri: st.welcome_image_url }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
      {st?.welcome_video_url ? <BgVideo uri={st.welcome_video_url} /> : null}
      {!media ? (
        <>
          <View style={[styles.blob, { top: -90, right: -120, backgroundColor: c.rose, opacity: 0.45 }]} />
          <View style={[styles.blob, { top: 260, left: -150, backgroundColor: c.gold, opacity: 0.3 }]} />
          <View style={{ position: "absolute", left: 22, right: 22, bottom: 440, height: 130, flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
            {BARS.map((h, i) => <Bar key={i} h={h} delay={i * 130} color={c.dark ? "rgba(255,240,239,.22)" : "rgba(42,7,16,.14)"} />)}
          </View>
        </>
      ) : null}
      <LinearGradient colors={[`rgba(${fade},.1)`, `rgba(${fade},.55)`, `rgba(${fade},.96)`]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={{ position: "absolute", left: 28, right: 20, top: insets.top + 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow>Viviane Chidid</Eyebrow>
        <Pressable accessibilityRole="button" accessibilityLabel={c.dark ? "Passer en mode clair" : "Passer en mode sombre"} onPress={toggle}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: c.line, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18, color: c.text }}>{c.dark ? "☀" : "☾"}</Text>
        </Pressable>
      </View>
      <View style={{ position: "absolute", left: 28, right: 28, bottom: insets.bottom + 40 }}>
        <Eyebrow>L'application officielle</Eyebrow>
        <Text style={{ fontFamily: serif, fontSize: 46, lineHeight: 48, color: c.text, marginTop: 12 }}>{st?.welcome_title || "Bienvenue\ndans l'univers\nde Viviane"}</Text>
        <Text style={{ fontFamily: sans, fontSize: 16, lineHeight: 24, color: c.soft, marginTop: 16 }}>{st?.welcome_text || "Sa musique, ses actualités et ses concerts, partout avec vous."}</Text>
        <Button label={`${st?.welcome_button || "Clique ici"}  →`} onPress={onEnter} style={{ marginTop: 28, height: 60, borderRadius: 30 }} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({ blob: { position: "absolute", width: 420, height: 420, borderRadius: 210 } });

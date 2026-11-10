import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

/**
 * Filigrane discret (identifiant masqué du fan + date). Il ne gêne pas la lecture :
 * - une petite marque presque invisible reste dans un coin ;
 * - une seconde marque apparaît quelques secondes à un endroit aléatoire, puis disparaît en fondu.
 * Il ne bloque pas un film de l'écran, mais rend toute fuite traçable.
 */
/** Motif répété en diagonale sur tout l'écran, qui dérive lentement : difficile à recadrer ou à effacer, et lisible sur une vidéo filmée. */
function Tiled({ text, tone, alpha }: { text: string; tone: "light" | "dark"; alpha: number }) {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 14000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    a.start();
    return () => a.stop();
  }, [drift]);
  // Blanc cerclé de sombre : lisible sur fond clair comme sur fond foncé (pochette, vidéo)
  const ink = `rgba(255,255,255,${Math.min(0.75, alpha * 3.2)})`;
  const edge = `rgba(0,0,0,${Math.min(0.6, alpha * 2.6)})`;
  const rows = Array.from({ length: 30 });
  const line = `${text}   ·   ${text}   ·   ${text}   ·   ${text}`;
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", left: "-40%", right: "-40%", top: "-25%", bottom: "-25%", justifyContent: "space-around",
      transform: [{ rotate: "-24deg" }, { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-26, 26] }) }, { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [14, -14] }) }] }}>
      {rows.map((_, i) => (
        <Text key={i} numberOfLines={1} style={{ fontSize: 15, fontWeight: "700", letterSpacing: 1, color: ink, textShadowColor: edge, textShadowRadius: 2.5, textShadowOffset: { width: 0, height: 0 }, marginLeft: i % 2 ? -90 : 0 }}>{line}</Text>
      ))}
    </Animated.View>
  );
}

/** Une ou deux marques placées au centre de l'écran (un recadrage ne peut pas les retirer), discrètes mais lisibles. */
function Marks({ text, count, alpha }: { text: string; count: 1 | 2; alpha: number }) {
  const ink = `rgba(255,255,255,${Math.min(0.7, alpha * 3)})`;
  const edge = `rgba(0,0,0,${Math.min(0.55, alpha * 2.4)})`;
  const style = { fontSize: 14, fontWeight: "700" as const, letterSpacing: 0.8, color: ink, textShadowColor: edge, textShadowRadius: 2.5, textShadowOffset: { width: 0, height: 0 }, textAlign: "center" as const };
  // Positions : au milieu et à un tiers/deux tiers de la hauteur, légèrement inclinées, en évitant les bords
  const spots = count === 1 ? [{ top: "26%", rot: "-16deg" }] : [{ top: "26%", rot: "-16deg" }, { top: "57%", rot: "10deg" }];
  return (
    <>
      {spots.map((sp, i) => (
        <View key={i} pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: sp.top as `${number}%`, alignItems: "center", transform: [{ rotate: sp.rot }] }}>
          <Text numberOfLines={1} style={style}>{text}</Text>
        </View>
      ))}
    </>
  );
}

export default function Watermark({ text, opacity = 0.2, tiled, marks, tone = "light" }: { text: string; opacity?: number; tiled?: boolean; marks?: 1 | 2; tone?: "light" | "dark" }) {
  const fade = useRef(new Animated.Value(0)).current;
  const [pos, setPos] = useState({ left: 12, top: 30 });

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const cycle = () => {
      if (stop) return;
      // Position aléatoire, en évitant les barres de contrôle (haut et bas)
      setPos({ left: 6 + Math.random() * 40, top: 14 + Math.random() * 56 });
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.delay(5000),
        Animated.timing(fade, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start(() => { timer = setTimeout(cycle, 9000 + Math.random() * 6000); });
    };
    timer = setTimeout(cycle, 2500);
    return () => { stop = true; clearTimeout(timer); fade.stopAnimation(); };
  }, [fade]);

  const shadow = { textShadowColor: `rgba(0,0,0,${opacity})`, textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } };
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      {tiled ? <Tiled text={text} tone={tone} alpha={opacity} /> : null}
      {marks ? <Marks text={text} count={marks} alpha={opacity} /> : null}
      {/* Marque permanente, très discrète, dans un coin */}
      {marks ? null : <Text numberOfLines={1} style={[{ position: "absolute", right: 10, top: 8, fontSize: 9, letterSpacing: 0.6, color: `rgba(255,255,255,${opacity * 0.45})` }, shadow]}>{text}</Text>}
      {/* Marque mobile, visible quelques secondes */}
      {marks ? null : <Animated.Text
        numberOfLines={1}
        style={[{ position: "absolute", left: `${pos.left}%`, top: `${pos.top}%`, fontSize: 11, letterSpacing: 0.8, opacity: fade, color: `rgba(255,255,255,${Math.min(opacity * 1.6, 0.4)})` }, shadow]}
      >
        {text}
      </Animated.Text>}
    </View>
  );
}

export const wmText = (fan?: string) => `${fan ?? "Viviane Chidid"} · ${new Date().toLocaleDateString("fr-FR")}`;

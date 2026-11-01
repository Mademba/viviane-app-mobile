import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

/**
 * Filigrane discret (identifiant masqué du fan + date). Il ne gêne pas la lecture :
 * - une petite marque presque invisible reste dans un coin ;
 * - une seconde marque apparaît quelques secondes à un endroit aléatoire, puis disparaît en fondu.
 * Il ne bloque pas un film de l'écran, mais rend toute fuite traçable.
 */
export default function Watermark({ text, opacity = 0.2 }: { text: string; opacity?: number }) {
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
      {/* Marque permanente, très discrète, dans un coin */}
      <Text numberOfLines={1} style={[{ position: "absolute", right: 10, top: 8, fontSize: 9, letterSpacing: 0.6, color: `rgba(255,255,255,${opacity * 0.45})` }, shadow]}>{text}</Text>
      {/* Marque mobile, visible quelques secondes */}
      <Animated.Text
        numberOfLines={1}
        style={[{ position: "absolute", left: `${pos.left}%`, top: `${pos.top}%`, fontSize: 11, letterSpacing: 0.8, opacity: fade, color: `rgba(255,255,255,${Math.min(opacity * 1.6, 0.4)})` }, shadow]}
      >
        {text}
      </Animated.Text>
    </View>
  );
}

export const wmText = (fan?: string) => `${fan ?? "Viviane Chidid"} · ${new Date().toLocaleDateString("fr-FR")}`;

import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

/**
 * Filigrane mobile (identifiant masqué du fan + date) : il ne bloque pas un film de l'écran,
 * mais le rend traçable et dissuasif. Il dérive lentement pour ne pas pouvoir être rogné.
 */
export default function Watermark({ text, opacity = 0.2 }: { text: string; opacity?: number }) {
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(x, { toValue: -140, duration: 14000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 14000, easing: Easing.linear, useNativeDriver: true }),
    ]));
    const b = Animated.loop(Animated.sequence([
      Animated.timing(y, { toValue: 60, duration: 9000, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 9000, easing: Easing.linear, useNativeDriver: true }),
    ]));
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [x, y]);
  const rows = Array.from({ length: 14 });
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      <Animated.View style={{ position: "absolute", left: -200, top: -200, width: 1200, transform: [{ translateX: x }, { translateY: y }, { rotate: "-24deg" }] }}>
        {rows.map((_, i) => (
          <Text key={i} numberOfLines={1} style={{ marginLeft: (i % 2) * 90, marginBottom: 46, fontSize: 14, letterSpacing: 1.2, color: `rgba(255,255,255,${opacity})`, textShadowColor: `rgba(0,0,0,${opacity})`, textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } }}>
            {Array.from({ length: 5 }, () => text).join("      ")}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

export const wmText = (fan?: string) => `${fan ?? "Viviane Chidid"} · ${new Date().toLocaleDateString("fr-FR")}`;

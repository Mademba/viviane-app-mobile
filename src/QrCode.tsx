import React, { useMemo } from "react";
import { View } from "react-native";
// Générateur pur JS (sans module natif) : on dessine les modules avec des vues.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const QR = require("qrcode/lib/core/qrcode.js") as { create: (text: string, o?: { errorCorrectionLevel?: string }) => { modules: { size: number; get: (r: number, c: number) => number } } };

export default function QrCode({ value, size = 168 }: { value: string; size?: number }) {
  const rows = useMemo(() => {
    const m = QR.create(value, { errorCorrectionLevel: "M" }).modules;
    const out: { x: number; w: number }[][] = [];
    for (let r = 0; r < m.size; r++) {
      const runs: { x: number; w: number }[] = [];
      for (let c = 0; c < m.size; c++) {
        if (!m.get(r, c)) continue;
        const last = runs[runs.length - 1];
        if (last && last.x + last.w === c) last.w++; else runs.push({ x: c, w: 1 });
      }
      out.push(runs);
    }
    return { out, n: m.size };
  }, [value]);
  const quiet = 2;
  const cell = size / (rows.n + quiet * 2);
  return (
    <View accessibilityLabel={`QR code ${value}`} style={{ width: size, height: size, backgroundColor: "#fff", borderRadius: 8, padding: cell * quiet }}>
      {rows.out.map((runs, r) => (
        <View key={r} style={{ height: cell, width: cell * rows.n }}>
          {runs.map((s) => <View key={s.x} style={{ position: "absolute", left: s.x * cell, width: s.w * cell + 0.4, height: cell + 0.4, backgroundColor: "#1a0a10" }} />)}
        </View>
      ))}
    </View>
  );
}

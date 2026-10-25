import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthError, fetchLibrary, getToken, redeem, type LibAlbum } from "../api";
import { usePlayer } from "../player";
import { Banner, Body, Button, Cover, Eyebrow, H1, fmtDate } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

export function CodeLogin({ onDone }: { onDone: () => void }) {
  const { c } = useTheme();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setBusy(true); setErr(null);
    try { await redeem(code); onDone(); } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  };
  return (
    <View style={{ gap: 14 }}>
      <Body>Entrez le code d'accès reçu par e-mail après votre achat pour retrouver vos albums.</Body>
      <TextInput
        value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false}
        placeholder="XXXXX-XXXXX" placeholderTextColor={c.muted} accessibilityLabel="Code d'accès"
        style={{ height: 56, borderRadius: 12, borderWidth: 1, borderColor: c.line, paddingHorizontal: 16, color: c.text, fontFamily: sansBold, fontSize: 18, letterSpacing: 2, backgroundColor: c.card }}
      />
      {err ? <Banner text={err} /> : null}
      <Button label={busy ? "Vérification…" : "Accéder à ma musique"} onPress={go} disabled={busy || code.trim().length < 4} />
    </View>
  );
}

export default function Music({ onOpenPlayer }: { onOpenPlayer: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [albums, setAlbums] = useState<LibAlbum[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    if (!(await getToken())) return setState("login");
    try { setAlbums(await fetchLibrary()); setState("ready"); }
    catch (e) { if (e instanceof AuthError) setState("login"); else { setErr(e instanceof Error ? e.message : "Erreur"); setState("ready"); } }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 20, gap: 4, marginBottom: 12 }}><Eyebrow>Viviane Chidid</Eyebrow><H1>Ma musique</H1></View>
      {state === "loading" ? <ActivityIndicator color={c.rose} style={{ marginTop: 40 }} /> : null}
      {state === "login" ? <View style={{ paddingHorizontal: 20 }}><CodeLogin onDone={load} /></View> : null}
      {state === "ready" ? (
        <FlatList
          data={albums} keyExtractor={(a) => a.order_id} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 24 }}
          ListHeaderComponent={err ? <Banner text={err} /> : undefined}
          ListEmptyComponent={<Body>Aucun album pour le moment.</Body>}
          renderItem={({ item: a }) => (
            <View>
              <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
                <Cover uri={a.cover_url} size={92} label={`Pochette ${a.title}`} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: serif, fontSize: 24, color: c.text }}>{a.title}</Text>
                  <Text style={{ fontFamily: sans, fontSize: 13, color: c.muted, marginTop: 2 }}>
                    {a.released ? `${a.tracks.length} titres` : a.release_date ? `Disponible le ${fmtDate(a.release_date)}` : "Bientôt disponible"}
                  </Text>
                </View>
              </View>
              {a.tracks.map((t, i) => {
                const active = p.now?.album.album_id === a.album_id && p.now.index === i;
                return (
                  <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={`Écouter ${t.title}`} disabled={!t.available}
                    onPress={async () => { await p.play(a, i); onOpenPlayer(); }}
                    style={{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderBottomWidth: 1, borderBottomColor: c.line, opacity: t.available ? 1 : 0.45 }}>
                    <Text style={{ width: 24, textAlign: "right", fontFamily: sans, color: c.muted }}>{String(t.position).padStart(2, "0")}</Text>
                    <Text style={{ flex: 1, fontFamily: active ? sansBold : sans, fontSize: 16, color: active ? c.gold : c.text }}>{t.title}</Text>
                    <Text style={{ color: c.pink, fontSize: 16 }}>{active && p.playing ? "❚❚" : t.available ? "▶" : "🔒"}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
      ) : null}
    </View>
  );
}

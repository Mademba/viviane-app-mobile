import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { go } from "../nav";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthError, fetchLibrary, getToken, redeem, type LibAlbum } from "../api";
import { usePlayer } from "../player";
import { Banner, Body, Button, Cover, TopBar, fmtDate } from "../ui";
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

type Filter = "all" | "album" | "single";

function Folder({ a, onPress }: { a: LibAlbum; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${a.title}`} onPress={onPress} style={{ flex: 1 }}>
      <View style={{ borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
        <Cover uri={a.cover_url} size="100%" radius={16} label={`Pochette ${a.title}`} />
        <View style={{ position: "absolute", right: 10, bottom: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(25,1,4,.78)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="play" size={15} color="#fff" />
        </View>
      </View>
      <Text numberOfLines={2} style={{ fontFamily: sansBold, fontSize: 15, color: c.text, marginTop: 9 }}>{a.title}</Text>
      <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted, marginTop: 2 }}>{a.kind === "single" ? "Single" : "Album"} · {a.tracks.length} titre{a.tracks.length > 1 ? "s" : ""}</Text>
    </Pressable>
  );
}

const daysUntil = (iso: string | null) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400e3)) : null);

export default function Music({ onOpenPlayer }: { onOpenPlayer: () => void }) {
  void onOpenPlayer;
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [albums, setAlbums] = useState<LibAlbum[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setErr(null);
    if (!(await getToken())) return setState("login");
    try { setAlbums(await fetchLibrary()); setState("ready"); }
    catch (e) { if (e instanceof AuthError) setState("login"); else { setErr(e instanceof Error ? e.message : "Erreur"); setState("ready"); } }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const list = albums.filter((a) => filter === "all" || (filter === "single" ? a.kind === "single" : a.kind !== "single"));
  const soon = list.filter((a) => !a.released);
  const ready = list.filter((a) => a.released);
  const rows: LibAlbum[][] = [];
  for (let i = 0; i < ready.length; i += 2) rows.push(ready.slice(i, i + 2));
  const open = (a: LibAlbum) => go("Collection", { album: a });
  const h = (t: string) => <Text style={{ fontFamily: serif, fontSize: 22, color: c.text, marginTop: 24, marginBottom: 12 }}>{t}</Text>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 140 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.rose} />}>
      <TopBar title="Ma musique" />
      {state === "loading" ? <ActivityIndicator color={c.rose} style={{ marginTop: 40 }} /> : null}
      {state === "login" ? <View style={{ marginTop: 16 }}><CodeLogin onDone={load} /></View> : null}
      {state === "ready" ? (
        <>
          {err || p.error ? <View style={{ marginTop: 12 }}><Banner text={(err ?? p.error)!} /></View> : null}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
            {([["all", "Tout"], ["album", "Albums"], ["single", "Singles"]] as const).map(([k, l]) => (
              <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: filter === k }} onPress={() => setFilter(k)}
                style={{ height: 40, paddingHorizontal: 18, borderRadius: 20, justifyContent: "center", borderWidth: 1, borderColor: filter === k ? c.rose : c.line, backgroundColor: filter === k ? c.rose : "transparent" }}>
                <Text style={{ fontFamily: sansBold, fontSize: 13, color: filter === k ? c.onRose : c.text }}>{l}</Text>
              </Pressable>
            ))}
          </View>

          {soon.length ? (
            <>
              {h("À venir")}
              <View style={{ gap: 12 }}>
                {soon.map((a) => {
                  const d = daysUntil(a.release_date);
                  return (
                    <Pressable key={a.album_id} accessibilityRole="button" onPress={() => open(a)} style={{ flexDirection: "row", gap: 14, alignItems: "center", padding: 12, borderRadius: 18, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
                      <View style={{ opacity: 0.8 }}><Cover uri={a.cover_url} size={88} radius={12} /></View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ alignSelf: "flex-start", backgroundColor: c.gold, color: "#190104", fontFamily: sansBold, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, overflow: "hidden" }}>Précommande</Text>
                        <Text numberOfLines={2} style={{ fontFamily: sansBold, fontSize: 17, color: c.text }}>{a.title}</Text>
                        <Text style={{ fontFamily: sans, fontSize: 13, color: c.muted }}>
                          {d === null ? "Bientôt disponible" : d <= 1 ? "Disponible demain" : `Disponible dans ${d} jours`}{a.release_date ? ` · ${fmtDate(a.release_date)}` : ""}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {h("Ma collection")}
          {!ready.length ? <Body>{albums.length ? "Rien dans cette catégorie pour le moment." : "Aucun album pour le moment."}</Body> : null}
          <View style={{ gap: 20 }}>
            {rows.map((r, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 16 }}>
                {r.map((a) => <Folder key={a.album_id} a={a} onPress={() => open(a)} />)}
                {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { go, goTab } from "../nav";
import { useSecureScreen } from "../secure";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthError, claimCode, fetchLibrary, getToken, type LibAlbum } from "../api";
import { usePlayer } from "../player";
import { Banner, Body, Button, Cover, FilterChip, Page, TopBar, cardLook, fmtDate, tintOf, COL } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

/** Ajoute un nouvel achat à la collection avec son code d'accès (reçu par e-mail après le paiement). */
function AddCode({ onAdded }: { onAdded: () => void }) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setErr(null); setOk(null);
    try {
      const r = await claimCode(code);
      setOk(r.already ? `« ${r.title ?? "Cet achat"} » est déjà dans votre collection.` : `« ${r.title ?? "Votre achat"} » a été ajouté à votre collection.`);
      setCode(""); setOpen(false); onAdded();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  };
  return (
    <View style={{ marginTop: 14, gap: 12 }}>
      {ok ? <Banner kind="info" text={ok} /> : null}
      {!open ? (
        <Pressable accessibilityRole="button" onPress={() => { setOpen(true); setOk(null); }} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 22, backgroundColor: tintOf(c) }}>
          <Ionicons name="gift-outline" size={24} color={c.rose} />
          <Text style={{ flex: 1, fontFamily: sans, fontSize: 13, lineHeight: 18, color: c.text }}><Text style={{ fontFamily: sansBold }}>Un nouvel achat ?</Text> Entrez votre code pour l'ajouter ici.</Text>
          <View style={{ paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: c.rose, justifyContent: "center" }}><Text style={{ fontFamily: sansBold, fontSize: 12, color: c.onRose }}>Ajouter</Text></View>
        </Pressable>
      ) : (
        <View style={[{ gap: 12, padding: 16, borderRadius: 24 }, cardLook(c)]}>
          <Body>Entrez le code d'accès reçu par e-mail après votre achat : l'album, le single ou le clip sera ajouté à votre collection.</Body>
          <TextInput
            value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false}
            placeholder="XXXXX-XXXXX" placeholderTextColor={c.muted} accessibilityLabel="Code d'accès"
            style={{ height: 54, borderRadius: 12, borderWidth: 1, borderColor: c.line, paddingHorizontal: 16, color: c.text, fontFamily: sansBold, fontSize: 18, letterSpacing: 2, backgroundColor: c.bg }}
          />
          {err ? <Banner text={err} /> : null}
          <Button label={busy ? "Vérification…" : "Ajouter à ma collection"} onPress={submit} disabled={busy || code.trim().length < 4} />
          <Button ghost label="Annuler" onPress={() => { setOpen(false); setErr(null); }} disabled={busy} />
        </View>
      )}
    </View>
  );
}

/** Visiteur non connecté : la connexion se fait dans l'onglet Profil. */
function Guest() {
  const { c } = useTheme();
  return (
    <View style={[{ marginTop: 24, padding: 22, borderRadius: 26, gap: 14, alignItems: "flex-start" }, cardLook(c)]}>
      <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: tintOf(c), alignItems: "center", justifyContent: "center" }}><Ionicons name="musical-notes-outline" size={26} color={c.rose} /></View>
      <Text style={{ fontFamily: serif, fontSize: 24, color: c.text }}>Retrouvez vos achats</Text>
      <Body>Connectez-vous à votre compte depuis votre profil avec l'adresse e-mail de vos achats : vos albums, singles et clips apparaissent ici. Vous restez connecté jusqu'à votre déconnexion.</Body>
      <Button label="Aller à mon profil" onPress={() => goTab("Profil")} />
    </View>
  );
}

type Filter = "all" | "album" | "single" | "clip";
const KIND: Record<string, string> = { album: "Album", single: "Single", clip: "Clip vidéo" };

function Folder({ a, onPress }: { a: LibAlbum; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${a.title}`} onPress={onPress} style={{ flex: 1 }}>
      <View style={[{ borderRadius: 22, overflow: "hidden" }, cardLook(c)]}>
        <Cover uri={a.cover_url} size="100%" radius={0} label={`Pochette ${a.title}`} />
        <View style={{ position: "absolute", right: 10, bottom: 10, width: 38, height: 38, borderRadius: 19, backgroundColor: c.rose, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={a.kind === "clip" ? "videocam" : "play"} size={16} color="#fff" />
        </View>
      </View>
      <Text numberOfLines={2} style={{ fontFamily: serif, fontSize: 19, lineHeight: 21, color: c.text, marginTop: 10 }}>{a.title}</Text>
      <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted, marginTop: 2 }}>{KIND[a.kind ?? "album"]}{a.kind === "clip" ? "" : ` · ${a.tracks.length} titre${a.tracks.length > 1 ? "s" : ""}`}</Text>
    </Pressable>
  );
}

const daysUntil = (iso: string | null) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400e3)) : null);

export default function Music({ onOpenPlayer }: { onOpenPlayer: () => void }) {
  void onOpenPlayer;
  useSecureScreen("music");
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const [state, setState] = useState<"loading" | "guest" | "ready">("loading");
  const [albums, setAlbums] = useState<LibAlbum[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setErr(null);
    if (!(await getToken())) { setAlbums([]); return setState("guest"); }
    try { setAlbums(await fetchLibrary()); setState("ready"); }
    catch (e) { if (e instanceof AuthError) { setAlbums([]); setState("guest"); } else { setErr(e instanceof Error ? e.message : "Erreur"); setState("ready"); } }
  }, []);
  // Rechargé à chaque fois que l'onglet est affiché (connexion ou achat fait depuis un autre onglet)
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const list = albums.filter((a) => filter === "all" || (a.kind ?? "album") === filter);
  const soon = list.filter((a) => !a.released);
  const ready = list.filter((a) => a.released);
  const rows: LibAlbum[][] = [];
  for (let i = 0; i < ready.length; i += 2) rows.push(ready.slice(i, i + 2));
  const open = (a: LibAlbum) => go("Collection", { album: a });
  const h = (t: string) => <Text style={{ fontFamily: serif, fontSize: 24, color: c.text, marginTop: 24, marginBottom: 12 }}>{t}</Text>;

  return (
    <Page>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ ...COL, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 140 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.rose} />}>
      <TopBar title="Ma musique" sub="Tout ce que vous avez acheté" />
      {state === "loading" ? <ActivityIndicator color={c.rose} style={{ marginTop: 40 }} /> : null}
      {state === "guest" ? <Guest /> : null}
      {state === "ready" ? (
        <>
          {err || p.error ? <View style={{ marginTop: 12 }}><Banner text={(err ?? p.error)!} /></View> : null}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {([["all", "Tout"], ["album", "Albums"], ["single", "Singles"], ["clip", "Clips"]] as const).map(([k, l]) => <FilterChip key={k} label={l} on={filter === k} onPress={() => setFilter(k)} />)}
          </View>

          <AddCode onAdded={load} />
          {soon.length ? (
            <>
              {h("À venir")}
              <View style={{ gap: 12 }}>
                {soon.map((a) => {
                  const d = daysUntil(a.release_date);
                  return (
                    <Pressable key={a.album_id} accessibilityRole="button" onPress={() => open(a)} style={[{ flexDirection: "row", gap: 14, alignItems: "center", padding: 12, borderRadius: 24 }, cardLook(c)]}>
                      <View style={{ opacity: 0.85 }}><Cover uri={a.cover_url} size={88} radius={18} /></View>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ alignSelf: "flex-start", backgroundColor: tintOf(c), color: c.gold, fontFamily: sansBold, fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, overflow: "hidden" }}>Précommande</Text>
                        <Text numberOfLines={2} style={{ fontFamily: serif, fontSize: 21, lineHeight: 23, color: c.text }}>{a.title}</Text>
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

          {soon.length ? <View style={{ height: 24 }} /> : <View style={{ height: 20 }} />}
          {!ready.length ? <Body>{albums.length ? (filter === "clip" ? "Aucun clip acheté pour le moment." : "Rien dans cette catégorie pour le moment.") : "Aucun achat pour le moment."}</Body> : null}
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
    </Page>
  );
}

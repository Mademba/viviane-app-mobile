import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { go, goTab } from "../nav";
import { usePreventScreenCapture } from "expo-screen-capture";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthError, claimCode, fetchLibrary, getToken, type LibAlbum } from "../api";
import { usePlayer } from "../player";
import { Banner, Body, Button, Cover, TopBar, fmtDate } from "../ui";
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
        <Pressable accessibilityRole="button" onPress={() => { setOpen(true); setOk(null); }} style={{ minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: c.gold, borderStyle: "dashed", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Ionicons name="add-circle-outline" size={20} color={c.gold} />
          <Text style={{ fontFamily: sansBold, fontSize: 14, color: c.gold }}>Ajouter un achat avec un code</Text>
        </Pressable>
      ) : (
        <View style={{ gap: 12, padding: 14, borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
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
    <View style={{ marginTop: 24, padding: 22, borderRadius: 20, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, gap: 14, alignItems: "flex-start" }}>
      <Ionicons name="musical-notes-outline" size={34} color={c.gold} />
      <Text style={{ fontFamily: serif, fontSize: 24, color: c.text }}>Retrouvez vos achats</Text>
      <Body>Connectez-vous à votre compte depuis votre profil avec l'adresse e-mail de vos achats : vos albums, singles et clips apparaissent ici. Vous restez connecté jusqu'à votre déconnexion.</Body>
      <Button label="Aller à mon profil" onPress={() => goTab("Profil")} />
    </View>
  );
}

type Filter = "all" | "album" | "single";
const KIND: Record<string, string> = { album: "Album", single: "Single", clip: "Clip vidéo" };

function Folder({ a, onPress }: { a: LibAlbum; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${a.title}`} onPress={onPress} style={{ flex: 1 }}>
      <View style={{ borderRadius: 16, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
        <Cover uri={a.cover_url} size="100%" radius={16} label={`Pochette ${a.title}`} />
        <View style={{ position: "absolute", right: 10, bottom: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(25,1,4,.78)", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={a.kind === "clip" ? "videocam" : "play"} size={15} color="#fff" />
        </View>
      </View>
      <Text numberOfLines={2} style={{ fontFamily: sansBold, fontSize: 15, color: c.text, marginTop: 9 }}>{a.title}</Text>
      <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted, marginTop: 2 }}>{KIND[a.kind ?? "album"]}{a.kind === "clip" ? "" : ` · ${a.tracks.length} titre${a.tracks.length > 1 ? "s" : ""}`}</Text>
    </Pressable>
  );
}

function ClipFolder({ clips, onPress }: { clips: LibAlbum[]; onPress: () => void }) {
  const { c } = useTheme();
  const n = clips.length;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir le dossier Mes clips (${n})`} onPress={onPress}
      style={{ flexDirection: "row", alignItems: "center", gap: 16, padding: 14, marginBottom: 20, borderRadius: 18, backgroundColor: c.card, borderWidth: 1, borderColor: c.line }}>
      <View style={{ width: 92, height: 72 }}>
        {clips.slice(0, 3).map((a, i) => (
          <View key={a.album_id} style={{ position: "absolute", left: i * 14, top: (2 - Math.min(i, 2)) * 0, width: 64, height: 64, borderRadius: 10, overflow: "hidden", borderWidth: 2, borderColor: c.card, zIndex: 3 - i, transform: [{ translateY: i * 3 }] }}>
            <Cover uri={a.cover_url} size="fill" radius={0} />
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: sansBold, fontSize: 17, color: c.text }}>Mes clips</Text>
        <Text style={{ fontFamily: sans, fontSize: 13, color: c.muted, marginTop: 2 }}>{n} clip{n > 1 ? "s" : ""} vidéo exclusif{n > 1 ? "s" : ""}</Text>
      </View>
      <Ionicons name="folder-open-outline" size={24} color={c.gold} />
    </Pressable>
  );
}

const daysUntil = (iso: string | null) => (iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400e3)) : null);

export default function Music({ onOpenPlayer }: { onOpenPlayer: () => void }) {
  void onOpenPlayer;
  usePreventScreenCapture("music");
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const p = usePlayer();
  const [state, setState] = useState<"loading" | "guest" | "ready">("loading");
  const [albums, setAlbums] = useState<LibAlbum[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [inClips, setInClips] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    if (!(await getToken())) { setAlbums([]); return setState("guest"); }
    try { setAlbums(await fetchLibrary()); setState("ready"); }
    catch (e) { if (e instanceof AuthError) { setAlbums([]); setState("guest"); } else { setErr(e instanceof Error ? e.message : "Erreur"); setState("ready"); } }
  }, []);
  // Rechargé à chaque fois que l'onglet est affiché (connexion ou achat fait depuis un autre onglet)
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const clips = albums.filter((a) => a.kind === "clip");
  const others = albums.filter((a) => a.kind !== "clip");
  const list = (inClips ? clips : others).filter((a) => inClips || filter === "all" || (a.kind ?? "album") === filter);
  const soon = list.filter((a) => !a.released);
  const ready = list.filter((a) => a.released);
  const rows: LibAlbum[][] = [];
  for (let i = 0; i < ready.length; i += 2) rows.push(ready.slice(i, i + 2));
  const showClipFolder = !inClips && clips.length > 0 && filter === "all";
  const open = (a: LibAlbum) => go("Collection", { album: a });
  const h = (t: string) => <Text style={{ fontFamily: serif, fontSize: 22, color: c.text, marginTop: 24, marginBottom: 12 }}>{t}</Text>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 140 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={c.rose} />}>
      <TopBar title="Ma musique" />
      {state === "loading" ? <ActivityIndicator color={c.rose} style={{ marginTop: 40 }} /> : null}
      {state === "guest" ? <Guest /> : null}
      {state === "ready" ? (
        <>
          {err || p.error ? <View style={{ marginTop: 12 }}><Banner text={(err ?? p.error)!} /></View> : null}
          {!inClips ? <AddCode onAdded={load} /> : null}
          {inClips ? (
            <Pressable accessibilityRole="button" onPress={() => setInClips(false)} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, marginTop: 8 }}>
              <Ionicons name="chevron-back" size={20} color={c.gold} />
              <Text style={{ fontFamily: sansBold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: c.gold }}>Ma collection</Text>
            </Pressable>
          ) : null}
          {!inClips ? <View style={{ flexDirection: "row", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            {([["all", "Tout"], ["album", "Albums"], ["single", "Singles"]] as const).map(([k, l]) => (
              <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: filter === k }} onPress={() => setFilter(k)}
                style={{ height: 40, paddingHorizontal: 15, borderRadius: 20, justifyContent: "center", borderWidth: 1, borderColor: filter === k ? c.rose : c.line, backgroundColor: filter === k ? c.rose : "transparent" }}>
                <Text style={{ fontFamily: sansBold, fontSize: 13, color: filter === k ? c.onRose : c.text }}>{l}</Text>
              </Pressable>
            ))}
          </View> : null}

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

          {h(inClips ? "Mes clips" : "Ma collection")}
          {showClipFolder ? <ClipFolder clips={clips} onPress={() => setInClips(true)} /> : null}
          {!ready.length && !showClipFolder ? <Body>{albums.length ? "Rien dans cette catégorie pour le moment." : "Aucun album pour le moment."}</Body> : null}
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

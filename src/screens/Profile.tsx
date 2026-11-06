import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import Constants from "expo-constants";
import { secureState } from "../secure";
import { API_URL } from "../config";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthError, fetchDevices, getToken, logout, removeDevice, type DeviceOrder } from "../api";
import { AccountLogin } from "./Login";
import { Banner, Body, Button, Page, TopBar, cardLook, tintOf } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

export default function Profile() {
  const { c, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const [logged, setLogged] = useState<boolean | null>(null);
  const [orders, setOrders] = useState<DeviceOrder[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    if (!(await getToken())) return setLogged(false);
    try { setOrders(await fetchDevices()); setLogged(true); }
    catch (e) { if (e instanceof AuthError) setLogged(false); else { setErr(e instanceof Error ? e.message : "Erreur"); setLogged(true); } }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const Stat = ({ n, label, gold }: { n: string; label: string; gold?: boolean }) => (
    <View style={{ flex: 1, paddingVertical: 12, borderRadius: 18, alignItems: "center", backgroundColor: gold ? (c.dark ? "rgba(227,173,75,.16)" : "#fdf0d3") : tintOf(c) }}>
      <Text style={{ fontFamily: serif, fontSize: 26, color: gold ? c.gold : c.rose }}>{n}</Text>
      <Text style={{ fontFamily: sansBold, fontSize: 11, color: c.muted }}>{label}</Text>
    </View>
  );

  return (
    <Page>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 130, gap: 14 }}>
      <TopBar title="Profil" sub="Votre compte fan" />
      {err ? <Banner text={err} /> : null}
      {logged === false ? <AccountLogin onDone={load} /> : null}
      {logged ? orders.map((o) => {
        const first = (o.name ?? o.email ?? "?").trim().charAt(0).toUpperCase();
        return (
          <React.Fragment key={o.order_id ?? "compte"}>
            <View style={[{ borderRadius: 26, padding: 18, gap: 16 }, cardLook(c)]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: c.rose, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontFamily: sansBold, fontSize: 24, color: c.onRose }}>{first}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontFamily: serif, fontSize: 24, color: c.text }}>{o.name ?? o.title}</Text>
                  {o.email ? <Text numberOfLines={1} style={{ fontFamily: sans, fontSize: 13, color: c.muted }}>{o.email}</Text> : null}
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Stat n={`${o.devices.length}/${o.max}`} label="appareil" gold />
              </View>
            </View>
            <View style={[{ borderRadius: 26, padding: 16, gap: 10 }, cardLook(c)]}>
              <Text style={{ fontFamily: sansBold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: c.gold }}>Mon appareil</Text>
              {o.devices.map((d) => (
                <View key={d.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 20, backgroundColor: c.dark ? "rgba(255,240,239,.05)" : "#fff7f4" }}>
                  <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: tintOf(c), alignItems: "center", justifyContent: "center" }}><Ionicons name="phone-portrait-outline" size={20} color={c.rose} /></View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: sansBold, fontSize: 14, color: c.text }}>{d.name}</Text>
                    <Text style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>{d.current ? "Cet appareil" : "Autre appareil"}</Text>
                  </View>
                  {d.current ? <Text style={{ fontFamily: sansBold, fontSize: 11, color: "#1d8a4a" }}>Actif</Text>
                    : <Button ghost label="Retirer" style={{ minHeight: 40, paddingHorizontal: 14 }} onPress={async () => { try { await removeDevice(d.id); await load(); } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } }} />}
                </View>
              ))}
              <Body style={{ fontSize: 12, color: c.muted }}>Votre compte est lié à votre adresse e-mail et fonctionne sur un seul appareil à la fois. Vos nouveaux achats apparaissent automatiquement dans « Ma musique ».</Body>
            </View>
          </React.Fragment>
        );
      }) : null}
      <Pressable accessibilityRole="button" onPress={toggle} style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, paddingHorizontal: 18, borderRadius: 22 }, cardLook(c)]}>
        <Text style={{ fontFamily: sansBold, fontSize: 14, color: c.text }}>{c.dark ? "Passer en mode clair" : "Passer en mode sombre"}</Text>
        <Ionicons name={c.dark ? "sunny-outline" : "moon-outline"} size={20} color={c.rose} />
      </Pressable>
      {logged ? <Button ghost label="Se déconnecter" onPress={async () => { await logout(); setOrders([]); setLogged(false); }} /> : null}
      <Body style={{ fontSize: 12, color: c.muted, textAlign: "center" }}>Version {Application.nativeApplicationVersion ?? "dev"} (build {Application.nativeBuildVersion ?? "dev"}) · {API_URL.replace("https://", "")}{(Constants.expoConfig?.extra as { commit?: string } | undefined)?.commit ? ` · ${(Constants.expoConfig?.extra as { commit?: string }).commit}` : ""}</Body>
      <Pressable accessibilityRole="button" onPress={() => setErr(null)} onLongPress={() => undefined}>
        <Body style={{ fontSize: 12, color: c.muted, textAlign: "center" }}>
          Anti-capture : {secureState.ok === null ? "pas encore activé (ouvrez Ma musique ou le lecteur)" : secureState.ok ? "actif" : `ERREUR — ${secureState.error}`}
        </Body>
      </Pressable>
    </ScrollView>
    </Page>
  );
}

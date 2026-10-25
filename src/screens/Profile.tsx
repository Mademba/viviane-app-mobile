import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import * as Application from "expo-application";
import { API_URL } from "../config";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthError, fetchDevices, getToken, removeDevice, setToken, type DeviceOrder } from "../api";
import { CodeLogin } from "./Music";
import { Banner, Body, Button, Eyebrow, H1 } from "../ui";
import { sans, sansBold, useTheme } from "../theme";

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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}>
      <View style={{ gap: 4 }}><Eyebrow>Viviane Chidid</Eyebrow><H1>Profil</H1></View>
      {err ? <Banner text={err} /> : null}
      {logged === false ? <CodeLogin onDone={load} /> : null}
      {logged ? orders.map((o) => (
        <View key={o.order_id} style={{ borderRadius: 16, backgroundColor: c.card, borderWidth: 1, borderColor: c.line, padding: 14, gap: 8 }}>
          <Text style={{ fontFamily: sansBold, fontSize: 16, color: c.text }}>{o.title}</Text>
          <Text style={{ fontFamily: sans, fontSize: 13, color: c.muted }}>Code {o.access_code} · {o.devices.length}/{o.max} appareils</Text>
          {o.devices.map((d) => (
            <View key={d.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
              <Text style={{ fontFamily: sans, color: c.text, flex: 1 }}>{d.name}{d.current ? " (cet appareil)" : ""}</Text>
              {!d.current ? <Button ghost label="Retirer" style={{ minHeight: 40, paddingHorizontal: 14 }} onPress={async () => { try { await removeDevice(d.id); await load(); } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } }} /> : null}
            </View>
          ))}
        </View>
      )) : null}
      <Button ghost label={c.dark ? "Mode clair" : "Mode sombre"} onPress={toggle} />
      {logged ? <Button ghost label="Se déconnecter de cet appareil" onPress={async () => { await setToken(null); setOrders([]); setLogged(false); }} /> : null}
      <Body style={{ fontSize: 12, color: c.muted }}>Version {Application.nativeApplicationVersion ?? "dev"} (build {Application.nativeBuildVersion ?? "dev"}) · {API_URL.replace("https://", "")}</Body>
      <Body style={{ fontSize: 12, color: c.muted }}>Chaque achat d'album fonctionne sur 2 appareils au maximum.</Body>
    </ScrollView>
  );
}

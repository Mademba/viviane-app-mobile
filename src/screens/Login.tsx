import React, { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { ApiError, requestLoginCode, verifyLoginCode } from "../api";
import { Banner, Body, Button, Field, validEmail } from "../ui";
import { sans, sansBold, serif, useTheme } from "../theme";

/** Compte fan : e-mail → code à 6 chiffres reçu par e-mail. Le premier passage crée le compte. */
export function AccountLogin({ onDone }: { onDone: () => void }) {
  const { c } = useTheme();
  const [step, setStep] = useState<"email" | "code" | "replace">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [other, setOther] = useState("un autre appareil");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  // Délai avant de pouvoir redemander un code
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const send = async () => {
    setErr(null); setInfo(null);
    const em = email.trim().toLowerCase();
    if (!validEmail(em)) return setErr("Entrez une adresse e-mail valide.");
    setBusy(true);
    try { await requestLoginCode(em); setEmail(em); setCode(""); setStep("code"); setWait(45); setInfo(`Un code à 6 chiffres vient d'être envoyé à ${em}. Pensez à vérifier vos courriers indésirables.`); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  };

  const verify = async (replace = false) => {
    setErr(null); setInfo(null);
    setBusy(true);
    try { await verifyLoginCode(email, code, replace); onDone(); }
    catch (e) {
      if (e instanceof ApiError && e.code === "device_limit") { setOther(String(e.data?.other_name ?? "un autre appareil")); setStep("replace"); }
      else {
        setErr(e instanceof Error ? e.message : "Erreur");
        if (e instanceof ApiError && e.code === "expired") setCode("");
      }
    } finally { setBusy(false); }
  };

  return (
    <View style={{ gap: 14 }}>
      <Text style={{ fontFamily: serif, fontSize: 24, color: c.text }}>Se connecter ou créer un compte</Text>
      {step === "email" ? (
        <>
          <Body>Entrez l'adresse e-mail utilisée pour vos achats. Vous recevrez un code à 6 chiffres : s'il s'agit de votre première connexion, votre compte est créé automatiquement. Vos achats apparaissent ensuite dans « Ma musique », même si vous changez de téléphone.</Body>
          <Field label="Adresse e-mail" value={email} onChange={setEmail} keyboard="email-address" placeholder="vous@exemple.com" />
          {err ? <Banner text={err} /> : null}
          <Button label={busy ? "Envoi du code…" : "Recevoir mon code"} onPress={send} disabled={busy || email.trim().length < 5} />
        </>
      ) : null}
      {step === "code" ? (
        <>
          {info ? <Banner kind="info" text={info} /> : null}
          <TextInput
            value={code} onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" autoCorrect={false} maxLength={6}
            placeholder="000000" placeholderTextColor={c.muted} accessibilityLabel="Code de connexion à 6 chiffres" textContentType="oneTimeCode" autoComplete="one-time-code"
            style={{ height: 60, borderRadius: 12, borderWidth: 1, borderColor: c.line, paddingHorizontal: 16, color: c.text, fontFamily: sansBold, fontSize: 26, letterSpacing: 10, textAlign: "center", backgroundColor: c.card }}
          />
          {err ? <Banner text={err} /> : null}
          <Button label={busy ? "Vérification…" : "Me connecter"} onPress={() => verify(false)} disabled={busy || code.length !== 6} />
          <Button ghost label={wait > 0 ? `Renvoyer le code (${wait} s)` : "Renvoyer le code"} onPress={send} disabled={busy || wait > 0} />
          <Pressable accessibilityRole="button" onPress={() => { setStep("email"); setErr(null); setInfo(null); }} style={{ minHeight: 40, justifyContent: "center" }}>
            <Text style={{ fontFamily: sans, fontSize: 13, color: c.pink, textAlign: "center" }}>Changer d'adresse e-mail</Text>
          </Pressable>
        </>
      ) : null}
      {step === "replace" ? (
        <>
          <Banner kind="info" text={`Votre compte est déjà connecté sur « ${other} ». Un seul appareil peut être connecté à la fois.`} />
          <Body>Voulez-vous déconnecter l'autre appareil et utiliser celui-ci ? Vos achats restent intacts.</Body>
          {err ? <Banner text={err} /> : null}
          <Button label={busy ? "Connexion…" : "Utiliser cet appareil"} onPress={() => verify(true)} disabled={busy} />
          <Button ghost label="Annuler" onPress={() => { setStep("code"); setErr(null); }} disabled={busy} />
        </>
      ) : null}
    </View>
  );
}

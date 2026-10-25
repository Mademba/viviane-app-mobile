import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { ssGet, ssSet, trackSource, type LibAlbum, type Track } from "./api";

type Now = { album: LibAlbum; index: number } | null;
export type Last = { album: LibAlbum; index: number; position: number; duration: number } | null;
type PlayerCtx = {
  last: Last; resume: () => Promise<void>;
  now: Now; playing: boolean; position: number; duration: number; error: string | null;
  play: (album: LibAlbum, index: number) => Promise<void>;
  toggle: () => void; next: () => void; prev: () => void; seek: (s: number) => void;
};
const Ctx = createContext<PlayerCtx | null>(null);
export const usePlayer = () => useContext(Ctx)!;

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const player = useRef<AudioPlayer | null>(null);
  const [now, setNow] = useState<Now>(null);
  const nowRef = useRef<Now>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [last, setLast] = useState<Last>(null);
  const lastSaved = useRef(0);
  const pending = useRef<number | null>(null);

  useEffect(() => {
    ssGet("resume").then((v) => { if (v) try { setLast(JSON.parse(v)); } catch { /* ignoré */ } });
  }, []);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    return () => { player.current?.remove(); };
  }, []);

  const play = useCallback(async (album: LibAlbum, index: number) => {
    const t: Track | undefined = album.tracks[index];
    if (!t || !t.available) return;
    setError(null);
    nowRef.current = { album, index };
    setNow({ album, index });
    try {
      const src = await trackSource(t.id);
      // Vérifie d'abord que le serveur accepte la lecture, pour afficher une vraie raison en cas d'échec.
      const probe = await fetch(src.uri, { headers: { ...src.headers, range: "bytes=0-1" } }).catch(() => null);
      if (!probe) { setError("Pas de connexion au site. Vérifiez votre réseau."); return; }
      if (!probe.ok && probe.status !== 206) {
        const j = await probe.json().catch(() => null);
        setError(j?.error ?? `Le serveur a refusé la lecture (code ${probe.status}).`);
        return;
      }
      if (!player.current) {
        player.current = createAudioPlayer(src, { updateInterval: 500 });
        player.current.addListener("playbackStatusUpdate", (s) => {
          setPlaying(s.playing);
          setPosition(s.currentTime);
          setDuration(s.duration);
          const n = nowRef.current;
          if (n && s.currentTime > 0 && Math.abs(s.currentTime - lastSaved.current) >= 5) {
            lastSaved.current = s.currentTime;
            const snap = { album: n.album, index: n.index, position: s.currentTime, duration: s.duration };
            setLast(snap);
            void ssSet("resume", JSON.stringify(snap));
          }
          if (s.didJustFinish) {
            const n = nowRef.current;
            if (n && n.index + 1 < n.album.tracks.length) void play(n.album, n.index + 1);
          }
        });
      } else {
        player.current.replace(src);
      }
      player.current.play();
      if (pending.current) { const at = pending.current; pending.current = null; setTimeout(() => { void player.current?.seekTo(at); }, 400); }
    } catch {
      setError("Lecture impossible pour le moment.");
    }
  }, []);

  const value: PlayerCtx = {
    last,
    resume: async () => { if (!last) return; pending.current = last.position; await play(last.album, last.index); },
    now, playing, position, duration, error, play,
    toggle: () => { const p = player.current; if (p) (p.playing ? p.pause() : p.play()); },
    next: () => { if (now && now.index + 1 < now.album.tracks.length) void play(now.album, now.index + 1); },
    prev: () => { if (now && now.index > 0) void play(now.album, now.index - 1); },
    seek: (s) => { void player.current?.seekTo(s); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

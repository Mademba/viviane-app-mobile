import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { trackSource, type LibAlbum, type Track } from "./api";

type Now = { album: LibAlbum; index: number } | null;
type PlayerCtx = {
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

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true }).catch(() => {});
    return () => { player.current?.remove(); };
  }, []);

  const play = useCallback(async (album: LibAlbum, index: number) => {
    const t: Track | undefined = album.tracks[index];
    if (!t || !t.available) return;
    setError(null);
    try {
      const src = await trackSource(t.id);
      if (!player.current) {
        player.current = createAudioPlayer(src, { updateInterval: 500 });
        player.current.addListener("playbackStatusUpdate", (s) => {
          setPlaying(s.playing);
          setPosition(s.currentTime);
          setDuration(s.duration);
          if (s.didJustFinish) {
            const n = nowRef.current;
            if (n && n.index + 1 < n.album.tracks.length) void play(n.album, n.index + 1);
          }
        });
      } else {
        player.current.replace(src);
      }
      nowRef.current = { album, index };
      setNow({ album, index });
      player.current.play();
    } catch {
      setError("Lecture impossible pour le moment.");
    }
  }, []);

  const value: PlayerCtx = {
    now, playing, position, duration, error, play,
    toggle: () => { const p = player.current; if (p) (p.playing ? p.pause() : p.play()); },
    next: () => { if (now && now.index + 1 < now.album.tracks.length) void play(now.album, now.index + 1); },
    prev: () => { if (now && now.index > 0) void play(now.album, now.index - 1); },
    seek: (s) => { void player.current?.seekTo(s); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

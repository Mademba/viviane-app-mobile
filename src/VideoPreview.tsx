import React from "react";
import { View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { absUrl } from "./api";

/** Extrait vidéo public d'un clip (page de vente). */
export default function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(absUrl(uri), (p) => { p.loop = false; });
  return (
    <View style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 14, overflow: "hidden", backgroundColor: "#000" }}>
      <VideoView player={player} nativeControls fullscreenOptions={{ enable: true }} contentFit="contain" style={{ width: "100%", height: "100%" }} />
    </View>
  );
}

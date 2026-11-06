// Interdit à Android (10 et +) de capturer le son de l'application : l'enregistrement d'écran
// avec son interne (et les applis de capture audio) ne récupère plus la musique ni les clips.
const { withAndroidManifest } = require("@expo/config-plugins");
module.exports = (config) =>
  withAndroidManifest(config, (c) => {
    const app = c.modResults.manifest.application?.[0];
    if (app) app.$["android:allowAudioPlaybackCapture"] = "false";
    return c;
  });

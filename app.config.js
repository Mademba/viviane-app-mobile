// Ajoute à la configuration statique (app.json) l'identifiant du commit compilé par EAS,
// affiché dans Profil pour savoir exactement quelle version est installée.
module.exports = ({ config }) => ({
  ...config,
  extra: { ...(config.extra || {}), commit: (process.env.EAS_BUILD_GIT_COMMIT_HASH || "").slice(0, 7) || null },
});

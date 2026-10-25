// Ouvertures du navigateur intégré (paiement, liens) : l'application passe alors en arrière-plan
// sans que l'utilisateur la quitte réellement ; la page de bienvenue ne doit pas s'afficher.
export const guard = { browser: 0 };
export async function withBrowser<T>(run: () => Promise<T>): Promise<T> {
  guard.browser++;
  try { return await run(); } finally { setTimeout(() => { guard.browser = Math.max(0, guard.browser - 1); }, 1500); }
}

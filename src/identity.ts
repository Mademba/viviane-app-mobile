/**
 * Contrôle des informations saisies à l'achat. Le nom et le téléphone du fan servent de filigrane
 * sur les contenus protégés : ils doivent être réels, pas « aaa », « test » ou « 123456 ».
 * Fichier sans dépendance, identique côté site et côté application.
 */
const BLOCKED = new Set([
  "test", "tests", "essai", "azerty", "qwerty", "nom", "prenom", "prénom", "anonyme", "anonymous", "client", "user", "utilisateur", "admin",
  "xxx", "xxxx", "abc", "abcd", "asdf", "fake", "faux", "bidon", "inconnu", "unknown", "monsieur", "madame", "mme", "mr", "null", "none", "aucun", "name", "firstname", "lastname", "toto", "titi", "blabla", "lol", "mdr",
]);
const MASH = ["qwert", "azert", "asdf", "sdfg", "dfgh", "fghj", "ghjk", "hjkl", "zxcv", "xcvb", "cvbn", "wxcv", "poiu", "mlkj", "uiop", "jklm"];

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Nom nettoyé et mis en forme (« aïssatou   DIOP » → « Aïssatou Diop »). */
export function cleanName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => w.split(/([-'’])/).map((p) => (/^[-'’]$/.test(p) ? p : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())).join(""))
    .join(" ");
}

/** Renvoie un message d'erreur en français, ou null si le nom est plausible (prénom + nom). */
export function nameError(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return "Entrez votre nom complet.";
  if (!/^[\p{L}][\p{L}\s'’.\-]*$/u.test(name)) return "Le nom ne doit contenir que des lettres (pas de chiffres ni de symboles).";
  const words = name.split(" ").filter(Boolean);
  if (words.length < 2) return "Entrez votre prénom et votre nom (nom complet).";
  const flat = words.map((w) => strip(w).replace(/[^a-z]/g, ""));
  if (flat.some((w) => w.length < 2)) return "Entrez votre prénom et votre nom en entier, sans initiales seules.";
  if (flat.some((w) => !/[aeiouy]/.test(w))) return "Ce nom ne semble pas valide. Entrez votre vrai nom.";
  if (flat.some((w) => BLOCKED.has(w))) return "Entrez votre vrai nom : il apparaît sur vos contenus protégés.";
  if (flat.some((w) => /(.)\1\1/.test(w))) return "Ce nom ne semble pas valide. Entrez votre vrai nom.";
  if (flat.some((w) => w.length >= 4 && new Set(w).size <= 2)) return "Ce nom ne semble pas valide. Entrez votre vrai nom.";
  if (flat.some((w) => MASH.some((m) => w.includes(m)))) return "Ce nom ne semble pas valide. Entrez votre vrai nom.";
  if (new Set(flat).size === 1) return "Le prénom et le nom ne peuvent pas être identiques.";
  if (name.length > 80) return "Nom trop long.";
  return null;
}

/** Numéro mis en forme (+221771234567) ou null s'il n'est pas plausible. */
export function cleanPhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("00")) d = "+" + d.slice(2);
  const plus = d.startsWith("+");
  const digits = d.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  if (digits.startsWith("0")) return null;                          // un numéro international ne commence pas par 0 : indicatif pays manquant
  if (/^(\d)\1+$/.test(digits)) return null;                       // 0000000, 7777777…
  if ("0123456789012".includes(digits) || "9876543210987".includes(digits)) return null; // 123456789…
  if (digits.slice(-7).split("").every((x) => x === digits.slice(-7)[0])) return null;
  // Sénégal : 9 chiffres (77 123 45 67) avec ou sans indicatif 221
  const sn = digits.length === 9 ? digits : digits.startsWith("221") && digits.length === 12 ? digits.slice(3) : null;
  if (sn !== null) {
    if (!/^(7[05678]|3[03])\d{7}$/.test(sn)) return null;
    return `+221${sn}`;
  }
  if (!plus && digits.length < 10) return null;                     // numéro local d'un autre pays sans indicatif : ambigu
  return `+${digits}`;
}

export function phoneError(raw: string, required: boolean): string | null {
  if (!raw.trim()) return required ? "Entrez votre numéro de téléphone (ex. 77 123 45 67)." : null;
  return cleanPhone(raw) ? null : "Numéro de téléphone invalide. Exemple : 77 123 45 67 ou +221 77 123 45 67.";
}

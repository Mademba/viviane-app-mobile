/**
 * Prénom affiché pour saluer le fan. Le nom vient du champ « Nom complet » rempli à l'achat : s'il contient
 * un numéro de téléphone ou aucun mot lisible, on l'ignore et on déduit le prénom de l'adresse e-mail.
 */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

function readable(word: string): boolean {
  const letters = (word.match(/\p{L}/gu) ?? []).length;
  const digits = (word.match(/\d/g) ?? []).length;
  return letters >= 2 && digits === 0;
}

export function fanFirstName(name?: string | null, email?: string | null): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  if (readable(first)) return cap(first);
  const local = (email ?? "").split("@")[0] ?? "";
  const word = local.split(/[._\-+\d]+/).find((w) => readable(w));
  return word ? cap(word) : null;
}

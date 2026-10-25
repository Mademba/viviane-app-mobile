// Adresse du site (même backend que le site web). À remplacer par le domaine Vercel réel,
// ou à définir avec la variable EXPO_PUBLIC_API_URL au moment de la compilation.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://viviane-chidid.vercel.app").replace(/\/+$/, "");

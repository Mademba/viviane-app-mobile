# Viviane Chidid — application mobile (Expo / React Native)

Même backend que le site (`/api/app/*`). Android d'abord (APK), iOS ensuite avec la même base de code.

## Lancer en test
    npm install
    EXPO_PUBLIC_API_URL=https://<domaine-du-site> npx expo start   # puis Expo Go sur le téléphone

## Générer l'APK (compte Expo gratuit)
    npm i -g eas-cli && eas login
    eas build -p android --profile preview      # donne un lien de téléchargement de l'APK

Renseigner le domaine réel du site dans `eas.json` (EXPO_PUBLIC_API_URL) avant le build.

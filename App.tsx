import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme, DefaultTheme, createNavigationContainerRef } from "@react-navigation/native";
import { BottomTabBar, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFonts, CormorantGaramond_700Bold } from "@expo-google-fonts/cormorant-garamond";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { ThemeProvider, useTheme, sans, sansBold } from "./src/theme";
import { PlayerProvider, usePlayer } from "./src/player";
import { ContentProvider } from "./src/content";
import Welcome from "./src/screens/Welcome";
import Music from "./src/screens/Music";
import Profile from "./src/screens/Profile";
import Player from "./src/screens/Player";
import { Agenda, News } from "./src/screens/Feed";
import Home from "./src/screens/Home";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();
const nav = createNavigationContainerRef();
// Profil : volontairement sans icône (texte seul).
const ICON: Record<string, React.ComponentProps<typeof Ionicons>["name"] | undefined> = { Accueil: "home-outline", "Ma musique": "musical-notes-outline", "Actualités": "newspaper-outline", Agenda: "calendar-outline" };

function MiniPlayer({ onOpen }: { onOpen: () => void }) {
  const { c } = useTheme();
  const p = usePlayer();
  if (!p.now) return null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Ouvrir le lecteur" onPress={onOpen}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, height: 56, backgroundColor: c.card, borderTopWidth: 1, borderTopColor: c.line }}>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: sansBold, color: c.text }}>{p.now.album.tracks[p.now.index]?.title}</Text>
        <Text numberOfLines={1} style={{ fontFamily: sans, fontSize: 12, color: c.muted }}>{p.now.album.title}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={p.playing ? "Pause" : "Lecture"} onPress={p.toggle} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20, color: c.text }}>{p.playing ? "❚❚" : "▶"}</Text>
      </Pressable>
    </Pressable>
  );
}

function Main() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const [full, setFull] = useState(false);
  const theme = { ...(c.dark ? DarkTheme : DefaultTheme), colors: { ...(c.dark ? DarkTheme : DefaultTheme).colors, background: c.bg, card: c.bar, text: c.text, border: c.line, primary: c.gold } };
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <NavigationContainer theme={theme} ref={nav}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarActiveTintColor: c.gold,
            tabBarInactiveTintColor: c.muted,
            tabBarStyle: { backgroundColor: c.bar, borderTopColor: c.line, height: 62 + insets.bottom, paddingTop: 6 },
            tabBarLabelStyle: { fontFamily: sansBold, fontSize: 11 },
            tabBarIcon: ({ color }) => (ICON[route.name] ? <Ionicons name={ICON[route.name]!} size={24} color={color} /> : null),
          })}
          tabBar={(props) => (
            <View>
              <MiniPlayer onOpen={() => setFull(true)} />
              <BottomTabBar {...props} />
            </View>
          )}
        >
          <Tab.Screen name="Accueil">{() => <Home goTo={(t) => nav.isReady() && (nav as any).navigate(t)} />}</Tab.Screen>
          <Tab.Screen name="Ma musique">{() => <Music onOpenPlayer={() => setFull(true)} />}</Tab.Screen>
          <Tab.Screen name="Actualités" component={News} />
          <Tab.Screen name="Agenda" component={Agenda} />
          <Tab.Screen name="Profil" component={Profile} />
        </Tab.Navigator>
      </NavigationContainer>
      <Modal visible={full} animationType="slide" onRequestClose={() => setFull(false)}><Player onClose={() => setFull(false)} /></Modal>
    </View>
  );
}

function Root() {
  const { c } = useTheme();
  const [entered, setEntered] = useState(false);
  const [fontsOk] = useFonts({ CormorantGaramond_700Bold, Inter_400Regular, Inter_600SemiBold });
  if (!fontsOk) return <View style={{ flex: 1, backgroundColor: "#190104", justifyContent: "center" }}><ActivityIndicator color="#dd4677" /></View>;
  return (
    <>
      <StatusBar style={c.dark ? "light" : "dark"} />
      {entered ? <Main /> : <Welcome onEnter={() => setEntered(true)} />}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <PlayerProvider>
          <ContentProvider>
            <Root />
          </ContentProvider>
        </PlayerProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import {
  Stack,
} from "expo-router";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  StatusBar,
} from "expo-status-bar";

import React, {
  useEffect,
  useState,
} from "react";

import "react-native-reanimated";

import {
  auth,
  db,
} from "../firebase/config";

import {
  useColorScheme,
} from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme =
    useColorScheme();

  const [user, setUser] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const checkAdminAndSetUser = async (currentUser: any) => {
      if (!currentUser) {
        // Nobody signed in — go to the login screen.
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const adminDoc = await getDoc(
          doc(db, "admins", currentUser.uid)
        );

        const isAdmin =
          adminDoc.exists() &&
          adminDoc.data().email === currentUser.email;

        if (isAdmin) {
          setUser(currentUser);
        } else {
          // Signed in, but not an admin — kick them back to login.
          await auth.signOut();
          setUser(null);
        }
      } catch (error) {
        // If the admin check itself fails (e.g. no network), fail
        // closed: treat as not-signed-in rather than crashing or
        // letting a non-admin through.
        console.log("Admin check failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          // Handle the async admin check inside its own function so
          // the outer callback (which Firebase expects to be sync)
          // never has to return a Promise itself.
          checkAdminAndSetUser(currentUser);
        }
      );

    return unsubscribe;
  }, []);

  if (loading) {
    return null;
  }

  return (
    <ThemeProvider
      value={
        colorScheme === "dark"
          ? DarkTheme
          : DefaultTheme
      }
    >
      <Stack
        screenOptions={{
          headerShown:
            false,
        }}
      >
        {!user ? (
          <Stack.Screen
            name="login"
          />
        ) : (
          <Stack.Screen
            name="(tabs)"
          />
        )}
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
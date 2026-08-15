import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { Stack, useRouter, useSegments } from "expo-router";

import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";

import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";

import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { auth, db } from "../firebase/config";
import { registerForPushNotificationsAsync } from "../services/notifications";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // -----------------------------------------
  // AUTHENTICATION
  // -----------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
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

  // Register this admin device for push notifications
  try {
    const token = await registerForPushNotificationsAsync();

    if (token) {
      await updateDoc(
        doc(db, "admins", currentUser.uid),
        {
          expoPushToken: token,
        }
      );

      console.log("Admin notification token saved.");
    }
  } catch (error) {
    console.log(
      "Failed to register for notifications:",
      error
    );
  }
} else {
  await auth.signOut();
  setUser(null);
}
        } catch (error) {
          console.log("Admin check failed:", error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  // -----------------------------------------
  // ROUTING
  // -----------------------------------------
  useEffect(() => {
    if (loading) return;

    const firstSegment = segments[0];

    // Not logged in
    if (!user) {
      if (firstSegment !== "login") {
        router.replace("/login");
      }
      return;
    }

    // Logged in
    // Only redirect if we're at the root.
    if (!firstSegment) {
      router.replace("/(tabs)/dashboard");
    }
  }, [user, loading, segments]);

  // -----------------------------------------
  // LOADING
  // -----------------------------------------
  if (loading) {
    return null;
  }

  // -----------------------------------------
  // NAVIGATION
  // -----------------------------------------
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
          headerShown: false,
        }}
      />

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { auth, db } from "../firebase/config";
import { registerForPushNotificationsAsync } from "../services/notifications";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        // No authenticated Firebase user
        if (!currentUser) {
          setUser(null);
          return;
        }

        // Verify that the Firebase user is an authorized admin
        const adminRef = doc(db, "admins", currentUser.uid);
        const adminSnap = await getDoc(adminRef);

        if (!adminSnap.exists()) {
          console.log("User is not an authorized admin.");
          await auth.signOut();
          setUser(null);
          return;
        }

        const adminData = adminSnap.data();

        if (adminData.email !== currentUser.email) {
          console.log("Admin email mismatch.");
          await auth.signOut();
          setUser(null);
          return;
        }

        // Valid admin
        setUser(currentUser);

        // Register push notification token
        try {
          const token = await registerForPushNotificationsAsync();

          if (token) {
            await updateDoc(adminRef, {
              expoPushToken: token,
            });

            console.log("Admin notification token saved.");
          }
        } catch (notificationError) {
          console.log(
            "Notification registration failed:",
            notificationError
          );
        }
      } catch (error) {
        console.log("Authentication bootstrap failed:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (loading) return;

    const firstSegment = segments[0];

    // User is NOT authenticated
    if (!user) {
      if (firstSegment !== "login") {
        router.replace("/login");
      }
      return;
    }

    // User IS authenticated
    if (!firstSegment || firstSegment === "login") {
      router.replace("/(tabs)/dashboard");
    }
  }, [user, loading, segments]);

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
          headerShown: false,
        }}
      />

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import {
  Stack,
  useRouter,
  useSegments,
} from "expo-router";

import {
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { StatusBar } from "expo-status-bar";

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
  const colorScheme = useColorScheme();

  const router = useRouter();
  const segments = useSegments();

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  // ─────────────────────────────────────────────
  // AUTHENTICATION
  // ─────────────────────────────────────────────

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {

        // No Firebase user
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
          } else {
            await auth.signOut();
            setUser(null);
          }

        } catch (error) {

          console.log(
            "Admin check failed:",
            error
          );

          setUser(null);

        } finally {
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);


  // ─────────────────────────────────────────────
  // ROUTING
  // ─────────────────────────────────────────────

  useEffect(() => {

    if (loading) return;

    const firstSegment = segments[0];

    // User is NOT logged in
    if (!user) {

      if (firstSegment !== "login") {
        router.replace("/login");
      }

      return;
    }


    // User IS logged in
    if (user) {

      // Don't force navigation when already inside
      // tabs OR an individual order.
      if (
        firstSegment !== "(tabs)" &&
        firstSegment !== "order" &&
        firstSegment !== "printOrder" &&
        firstSegment !== "delivery-settings" &&
        firstSegment !== "add-product" &&
        firstSegment !== "categories_fixed" &&
        firstSegment !== "categories" &&
        firstSegment !== "category-edit" &&
        firstSegment !== "customers" &&
        firstSegment !== "edit-product"&&
        firstSegment !== "manage-pincodes"&&
        firstSegment !== "products" &&
        firstSegment !== "revenue" &&
        firstSegment !== "select-shop-loaction"&&
        firstSegment !== "setDeliveryRadius"
      ) {
        router.replace("/(tabs)/dashboard");
      }
    }

  }, [user, loading, segments]);


  // ─────────────────────────────────────────────
  // LOADING
  // ─────────────────────────────────────────────

  if (loading) {
    return null;
  }


  // ─────────────────────────────────────────────
  // NAVIGATION STACK
  // ─────────────────────────────────────────────

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
      >

        {/* Login */}
        <Stack.Screen
          name="login"
        />

        {/* Main application */}
        <Stack.Screen
          name="(tabs)"
        />

        {/* Individual order */}
        <Stack.Screen
          name="order"
        />

        <Stack.Screen
          name="printOrder"
        />

        <Stack.Screen name="delivery-settings"/>
        <Stack.Screen name="add-product"/>
        <Stack.Screen name="categories_fixed"/>
        <Stack.Screen name="categories"/>
        <Stack.Screen name="category-edit"/>
        <Stack.Screen name="customers"/>
        <Stack.Screen name="edit-product"/>
        <Stack.Screen name="manage-pincodes"/>
        <Stack.Screen name="revenue"/>
        <Stack.Screen name="select-shop-location"/>

      </Stack>

      <StatusBar style="auto" />

    </ThemeProvider>
  );
}
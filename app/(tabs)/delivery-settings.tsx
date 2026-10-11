import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "../../firebase/config";

const Colors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  separator: "#ECECEC",
  primary: "#000",
  muted: "#777",
};

export default function Delivery() {
  const [storeAddress, setStoreAddress] = useState("");
  const [radius, setRadius] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "delivery"),
      (snapshot) => {
        if (!snapshot.exists()) {
          setStoreAddress("");
          setRadius(null);
          return;
        }

        const data = snapshot.data();

        setStoreAddress(data.shopAddress || "");
        setRadius(
          typeof data.radiusKm === "number"
            ? data.radiusKm
            : null
        );
      },
      (error) => {
        console.log("Failed to listen to delivery settings:", error);
      }
    );

    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#000", "#333"]}
        style={styles.header}
      >
        <Text style={styles.title}>
          Settings
        </Text>

        <Text style={styles.subtitle}>
          Manage Store Settings
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
        }}
      >

        {/* Store Location */}
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            router.push("/select-shop-location")
          }
        >
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>
              Store Location
            </Text>

            <Text
              style={styles.cardSub}
              numberOfLines={2}
            >
              {storeAddress
                ? storeAddress
                : "Not configured"}
            </Text>
          </View>

          <Ionicons
            name="location-outline"
            size={28}
            color="#000"
          />
        </TouchableOpacity>


        {/* Delivery Radius */}
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            router.push("/setDeliveryRadius")
          }
        >
          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>
              Set delivery radius
            </Text>

            <Text style={styles.cardSub}>
              {radius !== null
                ? `${radius} km`
                : "Not configured"}
            </Text>
          </View>

          <Ionicons
            name="radio-outline"
            size={28}
            color="#000"
          />
        </TouchableOpacity>


        {/* Serviceable Pincodes */}
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            router.push("/manage-pincodes")
          }
        >
          <View>
            <Text style={styles.cardTitle}>
              Serviceable Pincodes
            </Text>

            <Text style={styles.cardSub}>
              Manage Delivery Areas
            </Text>
          </View>

          <Ionicons
            name="mail-outline"
            size={28}
            color="#000"
          />
        </TouchableOpacity>


        {/* Payment QR */}
        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            router.push("../payment-qr")
          }
        >
          <View>
            <Text style={styles.cardTitle}>
              Payment QR Code
            </Text>

            <Text style={styles.cardSub}>
              Manage customer UPI payments
            </Text>
          </View>

          <Ionicons
            name="qr-code-outline"
            size={28}
            color="#000"
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    paddingTop: 55,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  title: {
    color: "#FFF",
    fontSize: 30,
    fontWeight: "700",
  },

  subtitle: {
    color: "#DDD",
    marginTop: 6,
  },

  card: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: Colors.separator,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  textContainer: {
    flex: 1,
    paddingRight: 15,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  cardSub: {
    marginTop: 5,
    color: "#777",
  },
});
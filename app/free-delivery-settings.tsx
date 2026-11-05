import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "../firebase/config";

const MIN_THRESHOLD = 500;
const MAX_THRESHOLD = 5000;
const STEP = 100;
const DEFAULT_THRESHOLD = 1000;

const Colors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  surface: "#F5F5F5",
  text: "#111111",
  muted: "#777777",
  border: "#EAEAEA",
  primary: "#000000",
  success: "#16803C",
};

export default function FreeDeliverySettings() {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [trackWidth, setTrackWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "delivery"),
      (snapshot) => {
        const configured = Number(
          snapshot.data()?.freeDeliveryThreshold ?? DEFAULT_THRESHOLD
        );

        if (
          Number.isFinite(configured) &&
          configured >= MIN_THRESHOLD &&
          configured <= MAX_THRESHOLD
        ) {
          setThreshold(
            MIN_THRESHOLD +
              Math.round((configured - MIN_THRESHOLD) / STEP) * STEP
          );
        } else {
          setThreshold(DEFAULT_THRESHOLD);
        }

        setLoading(false);
      },
      (error) => {
        console.error("Unable to load free-delivery settings:", error);
        setLoading(false);
        Alert.alert(
          "Unable to load settings",
          "Please check your connection and try again."
        );
      }
    );

    return unsubscribe;
  }, []);

  const updateFromSlider = (locationX: number) => {
    if (trackWidth <= 0) return;

    const ratio = Math.max(0, Math.min(1, locationX / trackWidth));
    const rawValue = MIN_THRESHOLD + ratio * (MAX_THRESHOLD - MIN_THRESHOLD);
    const steppedValue =
      MIN_THRESHOLD + Math.round((rawValue - MIN_THRESHOLD) / STEP) * STEP;

    setThreshold(Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, steppedValue)));
  };

  const saveThreshold = async () => {
    if (saving || loading) return;

    try {
      setSaving(true);
      await setDoc(
        doc(db, "settings", "delivery"),
        {
          freeDeliveryThreshold: threshold,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert(
        "Settings updated",
        `Orders of ₹${threshold.toLocaleString("en-IN")} or more will now receive free delivery.`
      );
    } catch (error) {
      console.error("Unable to save free-delivery settings:", error);
      Alert.alert(
        "Save failed",
        "The setting could not be saved. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const percentage =
    ((threshold - MIN_THRESHOLD) / (MAX_THRESHOLD - MIN_THRESHOLD)) * 100;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000000", "#333333"]} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Free Delivery</Text>
          <Text style={styles.headerSubtitle}>
            Set the minimum order value
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.settingCard}>
          <View style={styles.cardHeading}>
            <View style={styles.iconCircle}>
              <Ionicons name="bicycle-outline" size={23} color={Colors.primary} />
            </View>
            <View style={styles.headingText}>
              <Text style={styles.cardTitle}>Free delivery threshold</Text>
              <Text style={styles.cardSubtitle}>
                Orders at or above this amount qualify
              </Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color={Colors.primary}
              style={{ marginVertical: 36 }}
            />
          ) : (
            <>
              <Text style={styles.amount}>
                ₹{threshold.toLocaleString("en-IN")}
              </Text>
              <Text style={styles.qualification}>
                Customers get free delivery on orders of this value or more.
              </Text>

              <View
                style={styles.sliderTouchArea}
                onLayout={(event) =>
                  setTrackWidth(event.nativeEvent.layout.width)
                }
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(event) =>
                  updateFromSlider(event.nativeEvent.locationX)
                }
                onResponderMove={(event) =>
                  updateFromSlider(event.nativeEvent.locationX)
                }
              >
                <View style={styles.sliderTrack} />
                <View
                  style={[
                    styles.sliderFill,
                    { width: `${percentage}%` },
                  ]}
                />
                <View
                  style={[
                    styles.sliderThumb,
                    { left: `${percentage}%` },
                  ]}
                />
              </View>

              <View style={styles.rangeLabels}>
                <Text style={styles.rangeLabel}>₹500</Text>
                <Text style={styles.rangeLabel}>₹5,000</Text>
              </View>

              <View style={styles.exampleCard}>
                <Ionicons
                  name="information-circle-outline"
                  size={19}
                  color={Colors.muted}
                />
                <Text style={styles.exampleText}>
                  Example: an order of ₹{threshold.toLocaleString("en-IN")} or
                  more has no delivery fee. Orders below this amount retain the
                  current ₹30 delivery fee.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={saveThreshold}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.saveButtonText}>Save Settings</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
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
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    marginLeft: 14,
    flex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#DDDDDD",
    marginTop: 4,
    fontSize: 13,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  settingCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    padding: 20,
  },
  cardHeading: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  headingText: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: Colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  amount: {
    color: Colors.text,
    fontSize: 38,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 34,
  },
  qualification: {
    color: Colors.muted,
    textAlign: "center",
    fontSize: 13,
    marginTop: 7,
    marginBottom: 24,
  },
  sliderTouchArea: {
    height: 46,
    justifyContent: "center",
    marginHorizontal: 10,
  },
  sliderTrack: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 6,
    borderRadius: 4,
    backgroundColor: "#E5E5E5",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    height: 6,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  sliderThumb: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: Colors.primary,
    elevation: 3,
  },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginHorizontal: 10,
  },
  rangeLabel: {
    color: Colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  exampleCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.surface,
    borderRadius: 13,
    padding: 13,
    marginTop: 28,
  },
  exampleText: {
    color: Colors.muted,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    marginTop: 24,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

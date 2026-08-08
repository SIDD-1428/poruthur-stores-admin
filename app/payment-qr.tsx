import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import {
    doc,
    getDoc,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";
import {
    getDownloadURL,
    ref,
    uploadBytes,
} from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { db, storage } from "../firebase/config";

const Colors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  surface: "#F5F5F5",
  separator: "#E8E8E8",
  primary: "#000000",
  textPrimary: "#000000",
  textSecondary: "#666666",
  muted: "#999999",
};

export default function PaymentQR() {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadQRCode();
  }, []);

  const loadQRCode = async () => {
    try {
      const snapshot = await getDoc(
        doc(db, "settings", "payment")
      );

      if (snapshot.exists()) {
        setQrCodeUrl(snapshot.data()?.qrCodeUrl || "");
      }
    } catch (error) {
      console.error("Failed to load QR:", error);

      Alert.alert(
        "Error",
        "Unable to load the payment QR code."
      );
    } finally {
      setLoading(false);
    }
  };

  const selectQRCode = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow gallery access to select the payment QR code."
        );
        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 1,
        });

      if (result.canceled) return;

      const selectedImage = result.assets[0];

      if (!selectedImage?.uri) return;

      await uploadQRCode(selectedImage.uri);
    } catch (error) {
      console.error("Image picker error:", error);

      Alert.alert(
        "Error",
        "Unable to select the QR code."
      );
    }
  };

  const uploadQRCode = async (uri: string) => {
    try {
      setUploading(true);

      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(
        storage,
        "Settings/payment-qr.png"
      );

      await uploadBytes(storageRef, blob, {
        contentType: "image/png",
      });

      const downloadURL =
        await getDownloadURL(storageRef);

      await setDoc(
        doc(db, "settings", "payment"),
        {
          qrCodeUrl: downloadURL,
          updatedAt: serverTimestamp(),
        },
        {
          merge: true,
        }
      );

      setQrCodeUrl(downloadURL);

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      );

      Alert.alert(
        "QR Updated",
        "The store payment QR code has been updated successfully."
      );
    } catch (error) {
      console.error("QR upload error:", error);

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Error
      );

      Alert.alert(
        "Upload Failed",
        "Unable to upload the payment QR code. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={Colors.primary}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={Colors.primary}
          />
        </TouchableOpacity>

        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>
            Payment QR
          </Text>

          <Text style={styles.subtitle}>
            Manage customer UPI payments
          </Text>
        </View>

      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* QR Card */}
        <View style={styles.card}>

          <View style={styles.sectionHeader}>

            <View style={styles.iconContainer}>
              <Ionicons
                name="qr-code-outline"
                size={22}
                color={Colors.primary}
              />
            </View>

            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>
                Store Payment QR
              </Text>

              <Text style={styles.sectionSubtitle}>
                Customers will scan this QR to make their payment.
              </Text>
            </View>

          </View>

          {/* QR Preview */}
          {qrCodeUrl ? (
            <View style={styles.qrWrapper}>
              <Image
                source={{ uri: qrCodeUrl }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.emptyQR}>

              <Ionicons
                name="qr-code-outline"
                size={70}
                color={Colors.muted}
              />

              <Text style={styles.emptyTitle}>
                No QR Code
              </Text>

              <Text style={styles.emptySubtitle}>
                Upload your store's UPI QR code.
              </Text>

            </View>
          )}

          {/* Upload Button */}
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={selectQRCode}
            disabled={uploading}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <Ionicons
                name="cloud-upload-outline"
                size={20}
                color="#FFFFFF"
              />
            )}

            <Text style={styles.uploadText}>
              {uploading
                ? "Uploading..."
                : qrCodeUrl
                ? "Replace QR Code"
                : "Upload QR Code"}
            </Text>
          </TouchableOpacity>

        </View>

        {/* Information */}
        <View style={styles.infoCard}>

          <Ionicons
            name="information-circle-outline"
            size={21}
            color={Colors.muted}
          />

          <Text style={styles.infoText}>
            This QR code will automatically appear in
            the customer checkout when they select
            "Pay by QR".
          </Text>

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

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 55,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTextContainer: {
    marginLeft: 13,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  subtitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 3,
  },

  content: {
    padding: 16,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.separator,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },

  sectionHeaderText: {
    flex: 1,
    marginLeft: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: Colors.muted,
    lineHeight: 17,
    marginTop: 4,
  },

  qrWrapper: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 320,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.separator,
    padding: 18,
    justifyContent: "center",
    alignItems: "center",
  },

  qrImage: {
    width: "100%",
    height: "100%",
  },

  emptyQR: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 320,
    alignSelf: "center",
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.separator,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 12,
  },

  emptySubtitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 5,
  },

  uploadButton: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },

  uploadText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  infoCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
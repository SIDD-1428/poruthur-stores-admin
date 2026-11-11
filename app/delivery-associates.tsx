import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../firebase/config";

const Colors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  surface: "#F5F5F5",
  text: "#000000",
  muted: "#999999",
  border: "#E8E8E8",
  primary: "#000000",
  primaryLight: "#00000010",
  success: "#34C759",
  danger: "#FF3B30",
};

type Associate = {
  id: string;
  name: string;
  phone: string;
  isActive?: boolean;
};

export default function DeliveryAssociatesScreen() {
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Associate | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const associatesQuery = query(collection(db, "deliveryAssociates"), orderBy("name"));
    return onSnapshot(
      associatesQuery,
      (snapshot) => {
        setAssociates(snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<Associate, "id">),
        })));
        setLoading(false);
      },
      (error) => {
        console.error("DELIVERY ASSOCIATES LIST ERROR:", error);
        setLoading(false);
        Alert.alert("Unable to load associates", "Please check your connection and try again.");
      }
    );
  }, []);

  const resetForm = () => {
    setShowForm(false);
    setEditing(null);
    setName("");
    setPhone("");
  };

  const openAddForm = () => {
    setEditing(null);
    setName("");
    setPhone("");
    setShowForm(true);
  };

  const openEditForm = (associate: Associate) => {
    setEditing(associate);
    setName(associate.name || "");
    setPhone(associate.phone || "");
    setShowForm(true);
  };

  const saveAssociate = async () => {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const digits = cleanPhone.replace(/\D/g, "");

    if (!cleanName) {
      Alert.alert("Name required", "Enter the delivery associate's name.");
      return;
    }
    if (digits.length < 10 || digits.length > 15) {
      Alert.alert("Invalid contact number", "Enter a valid phone number with country code if required.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "deliveryAssociates", editing.id), {
          name: cleanName,
          phone: cleanPhone,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "deliveryAssociates"), {
          name: cleanName,
          phone: cleanPhone,
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      resetForm();
    } catch (error) {
      console.error("SAVE DELIVERY ASSOCIATE ERROR:", error);
      Alert.alert("Save failed", "Unable to save this delivery associate. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = (associate: Associate) => {
    const nextActive = associate.isActive === false;
    Alert.alert(
      nextActive ? "Activate associate?" : "Deactivate associate?",
      nextActive
        ? `Allow ${associate.name} to receive delivery assignments again?`
        : `${associate.name} will no longer appear in the delivery assignment list.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: nextActive ? "Activate" : "Deactivate",
          style: nextActive ? "default" : "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "deliveryAssociates", associate.id), {
                isActive: nextActive,
                updatedAt: serverTimestamp(),
              });
            } catch (error) {
              console.error("TOGGLE ASSOCIATE ERROR:", error);
              Alert.alert("Update failed", "Unable to update this associate.");
            }
          },
        },
      ]
    );
  };

  const activeCount = associates.filter((associate) => associate.isActive !== false).length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000000", "#333333"]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Delivery Associates</Text>
            <Text style={styles.subtitle}>Manage the people who deliver BonMart orders</Text>
          </View>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.headerCount}>{activeCount}</Text>
          <Text style={styles.headerCountLabel}>Active associates</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Your delivery team</Text>
            <Text style={styles.sectionSubtitle}>Their WhatsApp numbers are used to prepare delivery assignments.</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddForm}>
            <Ionicons name="add" size={19} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <Text style={styles.emptyText}>Loading delivery associates...</Text>
        ) : associates.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="bicycle-outline" size={34} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No delivery associates yet</Text>
            <Text style={styles.emptyText}>Add an associate's name and WhatsApp contact number to start sharing delivery details.</Text>
            <TouchableOpacity style={styles.emptyAddButton} onPress={openAddForm}>
              <Text style={styles.emptyAddText}>Add first associate</Text>
            </TouchableOpacity>
          </View>
        ) : associates.map((associate) => {
          const active = associate.isActive !== false;
          return (
            <View key={associate.id} style={[styles.associateCard, !active && styles.inactiveCard]}>
              <View style={styles.associateIcon}>
                <Ionicons name="person-outline" size={22} color={active ? Colors.primary : Colors.muted} />
              </View>
              <View style={styles.associateInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.associateName}>{associate.name}</Text>
                  <View style={[styles.statusBadge, active ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={[styles.statusText, { color: active ? Colors.success : Colors.muted }]}>{active ? "Active" : "Inactive"}</Text>
                  </View>
                </View>
                <Text style={styles.associatePhone}>{associate.phone}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEditForm(associate)} style={styles.iconButton}>
                  <Ionicons name="create-outline" size={19} color={Colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => toggleActive(associate)} style={styles.iconButton}>
                  <Ionicons name={active ? "pause-circle-outline" : "play-circle-outline"} size={20} color={active ? Colors.danger : Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
        <Text style={styles.footerNote}>Deactivated associates are retained in your records and can be reactivated at any time.</Text>
      </ScrollView>

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={resetForm}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editing ? "Edit associate" : "Add delivery associate"}</Text>
            <Text style={styles.modalSubtitle}>Save the contact details used for WhatsApp delivery assignments.</Text>

            <Text style={styles.inputLabel}>ASSOCIATE NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rahul Kumar"
              placeholderTextColor="#999999"
              autoCapitalize="words"
              style={styles.input}
              returnKeyType="next"
            />

            <Text style={styles.inputLabel}>WHATSAPP CONTACT NUMBER</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +91 98765 43210"
              placeholderTextColor="#999999"
              keyboardType="phone-pad"
              style={styles.input}
              returnKeyType="done"
            />
            <Text style={styles.helperText}>Include the country code for international numbers. Indian 10-digit numbers are supported.</Text>

            <TouchableOpacity style={[styles.saveButton, saving && { opacity: 0.6 }]} onPress={saveAssociate} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? "Saving..." : editing ? "Save changes" : "Add associate"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={resetForm} disabled={saving} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  title: { color: "#FFFFFF", fontSize: 25, fontWeight: "800" },
  subtitle: { color: "#DDDDDD", fontSize: 12, marginTop: 4 },
  headerStats: { marginTop: 20, flexDirection: "row", alignItems: "baseline", gap: 8 },
  headerCount: { color: "#FFFFFF", fontSize: 26, fontWeight: "800" },
  headerCountLabel: { color: "#DDDDDD", fontSize: 12 },
  content: { padding: 16, paddingBottom: 40 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: "800" },
  sectionSubtitle: { color: Colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  addButton: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 5 },
  addButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  associateCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 17, padding: 14, marginBottom: 11, flexDirection: "row", alignItems: "center", gap: 11 },
  inactiveCard: { opacity: 0.62 },
  associateIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  associateInfo: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 7 },
  associateName: { color: Colors.text, fontSize: 14, fontWeight: "700" },
  associatePhone: { color: Colors.muted, fontSize: 12, marginTop: 5 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  activeBadge: { backgroundColor: "#34C75915" },
  inactiveBadge: { backgroundColor: "#77777715" },
  statusText: { fontSize: 9, fontWeight: "800" },
  cardActions: { flexDirection: "row", gap: 4 },
  iconButton: { padding: 7 },
  emptyCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: 18, padding: 25, alignItems: "center" },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primaryLight, alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: Colors.text, fontSize: 16, fontWeight: "700", marginTop: 14 },
  emptyText: { color: Colors.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 7 },
  emptyAddButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11, marginTop: 16 },
  emptyAddText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  footerNote: { color: Colors.muted, fontSize: 11, lineHeight: 16, marginTop: 10, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 14, paddingBottom: 28, maxHeight: "90%" },
  modalHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 5, backgroundColor: "#DDDDDD", marginBottom: 18 },
  modalTitle: { color: Colors.text, fontSize: 21, fontWeight: "800" },
  modalSubtitle: { color: Colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 18 },
  inputLabel: { color: Colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, marginBottom: 7, marginTop: 10 },
  input: { minHeight: 50, borderWidth: 1, borderColor: Colors.border, borderRadius: 13, paddingHorizontal: 13, color: Colors.text, fontSize: 14, backgroundColor: "#FAFAFA" },
  helperText: { color: Colors.muted, fontSize: 10, lineHeight: 15, marginTop: 7 },
  saveButton: { backgroundColor: Colors.primary, minHeight: 52, borderRadius: 14, justifyContent: "center", alignItems: "center", marginTop: 22 },
  saveButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  cancelButton: { paddingVertical: 14, alignItems: "center" },
  cancelText: { color: Colors.muted, fontSize: 14, fontWeight: "600" },
});

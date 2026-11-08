import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, Platform, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { db, storage } from "../firebase/config";

const C = { black: "#000000", dark: "#333333", white: "#FFFFFF", surface: "#F5F5F5", border: "#E8E8E8", muted: "#999999", text: "#111111", secondary: "#666666", green: "#34C759" };
type Brand = { id: string; name: string; imageUrl?: string; isActive?: boolean };

export default function BrandsScreen() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "brands"), orderBy("name", "asc"));
    return onSnapshot(q, (snapshot) => {
      setBrands(snapshot.docs.map((item) => ({ id: item.id, ...(item.data() as any) })));
      setLoading(false);
    }, (error) => { console.error("Brands listener failed:", error); setLoading(false); Alert.alert("Unable to load brands", error.message); });
  }, []);

  const openAdd = () => { setEditingId(null); setName(""); setImageUrl(""); setModalVisible(true); };
  const openEdit = (brand: Brand) => { setEditingId(brand.id); setName(brand.name); setImageUrl(brand.imageUrl || ""); setModalVisible(true); };

  const pickBrandImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") { Alert.alert("Permission Required", "Allow gallery access to select a brand image."); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.82, allowsEditing: true, aspect: [16, 9] });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setUploadingImage(true);
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();
      const path = `Brands/${editingId || "new"}/${Date.now()}.jpg`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
      setImageUrl(await getDownloadURL(storageRef));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) { Alert.alert("Image upload failed", error?.message || "Please try again."); }
    finally { setUploadingImage(false); }
  };
  const saveBrand = async () => {
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (!cleanName) { Alert.alert("Brand name required", "Enter a brand name."); return; }
    if (brands.some((brand) => brand.name.trim().toLowerCase() === cleanName.toLowerCase() && brand.id !== editingId)) { Alert.alert("Duplicate brand", "A brand with this name already exists."); return; }
    if (uploadingImage) { Alert.alert("Please wait", "The brand image is still uploading."); return; }
    setSaving(true);
    try {
      if (editingId) await updateDoc(doc(db, "brands", editingId), { name: cleanName, normalizedName: cleanName.toLowerCase(), imageUrl: imageUrl || null, updatedAt: serverTimestamp() });
      else await addDoc(collection(db, "brands"), { name: cleanName, normalizedName: cleanName.toLowerCase(), imageUrl: imageUrl || null, isActive: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      setModalVisible(false); setName(""); setImageUrl(""); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) { Alert.alert("Could not save brand", error?.message || "Please try again."); }
    finally { setSaving(false); }
  };
  const toggleActive = async (brand: Brand, value: boolean) => {
    try { await updateDoc(doc(db, "brands", brand.id), { isActive: value, updatedAt: serverTimestamp() }); Haptics.selectionAsync(); }
    catch (error: any) { Alert.alert("Could not update brand", error?.message || "Please try again."); }
  };
  const renderBrand = ({ item }: { item: Brand }) => (
    <View style={styles.brandCard}>
      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.brandImageThumb} /> : <View style={styles.brandIcon}><Ionicons name="pricetag-outline" size={22} color={C.text} /></View>}
      <TouchableOpacity style={styles.brandInfo} onPress={() => openEdit(item)} activeOpacity={0.7}>
        <Text style={styles.brandName}>{item.name}</Text>
        <Text style={styles.brandMeta}>{item.isActive === false ? "Inactive · Existing product links are retained" : "Active · Available for product assignment"}</Text>
      </TouchableOpacity>
      <Switch value={item.isActive !== false} onValueChange={(value) => toggleActive(item, value)} trackColor={{ false: "#D1D1D6", true: "#777777" }} />
      <TouchableOpacity onPress={() => openEdit(item)} style={styles.editButton}><Ionicons name="create-outline" size={19} color={C.secondary} /></TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={[C.black, C.dark]} style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}><Ionicons name="chevron-back" size={23} color={C.white} /></TouchableOpacity>
          <View style={{ flex: 1 }}><Text style={styles.title}>Manage Brands</Text><Text style={styles.subtitle}>Maintain the store's brand catalogue</Text></View>
          <TouchableOpacity onPress={openAdd} style={styles.headerAdd}><Ionicons name="add" size={24} color={C.white} /></TouchableOpacity>
        </View>
      </LinearGradient>
      <View style={styles.summaryRow}>
        <View><Text style={styles.count}>{brands.length} brands</Text><Text style={styles.helper}>Inactive brands remain linked to existing products.</Text></View>
        <TouchableOpacity style={styles.addBrandButton} onPress={openAdd}><Ionicons name="add" size={17} color={C.white} /><Text style={styles.addBrandText}>Add Brand</Text></TouchableOpacity>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={C.black} /></View> : (
        <FlatList data={brands} keyExtractor={(item) => item.id} renderItem={renderBrand} contentContainerStyle={styles.list} ListEmptyComponent={<View style={styles.empty}><Ionicons name="pricetags-outline" size={48} color={C.muted} /><Text style={styles.emptyTitle}>No brands yet</Text><Text style={styles.helper}>Add brands here, then assign them to products.</Text></View>} />
      )}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => !saving && setModalVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}>
          <View style={styles.modalHeading}><Text style={styles.modalTitle}>{editingId ? "Edit Brand" : "Add Brand"}</Text><TouchableOpacity onPress={() => setModalVisible(false)} disabled={saving}><Ionicons name="close" size={22} color={C.secondary} /></TouchableOpacity></View>
          <Text style={styles.label}>BRAND IMAGE</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickBrandImage} disabled={uploadingImage || saving} activeOpacity={0.8}>
            {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.imagePreview} /> : <View style={styles.imagePlaceholder}><Ionicons name="image-outline" size={28} color={C.muted} /><Text style={styles.imagePlaceholderText}>Upload brand image</Text></View>}
            <View style={styles.imageAction}>{uploadingImage ? <ActivityIndicator color={C.white} size="small" /> : <><Ionicons name="cloud-upload-outline" size={16} color={C.white} /><Text style={styles.imageActionText}>{imageUrl ? "Change image" : "Choose image"}</Text></>}</View>
          </TouchableOpacity>
          <Text style={styles.note}>Use a clear logo or brand banner. It will appear as the background of the brand tile in the customer app.</Text>
          <Text style={styles.label}>BRAND NAME</Text>
          <TextInput value={name} onChangeText={setName} placeholder="e.g. Aashirvaad" placeholderTextColor={C.muted} style={styles.input} autoCapitalize="words" maxLength={60} />
          <Text style={styles.note}>Use one consistent spelling. Products reference this catalogue entry.</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveBrand} disabled={saving}>{saving ? <ActivityIndicator color={C.white} /> : <><Ionicons name="checkmark" size={18} color={C.white} /><Text style={styles.saveText}>Save Brand</Text></>}</TouchableOpacity>
          </View>
        </View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  header: { paddingTop: Platform.OS === "ios" ? 52 : 40, paddingBottom: 22, paddingHorizontal: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFFFFF22", alignItems: "center", justifyContent: "center" },
  title: { color: C.white, fontSize: 23, fontWeight: "700" },
  subtitle: { color: "#FFFFFFBB", fontSize: 12, marginTop: 3 },
  headerAdd: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#FFFFFF22", alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingVertical: 18 },
  count: { fontSize: 18, fontWeight: "700", color: C.text },
  helper: { fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 16 },
  addBrandButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.black, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 11 },
  addBrandText: { color: C.white, fontSize: 12, fontWeight: "600" },
  list: { paddingHorizontal: 16, paddingBottom: 30, flexGrow: 1 },
  brandCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderWidth: 1, borderColor: C.border, borderRadius: 15, marginBottom: 9 },
  brandIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface, alignItems: "center", justifyContent: "center" },
  brandImageThumb: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.surface },
  imagePicker: { height: 142, borderRadius: 14, overflow: "hidden", backgroundColor: C.surface, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  imagePreview: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 7 },
  imagePlaceholderText: { color: C.muted, fontSize: 12, fontWeight: "600" },
  imageAction: { position: "absolute", right: 9, bottom: 9, backgroundColor: "#000000CC", borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  imageActionText: { color: C.white, fontSize: 10, fontWeight: "700" },
  brandInfo: { flex: 1 },
  brandName: { fontSize: 14, fontWeight: "700", color: C.text },
  brandMeta: { fontSize: 10, color: C.muted, marginTop: 4 },
  editButton: { padding: 7 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 90, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000055" },
  modalCard: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  modalHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  modalTitle: { fontSize: 19, fontWeight: "700", color: C.text },
  label: { fontSize: 10, color: C.muted, fontWeight: "700", letterSpacing: 1, marginBottom: 7 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: C.text },
  note: { fontSize: 11, color: C.muted, lineHeight: 17, marginTop: 9 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 22 },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 12, alignItems: "center", paddingVertical: 13 },
  cancelText: { fontSize: 13, fontWeight: "600", color: C.secondary },
  saveButton: { flex: 1.4, flexDirection: "row", gap: 6, backgroundColor: C.black, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  saveText: { color: C.white, fontSize: 13, fontWeight: "600" },
});

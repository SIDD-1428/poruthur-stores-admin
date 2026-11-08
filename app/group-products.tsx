import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { db } from "../firebase/config";

const Colors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  surface: "#F5F5F5",
  text: "#000000",
  secondary: "#666666",
  muted: "#999999",
  border: "#E8E8E8",
  primary: "#000000",
  accent: "#333333",
  success: "#34C759",
  danger: "#FF3B30",
};

type Product = {
  id: string;
  name?: string;
  unit?: string;
  price?: number;
  mrp?: number;
  stock?: number;
  image?: string;
  category?: string;
  groupId?: string;
};

type ProductGroup = {
  id: string;
  name: string;
  productIds: string[];
  standardProductId: string;
};

export default function GroupProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [standardId, setStandardId] = useState("");
  const [productSearch, setProductSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      const unsubscribeProducts = onSnapshot(
        collection(db, "products"),
        (snapshot) => {
          setProducts(snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<Product, "id">),
          })));
          setLoading(false);
        },
        (error) => {
          console.error("Products listener failed:", error);
          setLoading(false);
          Alert.alert("Unable to load products", error.message);
        }
      );
      const unsubscribeGroups = onSnapshot(
        collection(db, "productGroups"),
        (snapshot) => {
          setGroups(snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<ProductGroup, "id">),
          })));
        },
        (error) => {
          console.error("Product groups listener failed:", error);
          Alert.alert("Unable to load groups", error.message);
        }
      );
      return () => {
        unsubscribeProducts();
        unsubscribeGroups();
      };
    }, [])
  );

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product] as const)),
    [products]
  );

  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return groups;
    return groups.filter((group) => {
      const standard = productMap.get(group.standardProductId);
      return group.name.toLowerCase().includes(term) ||
        standard?.name?.toLowerCase().includes(term);
    });
  }, [groups, productMap, search]);

  const availableProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    return products
      .filter((product) => {
        const belongsElsewhere = product.groupId && product.groupId !== editingGroupId;
        const matches = !term ||
          product.name?.toLowerCase().includes(term) ||
          product.category?.toLowerCase().includes(term) ||
          product.unit?.toLowerCase().includes(term) ||
          product.id.toLowerCase().includes(term);
        return !belongsElsewhere && matches;
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [products, productSearch, editingGroupId]);

  const resetEditor = () => {
    setEditingGroupId(null);
    setGroupName("");
    setSelectedIds([]);
    setStandardId("");
    setProductSearch("");
  };

  const openCreate = () => {
    resetEditor();
    setModalVisible(true);
  };

  const openEdit = (group: ProductGroup) => {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setSelectedIds((group.productIds || []).filter((id) => products.some((product) => product.id === id)));
    setStandardId(group.standardProductId);
    setProductSearch("");
    setModalVisible(true);
  };

  const toggleProduct = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) {
        const next = current.filter((item) => item !== id);
        if (standardId === id) setStandardId(next[0] || "");
        return next;
      }
      if (!standardId) setStandardId(id);
      return [...current, id];
    });
    Haptics.selectionAsync();
  };

  const saveGroup = async () => {
    const cleanName = groupName.trim();
    if (!cleanName) {
      Alert.alert("Group name required", "Enter a name for this product group.");
      return;
    }
    if (selectedIds.length < 2) {
      Alert.alert("Select at least two products", "A group needs two or more individual products.");
      return;
    }
    if (!standardId || !selectedIds.includes(standardId)) {
      Alert.alert("Choose a standard product", "Select which product should be displayed first in the customer app.");
      return;
    }

    setSaving(true);
    try {
      const groupRef = editingGroupId
        ? doc(db, "productGroups", editingGroupId)
        : doc(collection(db, "productGroups"));

      await runTransaction(db, async (transaction) => {
        const groupSnapshot = editingGroupId ? await transaction.get(groupRef) : null;
        if (editingGroupId && !groupSnapshot?.exists()) {
          throw new Error("This group no longer exists. Refresh and try again.");
        }

        const oldIds = editingGroupId
          ? ((groupSnapshot?.data()?.productIds || []) as string[])
          : [];
        const allIds = Array.from(new Set([...oldIds, ...selectedIds]));
        const productRefs = allIds.map((id) => doc(db, "products", id));
        const productSnapshots = await Promise.all(
          productRefs.map((productRef) => transaction.get(productRef))
        );

        productSnapshots.forEach((snapshot, index) => {
          if (!snapshot.exists()) {
            throw new Error("One of the selected products no longer exists. Refresh the list.");
          }
          const currentGroupId = snapshot.data().groupId;
          if (currentGroupId && currentGroupId !== groupRef.id) {
            throw new Error("A selected product has already been assigned to another group.");
          }
          if (selectedIds.includes(allIds[index]) && currentGroupId && currentGroupId !== groupRef.id) {
            throw new Error("A selected product has already been assigned to another group.");
          }
        });

        allIds.forEach((id) => {
          const productRef = doc(db, "products", id);
          if (selectedIds.includes(id)) {
            transaction.update(productRef, { groupId: groupRef.id });
          } else {
            transaction.update(productRef, { groupId: deleteField() });
          }
        });

        transaction.set(groupRef, {
          name: cleanName,
          productIds: selectedIds,
          standardProductId: standardId,
          updatedAt: serverTimestamp(),
          ...(editingGroupId ? {} : { createdAt: serverTimestamp() }),
        }, { merge: true });
      });

      setModalVisible(false);
      resetEditor();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", editingGroupId ? "Product group updated." : "Product group created.");
    } catch (error: any) {
      console.error("Save product group failed:", error);
      Alert.alert("Could not save group", error?.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = (group: ProductGroup) => {
    Alert.alert(
      "Delete product group?",
      `“${group.name}” will be removed. The individual products and their inventory will remain unchanged.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete group",
          style: "destructive",
          onPress: async () => {
            try {
              await runTransaction(db, async (transaction) => {
                const groupRef = doc(db, "productGroups", group.id);
                const groupSnapshot = await transaction.get(groupRef);
                if (!groupSnapshot.exists()) return;
                const ids = (groupSnapshot.data().productIds || []) as string[];
                const refs = ids.map((id) => doc(db, "products", id));
                const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
                snapshots.forEach((snapshot, index) => {
                  if (snapshot.exists() && snapshot.data().groupId === group.id) {
                    transaction.update(refs[index], { groupId: deleteField() });
                  }
                });
                transaction.delete(groupRef);
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error: any) {
              Alert.alert("Could not delete group", error?.message || "Please try again.");
            }
          },
        },
      ]
    );
  };

  const renderGroup = ({ item, index }: { item: ProductGroup; index: number }) => {
    const standard = productMap.get(item.standardProductId);
    const memberCount = (item.productIds || []).length;
    return (
      <Animated.View entering={FadeInRight.delay(index * 45).springify()}>
        <TouchableOpacity style={styles.groupCard} activeOpacity={0.75} onPress={() => openEdit(item)}>
          <View style={styles.groupImageWrap}>
            {standard?.image
              ? <Image source={{ uri: standard.image }} style={styles.groupImage} />
              : <Ionicons name="cube-outline" size={28} color={Colors.muted} />}
          </View>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.groupMeta}>{memberCount} products · Standard: {standard?.unit || standard?.name || "Not set"}</Text>
            {standard && <Text style={styles.groupPrice}>₹{Number(standard.price || 0).toFixed(2)} <Text style={styles.groupUnit}>{standard.unit || ""}</Text></Text>}
          </View>
          <TouchableOpacity style={styles.deleteButton} onPress={() => deleteGroup(item)}>
            <Ionicons name="trash-outline" size={19} color={Colors.danger} />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={18} color={Colors.muted} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderProductChoice = (product: Product) => {
    const selected = selectedIds.includes(product.id);
    const isStandard = standardId === product.id;
    return (
      <TouchableOpacity
        key={product.id}
        style={[styles.productChoice, selected && styles.productChoiceSelected]}
        activeOpacity={0.7}
        onPress={() => toggleProduct(product.id)}
      >
        <View style={styles.choiceImageWrap}>
          {product.image
            ? <Image source={{ uri: product.image }} style={styles.choiceImage} />
            : <Ionicons name="cube-outline" size={21} color={Colors.muted} />}
        </View>
        <View style={styles.choiceInfo}>
          <Text style={styles.choiceName}>{product.name || "Unnamed product"}</Text>
          <Text style={styles.choiceMeta}>{product.unit || "Unit not set"} · ₹{Number(product.price || 0).toFixed(2)} · Stock {Number(product.stock || 0)}</Text>
        </View>
        <Ionicons
          name={selected ? "checkbox" : "square-outline"}
          size={23}
          color={selected ? Colors.primary : Colors.muted}
        />
        {selected && (
          <TouchableOpacity
            style={styles.standardButton}
            onPress={() => { setStandardId(product.id); Haptics.selectionAsync(); }}
          >
            <Ionicons name={isStandard ? "radio-button-on" : "radio-button-off"} size={21} color={isStandard ? Colors.success : Colors.muted} />
            <Text style={[styles.standardText, isStandard && styles.standardTextActive]}>Standard</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Group Products</Text>
            <Text style={styles.headerSubtitle}>Connect products with different sizes</Text>
          </View>
          <TouchableOpacity style={styles.headerAdd} onPress={openCreate}>
            <Ionicons name="add" size={25} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.introRow}>
          <View>
            <Text style={styles.countText}>{groups.length} groups</Text>
            <Text style={styles.helperText}>Each product keeps its own price and stock.</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openCreate}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Group</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color={Colors.muted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search groups..."
            placeholderTextColor={Colors.muted}
            style={styles.searchInput}
          />
          {!!search && <TouchableOpacity onPress={() => setSearch("")}><Ionicons name="close-circle" size={18} color={Colors.muted} /></TouchableOpacity>}
        </View>

        {loading ? (
          <View style={styles.centerState}><ActivityIndicator size="large" color={Colors.primary} /><Text style={styles.stateText}>Loading products and groups...</Text></View>
        ) : (
          <FlatList
            data={filteredGroups}
            keyExtractor={(item) => item.id}
            renderItem={renderGroup}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="albums-outline" size={54} color={Colors.muted} />
                <Text style={styles.emptyTitle}>{search ? "No matching groups" : "No product groups yet"}</Text>
                <Text style={styles.stateText}>{search ? "Try another search term." : "Create a group to connect products such as 1 kg, 2 kg and 5 kg packs."}</Text>
                {!search && <TouchableOpacity style={styles.emptyAdd} onPress={openCreate}><Text style={styles.emptyAddText}>Create your first group</Text></TouchableOpacity>}
              </View>
            }
          />
        )}
      </View>

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => !saving && setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <LinearGradient colors={[Colors.primary, Colors.accent]} style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} disabled={saving} style={styles.backButton}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>{editingGroupId ? "Edit Group" : "Create Group"}</Text>
              <Text style={styles.headerSubtitle}>Select related individual products</Text>
            </View>
          </LinearGradient>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
            <Text style={styles.fieldLabel}>GROUP NAME</Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g. Rice"
              placeholderTextColor={Colors.muted}
              style={styles.nameInput}
              maxLength={60}
            />
            <View style={styles.selectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>Choose products</Text>
                <Text style={styles.stateText}>{selectedIds.length} selected · Select at least 2</Text>
              </View>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={19} color={Colors.muted} />
              <TextInput
                value={productSearch}
                onChangeText={setProductSearch}
                placeholder="Search by name, unit or category..."
                placeholderTextColor={Colors.muted}
                style={styles.searchInput}
              />
            </View>
            <Text style={styles.standardHint}>Tap the checkbox to include a product. For selected products, choose which one is the standard option.</Text>
            {availableProducts.length ? availableProducts.map(renderProductChoice) : (
              <Text style={styles.noProducts}>No available products match this search.</Text>
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)} disabled={saving}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveGroup} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFFFFF" /> : <><Ionicons name="checkmark" size={19} color="#FFFFFF" /><Text style={styles.saveText}>{editingGroupId ? "Save Changes" : "Create Group"}</Text></>}
              </TouchableOpacity>
            </View>
            <View style={{ height: 28 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGradient: { paddingTop: Platform.OS === "ios" ? 52 : 40, paddingBottom: 20, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, gap: 12 },
  backButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 23, fontWeight: "700", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 3 },
  headerAdd: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  introRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  countText: { fontSize: 18, fontWeight: "700", color: Colors.text },
  helperText: { fontSize: 12, color: Colors.muted, marginTop: 4 },
  addButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12 },
  addButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  searchBox: { minHeight: 48, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 14, backgroundColor: Colors.card },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text, paddingVertical: 10 },
  listContent: { paddingBottom: 30, flexGrow: 1 },
  groupCard: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: Colors.border, borderRadius: 16, padding: 12, marginBottom: 10, backgroundColor: Colors.card, gap: 10 },
  groupImageWrap: { width: 62, height: 62, borderRadius: 13, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  groupImage: { width: "100%", height: "100%" },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 15, fontWeight: "600", color: Colors.text },
  groupMeta: { fontSize: 11, color: Colors.muted, marginTop: 4 },
  groupPrice: { fontSize: 14, fontWeight: "700", color: Colors.text, marginTop: 5 },
  groupUnit: { fontSize: 11, fontWeight: "400", color: Colors.muted },
  deleteButton: { padding: 8, backgroundColor: "#FF3B3010", borderRadius: 10 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  stateText: { fontSize: 12, color: Colors.muted, lineHeight: 18 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30, paddingVertical: 70 },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: Colors.text, marginTop: 14, marginBottom: 6 },
  emptyAdd: { marginTop: 18, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: 12 },
  emptyAddText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: { paddingTop: Platform.OS === "ios" ? 52 : 40, paddingBottom: 18, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 12 },
  modalContent: { paddingHorizontal: 18, paddingTop: 22 },
  fieldLabel: { fontSize: 11, letterSpacing: 1, color: Colors.muted, fontWeight: "700", marginBottom: 8 },
  nameInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 14, color: Colors.text, fontSize: 15, marginBottom: 24 },
  selectionHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: Colors.text, marginBottom: 3 },
  standardHint: { color: Colors.muted, fontSize: 11, lineHeight: 17, marginBottom: 12 },
  productChoice: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 13, padding: 10, marginBottom: 8 },
  productChoiceSelected: { borderColor: Colors.text, backgroundColor: "#00000006" },
  choiceImageWrap: { width: 44, height: 44, borderRadius: 9, backgroundColor: Colors.surface, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  choiceImage: { width: "100%", height: "100%" },
  choiceInfo: { flex: 1 },
  choiceName: { fontSize: 13, fontWeight: "600", color: Colors.text },
  choiceMeta: { fontSize: 10, color: Colors.muted, marginTop: 4 },
  standardButton: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: 3 },
  standardText: { fontSize: 9, color: Colors.muted },
  standardTextActive: { color: Colors.success, fontWeight: "700" },
  noProducts: { color: Colors.muted, textAlign: "center", paddingVertical: 28, fontSize: 13 },
  modalFooter: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: Colors.border, borderRadius: 13, paddingVertical: 14, alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600", color: Colors.secondary },
  saveButton: { flex: 1.5, flexDirection: "row", gap: 6, backgroundColor: Colors.primary, borderRadius: 13, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  saveText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
});

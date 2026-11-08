import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInRight,
  ZoomIn,
} from "react-native-reanimated";
import { db } from "../firebase/config";

// ── Clean Black/White/Grey Color Scheme ──
const Colors = {
  background: "#FFFFFF",
  card: "#FFFFFF",
  surface: "#F5F5F5",
  textPrimary: "#000000",
  textSecondary: "#666666",
  muted: "#999999",
  separator: "#E8E8E8",
  primary: "#000000",
  primaryLight: "#00000010",
  accent: "#333333",
  success: "#34C759",
  warning: "#FF9500",
  danger: "#FF3B30",
  lowStock: "#FF9500",
};

export default function ProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(data);
        setIsLoading(false);
        console.log("Products Updated:", data.length);
      },
      (error) => {
        console.log(error);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const filteredProducts = useMemo(() => {
    const searchLower = search.toLowerCase();
    return products.filter((product) =>
      product.name?.toLowerCase().includes(searchLower) ||
      product.category?.toLowerCase().includes(searchLower) ||
      product.id?.toLowerCase().includes(searchLower)
    );
  }, [products, search]);

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const lowStockCount = products.filter((p) => (p.stock || 0) <= 5).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 0), 0);
    return { totalProducts, lowStockCount, totalValue };
  }, [products]);

  const deleteProduct = async (id: string, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "products", id));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Success", "Product deleted successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to delete product");
            }
          },
        },
      ]
    );
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) return { text: "Out of Stock", color: Colors.danger, icon: "close-circle" };
    if (stock <= 5) return { text: "Low Stock", color: Colors.lowStock, icon: "alert-circle" };
    return { text: "In Stock", color: Colors.success, icon: "checkmark-circle" };
  };

  const renderProductCard = ({ item, index }: { item: any; index: number }) => {
    const stockStatus = getStockStatus(item.stock || 0);
    
    return (
      <Animated.View
        entering={FadeInRight.delay(index * 50).springify().damping(18)}
      >
        <TouchableOpacity
          style={styles.productCard}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push({
              pathname: "/edit-product",
              params: { id: item.id },
            });
          }}
          activeOpacity={0.7}
        >
          <View style={styles.productGradient}>
            <View style={styles.productLeft}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.productImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={24} color={Colors.muted} />
                </View>
              )}
            </View>

            <View style={styles.productCenter}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.productCategory}>
                <Ionicons name="folder-outline" size={12} color={Colors.muted} />
                {" "}{item.category}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.productPrice}>₹{item.price}</Text>
                {Number(item.mrp ?? item.price) > Number(item.price) ? (
                  <Text style={styles.productMrp}>₹{item.mrp}</Text>
                ) : null}
                <Text style={styles.productUnit}>{item.unit || "unit"}</Text>
              </View>
              {Number(item.mrp ?? item.price) > Number(item.price) ? (
                <Text style={styles.productSavings}>
                  Save ₹{(Number(item.mrp) - Number(item.price)).toFixed(2)} per unit
                </Text>
              ) : null}
            </View>

            <View style={styles.productRight}>
              <View style={[styles.stockBadge, { backgroundColor: stockStatus.color + "15" }]}>
                <Ionicons name={stockStatus.icon as any} size={10} color={stockStatus.color} />
                <Text style={[styles.stockText, { color: stockStatus.color }]}>
                  {stockStatus.text}
                </Text>
              </View>
              <Text style={styles.stockCount}>{item.stock || 0} left</Text>
              <TouchableOpacity
                style={styles.deleteIconBtn}
                onPress={() => deleteProduct(item.id, item.name)}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const EmptyState = () => (
    <Animated.View entering={ZoomIn.delay(200)} style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="cube-outline" size={64} color={Colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>No products found</Text>
      <Text style={styles.emptySubtitle}>
        {search ? "Try adjusting your search" : "Add your first product to get started"}
      </Text>
      {!search && (
        <TouchableOpacity
          style={styles.emptyAddBtn}
          onPress={() => router.push("/add-product")}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.accent]}
            style={styles.emptyAddGradient}
          >
            <Ionicons name="add-outline" size={20} color="#FFFFFF" />
            <Text style={styles.emptyAddText}>Add Product</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.accent]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Products</Text>
            <Text style={styles.headerSubtitle}>Manage your inventory</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/add-product");
            }}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"]}
              style={styles.addBtnGradient}
            >
              <Ionicons name="add-outline" size={22} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>

      {/* Stats Cards */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
            <Ionicons name="cube-outline" size={20} color={Colors.primary} />
          </View>
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Total Products</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: Colors.lowStock + "15" }]}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.lowStock} />
          </View>
          <Text style={[styles.statValue, { color: stats.lowStockCount > 0 ? Colors.lowStock : Colors.success }]}>
            {stats.lowStockCount}
          </Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: Colors.success + "15" }]}>
            <Ionicons name="cash-outline" size={20} color={Colors.success} />
          </View>
          <Text style={styles.statValue}>₹{stats.totalValue.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Inventory Value</Text>
        </View>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.muted} />
          <TextInput
            placeholder="Search products by name, category..."
            placeholderTextColor={Colors.muted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={Colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Products List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="cube-outline" size={48} color={Colors.muted} />
          </View>
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderProductCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={EmptyState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: "hidden",
  },
  addBtnGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    backgroundColor: Colors.card,
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.muted,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.separator,
    alignSelf: "center",
  },

  // Search
  searchWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },

  // Product Card
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  productCard: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.separator,
    backgroundColor: Colors.card,
  },
  productGradient: {
    flexDirection: "row",
    padding: 12,
  },
  productLeft: {
    marginRight: 12,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  productCenter: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: Colors.muted,
    marginBottom: 6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  productMrp: { fontSize: 12, color: Colors.muted, textDecorationLine: "line-through" },
  productSavings: { fontSize: 11, color: Colors.success, fontWeight: "600", marginTop: 2 },
  productUnit: {
    fontSize: 11,
    color: Colors.muted,
  },
  productRight: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    marginBottom: 6,
  },
  stockText: {
    fontSize: 10,
    fontWeight: "600",
  },
  stockCount: {
    fontSize: 11,
    color: Colors.muted,
    marginBottom: 8,
  },
  deleteIconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: Colors.danger + "10",
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.muted,
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: "center",
    marginBottom: 20,
  },
  emptyAddBtn: {
    borderRadius: 30,
    overflow: "hidden",
  },
  emptyAddGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  emptyAddText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
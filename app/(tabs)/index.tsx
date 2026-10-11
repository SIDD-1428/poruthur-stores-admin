import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "../../firebase/config";


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
  info: "#5856D6",
  pending: "#FF9500",
  delivered: "#34C759",
  cancelled: "#FF3B30",
  outForDelivery: "#5856D6",
  accepted: "#AF52DE",
  packed: "#FF2D55",
};

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setOrders(data);
        setIsLoading(false);
        console.log("Orders Updated:", data.length);
      },
      (error) => {
        console.log("ORDER ERROR:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return Colors.pending;
      case "Accepted": return Colors.accepted;
      case "Packed": return Colors.packed;
      case "Out For Delivery": return Colors.outForDelivery;
      case "Delivered": return Colors.delivered;
      case "Cancelled": return Colors.cancelled;
      default: return Colors.muted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending": return "time-outline";
      case "Accepted": return "checkmark-circle-outline";
      case "Packed": return "cube-outline";
      case "Out For Delivery": return "bicycle-outline";
      case "Delivered": return "bag-check-outline";
      case "Cancelled": return "close-circle-outline";
      default: return "ellipse-outline";
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const statusMatch = filter === "All" ? true : order.status === filter;
      const searchLower = search.toLowerCase();
      const searchMatch =
        String(order.customerName || "")
          .toLowerCase()
          .includes(searchLower) ||
        String(order.customerEmail || "")
          .toLowerCase()
          .includes(searchLower) ||
        String(order.id || "")
          .toLowerCase()
          .includes(searchLower) ||
        String(order.address?.address || "")
          .toLowerCase()
          .includes(searchLower);
      return statusMatch && searchMatch;
    });
  }, [orders, filter, search]);

  const statusCounts = useMemo(() => {
    return {
      All: orders.length,
      Pending: orders.filter((o) => o.status === "Pending").length,
      Accepted: orders.filter((o) => o.status === "Accepted").length,
      Packed: orders.filter((o) => o.status === "Packed").length,
      "Out For Delivery": orders.filter((o) => o.status === "Out For Delivery").length,
      Delivered: orders.filter((o) => o.status === "Delivered").length,
      Cancelled: orders.filter((o) => o.status === "Cancelled").length,
    };
  }, [orders]);

 const totalRevenue = useMemo(() => {
  return orders
    .filter((o) => o.status === "Delivered")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
}, [orders]);


  const handleFilterPress = (status: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(status);
  };

 const renderOrderCard = ({ item, index }: { item: any; index: number }) => {
  const orderId = String(item?.id || "");
  const customerName = item?.customerName || "Customer";
  const total = Number(item?.total || 0);
  const status = item?.status || "Pending";

  return (
    <View>
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

          if (!orderId) {
            console.log("Invalid order ID:", item);
            return;
          }

          router.push({
            pathname: "/order/[id]",
            params: { id: orderId },
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.orderGradient}>

          <View style={styles.orderHeader}>
            <View style={styles.orderLeft}>

              <View style={styles.orderIdContainer}>
                <Ionicons
                  name="receipt-outline"
                  size={14}
                  color={Colors.primary}
                />

                <Text style={styles.orderId}>
                  #{orderId.slice(0, 8).toUpperCase()}
                </Text>
              </View>

              <Text style={styles.orderCustomer}>
                {customerName}
              </Text>

            </View>

            <View style={styles.orderRight}>
              <Text style={styles.orderAmount}>
                ₹{total.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.orderDetails}>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    getStatusColor(status) + "15",
                },
              ]}
            >
              <Ionicons
                name={getStatusIcon(status) as any}
                size={12}
                color={getStatusColor(status)}
              />

              <Text
                style={[
                  styles.statusText,
                  {
                    color: getStatusColor(status),
                  },
                ]}
              >
                {status}
              </Text>
            </View>
                        {/* Payment Method */}
            <View
              style={[
                styles.paymentBadge,
                item.payment?.method === "QR Payment"
                  ? styles.qrPaymentBadge
                  : styles.codPaymentBadge,
              ]}
            >
              <Ionicons
                name={
                  item.payment?.method === "QR Payment"
                    ? "qr-code-outline"
                    : "cash-outline"
                }
                size={12}
                color={
                  item.payment?.method === "QR Payment"
                    ? "#5856D6"
                    : "#34C759"
                }
              />

              <Text
                style={[
                  styles.paymentBadgeText,
                  {
                    color:
                      item.payment?.method === "QR Payment"
                        ? "#5856D6"
                        : "#34C759",
                  },
                ]}
              >
                {item.payment?.method === "QR Payment"
                  ? "QR Payment"
                  : "Cash on Delivery"}
              </Text>
            </View>

            {/* Order Meta */}
            <View style={styles.orderMeta}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="location-outline"
                  size={12}
                  color={Colors.muted}
                />

                <Text style={styles.metaText} numberOfLines={1}>
                  {item.address?.address?.slice(0, 30) || "No address"}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={Colors.muted}
                />

                <Text style={styles.metaText}>
                  {item.createdAt?.toDate
                    ? item.createdAt.toDate().toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Just now"}
                </Text>
              </View>
            </View>
                      <View style={styles.orderFooter}>
            <View style={styles.itemsCount}>
              <Ionicons
                name="bag-outline"
                size={12}
                color={Colors.muted}
              />

              <Text style={styles.itemsText}>
                {item.items?.length || 0} items
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={16}
              color={Colors.muted}
            />
          </View>

          </View>

        </View>
      </TouchableOpacity>
    </View>
  );
};

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="receipt-outline" size={64} color={Colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>No orders found</Text>
      <Text style={styles.emptySubtitle}>
        {search ? "Try adjusting your search" : "Orders will appear here"}
      </Text>
    </View>
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Orders</Text>
            <Text style={styles.headerSubtitle}>Manage customer orders</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>{orders.length}</Text>
              <Text style={styles.headerStatLabel}>Total</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatValue}>₹{totalRevenue.toLocaleString()}</Text>
              <Text style={styles.headerStatLabel}>Revenue</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={Colors.muted} />
          <TextInput
            placeholder="Search orders"
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
      </View>

      {/* Filter Chips */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {Object.entries(statusCounts).map(([status, count]) => (
            <TouchableOpacity
              key={status}
              onPress={() => handleFilterPress(status)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={filter === status ? [Colors.primary, Colors.accent] : ["#FFFFFF", "#F5F5F5"]}
                style={[
                  styles.filterChip,
                  filter === status && styles.filterChipActive,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {filter !== status && status !== "All" && (
                  <View style={[styles.filterDot, { backgroundColor: getStatusColor(status) }]} />
                )}
                <Text
                  style={[
                    styles.filterText,
                    filter === status && styles.filterTextActive,
                  ]}
                >
                  {status} ({count})
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Orders List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Ionicons name="cart-outline" size={48} color={Colors.muted} />
          </View>
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item, index) =>
            String(item?.id || index)
          }
          renderItem={renderOrderCard}
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
    paddingTop: 50,
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
  headerStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  headerStat: {
    alignItems: "center",
  },
  headerStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
  },
  headerStatDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.3)",
  },

  // Search
  searchWrapper: {
    paddingHorizontal: 16,
    marginTop: -15,
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

  // Filters
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 10,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 30,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  filterChipActive: {
    borderWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: "#FFFFFF",
  },

  // Order Card
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  orderCard: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.separator,
    backgroundColor: Colors.card,
  },
  orderGradient: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderLeft: {
    flex: 1,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  orderId: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  orderCustomer: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  orderRight: {
    alignItems: "flex-end",
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  orderDetails: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  orderMeta: {
    gap: 6,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: Colors.muted,
    flex: 1,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.separator,
    paddingTop: 10,
    marginTop: 4,
  },
  itemsCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemsText: {
    fontSize: 12,
    color: Colors.muted,
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
  },
  paymentBadge: {
  flexDirection: "row",
  alignItems: "center",
  alignSelf: "flex-start",
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 20,
  gap: 6,
  marginBottom: 10,
},

qrPaymentBadge: {
  backgroundColor: "#5856D615",
},

codPaymentBadge: {
  backgroundColor: "#34C75915",
},

paymentBadgeText: {
  fontSize: 11,
  fontWeight: "600",
},
});
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
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
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    FadeInRight,
    ZoomIn,
} from "react-native-reanimated";
import { auth, db } from "../../firebase/config";

const { width } = Dimensions.get("window");

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
    info: "#5856D6",
};

export default function Dashboard() {
    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [adminName, setAdminName] = useState("Admin");

    useEffect(() => {
        const ordersQuery = query(
            collection(db, "orders"),
            orderBy("createdAt", "desc")
        );

        const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setOrders(data);
        });

        const unsubscribeProducts = onSnapshot(collection(db, "products"), (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setProducts(data);
        });

        if (auth.currentUser?.displayName) {
            setAdminName(auth.currentUser.displayName.split(" ")[0]);
        }

        return () => {
            unsubscribeOrders();
            unsubscribeProducts();
        };
    }, []);

    // ── Stats Calculations ──
    const revenue = useMemo(() => {
        return orders
            .filter((order) => order.status === "Delivered")
            .reduce((sum, order) => sum + (order.total || 0), 0);
    }, [orders]);

    const revenueToday = useMemo(() => {
        const today = new Date();
        return orders
            .filter((order) => {
                if (order.status !== "Delivered") return false;
                if (!order.createdAt?.toDate) return false;
                const date = order.createdAt.toDate();
                return (
                    date.getDate() === today.getDate() &&
                    date.getMonth() === today.getMonth() &&
                    date.getFullYear() === today.getFullYear()
                );
            })
            .reduce((sum, order) => sum + (order.total || 0), 0);
    }, [orders]);

    const revenueMonth = useMemo(() => {
        const now = new Date();
        return orders
            .filter((order) => {
                if (order.status !== "Delivered") return false;
                if (!order.createdAt?.toDate) return false;
                const date = order.createdAt.toDate();
                return (
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear()
                );
            })
            .reduce((sum, order) => sum + (order.total || 0), 0);
    }, [orders]);

    const topProduct = useMemo(() => {
        const sales: Record<string, number> = {};
        orders.forEach((order) => {
            if (order.status !== "Delivered") return;
            order.items?.forEach((item: any) => {
                sales[item.name] = (sales[item.name] || 0) + item.quantity;
            });
        });
        let top = "None";
        let qty = 0;
        Object.entries(sales).forEach(([name, sold]) => {
            if (sold > qty) {
                qty = sold;
                top = name;
            }
        });
        return { name: top, quantity: qty };
    }, [orders]);

    const lowStock = useMemo(() => {
        return products.filter((product) => (product.stock || 0) <= 5);
    }, [products]);

    const pendingOrders = useMemo(() => {
        return orders.filter((order) => order.status === "Pending").length;
    }, [orders]);

    const recentOrders = orders.slice(0, 5);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    const handleNavigation = async (
  route: string
) => {
  console.log(
    "Navigating to:",
    route
  );

  await Haptics.impactAsync(
    Haptics.ImpactFeedbackStyle.Light
  );

  router.push(route as any);
};

    const handleLogout = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await signOut(auth);
        router.replace("/login");
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* ── Header Section ── */}
            <LinearGradient
                colors={[Colors.primary, Colors.accent]}
                style={styles.headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{getGreeting()},</Text>
                        <Text style={styles.adminName}>Davis</Text>
                        <Text style={styles.roleBadge}>Store Owner</Text>
                    </View>
                    <View style={styles.headerStats}>
                        <View style={styles.storeBadge}>
                            <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.storeBadgeText}>Admin Portal</Text>
                        </View>
                    </View>
                </Animated.View>
            </LinearGradient>

            {/* ── Stats Grid ── */}
            <View style={styles.statsGrid}>
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statWrapper}>
                    <TouchableOpacity onPress={() => handleNavigation("/revenue")} activeOpacity={0.9}>
                        <View style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                                <Ionicons name="cash-outline" size={22} color={Colors.primary} />
                            </View>
                            <Text style={styles.statValue}>₹{revenue.toLocaleString()}</Text>
                            <Text style={styles.statLabel}>Total Revenue</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.statWrapper}>
                   
                        <View style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                                <Ionicons name="bag-outline" size={22} color={Colors.primary} />
                            </View>
                            <Text style={styles.statValue}>{orders.length}</Text>
                            <Text style={styles.statLabel}>Total Orders</Text>
                            {pendingOrders > 0 && (
                                <View style={styles.pendingBadge}>
                                    <Text style={styles.pendingText}>{pendingOrders} pending</Text>
                                </View>
                            )}
                        </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statWrapper}>
                    <TouchableOpacity onPress={() => handleNavigation("/products")} activeOpacity={0.9}>
                        <View style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                                <Ionicons name="cube-outline" size={22} color={Colors.primary} />
                            </View>
                            <Text style={styles.statValue}>{products.length}</Text>
                            <Text style={styles.statLabel}>Products</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.statWrapper}>
                    <TouchableOpacity onPress={() => handleNavigation("/products")} activeOpacity={0.9}>
                        <View style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                                <Ionicons name="alert-circle-outline" size={22} color={Colors.primary} />
                            </View>
                            <Text style={[styles.statValue, { color: lowStock.length > 0 ? Colors.danger : Colors.success }]}>
                                {lowStock.length}
                            </Text>
                            <Text style={styles.statLabel}>Low Stock</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* ── Quick Stats Row ── */}
            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.quickStats}>
                <View style={styles.quickStatItem}>
                    <Text style={styles.quickStatValue}>₹{revenueToday.toLocaleString()}</Text>
                    <Text style={styles.quickStatLabel}>Today&apos;s Revenue</Text>
                </View>
                <View style={styles.quickDivider} />
                <View style={styles.quickStatItem}>
                    <Text style={styles.quickStatValue}>₹{revenueMonth.toLocaleString()}</Text>
                    <Text style={styles.quickStatLabel}>This Month</Text>
                </View>
                <View style={styles.quickDivider} />
                <View style={styles.quickStatItem}>
                    <Text style={styles.quickStatValue}>{topProduct.name !== "None" ? topProduct.name.slice(0, 10) : "—"}</Text>
                    <Text style={styles.quickStatLabel}>Top Product</Text>
                </View>
            </Animated.View>

            {/* ── Quick Actions ── */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <Text style={styles.sectionSubtitle}>Manage your store efficiently</Text>
            </View>

            <View style={styles.actionsGrid}>
                <Animated.View entering={FadeInRight.delay(350).springify()} style={styles.actionWrapper}>
                    <TouchableOpacity style={styles.actionCard} onPress={() =>
  router.navigate("/")
}>
                        <View style={styles.actionGradient}>
                            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
                                <Ionicons name="cart-outline" size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.actionTitle}>Orders</Text>
                            <Text style={styles.actionSub}>Manage orders</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInRight.delay(400).springify()} style={styles.actionWrapper}>
                    <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigation("/products")}>
                        <View style={styles.actionGradient}>
                            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
                                <Ionicons name="grid-outline" size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.actionTitle}>Products</Text>
                            <Text style={styles.actionSub}>Manage inventory</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInRight.delay(450).springify()} style={styles.actionWrapper}>
                    <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigation("/categories")}>
                        <View style={styles.actionGradient}>
                            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight, },]}>
                                <Ionicons name="layers-outline" size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.actionTitle}>Categories</Text>
                            <Text style={styles.actionSub}>Arrange categories</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInRight.delay(500).springify()} style={styles.actionWrapper}>
                    <TouchableOpacity style={styles.actionCard} onPress={() => handleNavigation("/customers")}>
                        <View style={styles.actionGradient}>
                            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
                                <Ionicons name="people-outline" size={24} color={Colors.primary} />
                            </View>
                            <Text style={styles.actionTitle}>Customers</Text>
                            <Text style={styles.actionSub}>View customers</Text>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* ── Recent Orders ── */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Orders</Text>
                <Text style={styles.sectionSubtitle}>Latest transactions</Text>
            </View>

            {recentOrders.length === 0 ? (
                <Animated.View entering={ZoomIn.delay(550)} style={styles.emptyCard}>
                    <Ionicons name="receipt-outline" size={48} color={Colors.muted} />
                    <Text style={styles.emptyText}>No orders yet</Text>
                </Animated.View>
            ) : (
                recentOrders.map((order, index) => (
                    <Animated.View
                        key={order.id}
                        entering={FadeInDown.delay(550 + index * 50).springify()}
                    >
                        <TouchableOpacity
                            style={styles.orderCard}
                            onPress={() => handleNavigation(`/order/${order.id}`)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.orderGradient}>
                                <View style={styles.orderHeader}>
                                    <View>
                                        <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
                                        <Text style={styles.orderDate}>
                                            {order.createdAt?.toDate
                                                ? order.createdAt.toDate().toLocaleDateString("en-IN")
                                                : "Just now"}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.orderStatus,
                                        order.status === "Delivered" && styles.statusDelivered,
                                        order.status === "Pending" && styles.statusPending,
                                        order.status === "Cancelled" && styles.statusCancelled,
                                    ]}>
                                        <View style={[
                                            styles.statusDot,
                                            order.status === "Delivered" && { backgroundColor: Colors.success },
                                            order.status === "Pending" && { backgroundColor: Colors.warning },
                                            order.status === "Cancelled" && { backgroundColor: Colors.danger },
                                        ]} />
                                        <Text style={styles.orderStatusText}>{order.status}</Text>
                                    </View>
                                </View>
                                <View style={styles.orderFooter}>
                                    <Text style={styles.orderAmount}>₹{order.total}</Text>
                                    <Text style={styles.orderItems}>{order.items?.length || 0} items</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                ))
            )}

            {/* ── Low Stock Alerts ── */}
            {lowStock.length > 0 && (
                <>
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Inventory Alerts</Text>
                        <Text style={styles.sectionSubtitle}>Items running low</Text>
                    </View>

                    {lowStock.slice(0, 5).map((product, index) => (
                        <Animated.View
                            key={product.id}
                            entering={FadeInDown.delay(700 + index * 50).springify()}
                        >
                            <TouchableOpacity
                                style={styles.lowStockCard}
                                onPress={() => handleNavigation(`/edit-product?id=${product.id}`)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.lowStockGradient}>
                                    <View style={styles.lowStockLeft}>
                                        <View style={styles.lowStockIcon}>
                                            <Ionicons name="warning-outline" size={20} color={Colors.danger} />
                                        </View>
                                        <View>
                                            <Text style={styles.lowStockName}>{product.name}</Text>
                                            <Text style={styles.lowStockCategory}>{product.category}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.lowStockRight}>
                                        <Text style={styles.lowStockCount}>{product.stock || 0} left</Text>
                                        <View style={styles.lowStockBar}>
                                            <View style={[styles.lowStockFill, { width: `${((product.stock || 0) / 20) * 100}%` }]} />
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </>
            )}

            {/* ── Logout Button ── */}
            <Animated.View entering={FadeInDown.delay(800).springify()}>
                <TouchableOpacity onPress={handleLogout} activeOpacity={0.8}>
                    <LinearGradient
                        colors={["#000000", "#333333"]}
                        style={styles.logoutButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Ionicons name="log-out-outline" size={20} color="#FFF" />
                        <Text style={styles.logoutText}>Logout</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    contentContainer: {
        paddingBottom: 40,
    },

    // Header
    headerGradient: {
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 30,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    greeting: {
        fontSize: 14,
        color: "#FFFFFF",
        opacity: 0.8,
        marginBottom: 4,
    },
    adminName: {
        fontSize: 28,
        fontWeight: "700",
        color: "#FFFFFF",
        marginBottom: 4,
    },
    roleBadge: {
        fontSize: 12,
        color: "#FFFFFF",
        opacity: 0.8,
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        alignSelf: "flex-start",
        marginTop: 6,
    },
    headerStats: {
        alignItems: "flex-end",
    },
    storeBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    storeBadgeText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#FFFFFF",
    },

    // Stats Grid
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginTop: 50,
    },
    statWrapper: {
        width: "48%",
        marginBottom: 12,
    },
    statCard: {
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.separator,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    statValue: {
        fontSize: 24,
        fontWeight: "700",
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.muted,
        fontWeight: "500",
    },
    pendingBadge: {
        position: "absolute",
        top: 12,
        right: 12,
        backgroundColor: Colors.warning + "20",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    pendingText: {
        fontSize: 10,
        fontWeight: "600",
        color: Colors.warning,
    },

    // Quick Stats Row
    quickStats: {
        flexDirection: "row",
        backgroundColor: Colors.card,
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 20,
        borderRadius: 20,
        padding: 16,
        justifyContent: "space-around",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
        borderColor: Colors.separator,
    },
    quickStatItem: {
        alignItems: "center",
        flex: 1,
    },
    quickStatValue: {
        fontSize: 16,
        fontWeight: "700",
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    quickStatLabel: {
        fontSize: 11,
        color: Colors.muted,
        fontWeight: "500",
    },
    quickDivider: {
        width: 1,
        height: 30,
        backgroundColor: Colors.separator,
    },

    // Sections
    section: {
        paddingHorizontal: 16,
        marginTop: 24,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: Colors.muted,
    },

    // Actions Grid
    actionsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        paddingHorizontal: 16,
    },
    actionWrapper: {
        width: "48%",
        marginBottom: 12,
    },
    actionCard: {
        backgroundColor: Colors.card,
        borderRadius: 20,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: Colors.separator,
    },
    actionGradient: {
        padding: 16,
        alignItems: "center",
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    actionSub: {
        fontSize: 11,
        color: Colors.muted,
        textAlign: "center",
    },

    // Order Cards
    orderCard: {
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 16,
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
    orderId: {
        fontSize: 14,
        fontWeight: "600",
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    orderDate: {
        fontSize: 11,
        color: Colors.muted,
    },
    orderStatus: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDelivered: {
        backgroundColor: Colors.success + "15",
    },
    statusPending: {
        backgroundColor: Colors.warning + "15",
    },
    statusCancelled: {
        backgroundColor: Colors.danger + "15",
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    orderStatusText: {
        fontSize: 11,
        fontWeight: "600",
    },
    orderFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: Colors.separator,
        paddingTop: 12,
    },
    orderAmount: {
        fontSize: 18,
        fontWeight: "700",
        color: Colors.textPrimary,
    },
    orderItems: {
        fontSize: 12,
        color: Colors.muted,
    },

    // Low Stock Cards
    lowStockCard: {
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: Colors.danger + "30",
        backgroundColor: Colors.card,
    },
    lowStockGradient: {
        padding: 16,
    },
    lowStockLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
    },
    lowStockIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: Colors.danger + "15",
        justifyContent: "center",
        alignItems: "center",
    },
    lowStockName: {
        fontSize: 15,
        fontWeight: "600",
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    lowStockCategory: {
        fontSize: 11,
        color: Colors.muted,
    },
    lowStockRight: {
        flex: 1,
    },
    lowStockCount: {
        fontSize: 13,
        fontWeight: "600",
        color: Colors.danger,
        marginBottom: 6,
        textAlign: "right",
    },
    lowStockBar: {
        height: 4,
        backgroundColor: Colors.separator,
        borderRadius: 2,
        overflow: "hidden",
    },
    lowStockFill: {
        height: "100%",
        backgroundColor: Colors.danger,
        borderRadius: 2,
    },

    // Empty State
    emptyCard: {
        backgroundColor: Colors.card,
        marginHorizontal: 16,
        padding: 40,
        borderRadius: 20,
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.separator,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.muted,
        marginTop: 12,
    },

    // Logout Button
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 16,
        marginTop: 24,
        paddingVertical: 14,
        borderRadius: 30,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
});
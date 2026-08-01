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
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import Animated, {
    FadeInDown
} from "react-native-reanimated";
import { db } from "../firebase/config";

const { width: screenWidth } = Dimensions.get("window");

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

export default function Revenue() {
    const [orders, setOrders] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<"week" | "month" | "year">("week");

    useEffect(() => {
        const q = query(
            collection(db, "orders"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setOrders(data);
        });

        return () => unsubscribe();
    }, []);

    // ── Revenue Calculations ──
    const totalRevenue = useMemo(() => {
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

    // ── Order Statistics ──
    const deliveredOrders = orders.filter((order) => order.status === "Delivered").length;
    const pendingOrders = orders.filter(
        (order) =>
            order.status === "Pending" ||
            order.status === "Accepted" ||
            order.status === "Packed" ||
            order.status === "Out For Delivery"
    ).length;
    const cancelledOrders = orders.filter((order) => order.status === "Cancelled").length;

    const orderStats = [
        { name: "Delivered", count: deliveredOrders, color: Colors.success, icon: "checkmark-circle" },
        { name: "Pending", count: pendingOrders, color: Colors.warning, icon: "time" },
        { name: "Cancelled", count: cancelledOrders, color: Colors.danger, icon: "close-circle" },
    ];

    // ── Top Product ──
    const topProduct = useMemo(() => {
        const sales: Record<string, number> = {};
        orders.forEach((order) => {
            if (order.status !== "Delivered") return;
            order.items?.forEach((item: any) => {
                sales[item.name] = (sales[item.name] || 0) + item.quantity;
            });
        });
        let top = "No Sales Yet";
        let qty = 0;
        Object.entries(sales).forEach(([name, sold]) => {
            if (sold > qty) {
                qty = sold;
                top = name;
            }
        });
        return { name: top, quantity: qty };
    }, [orders]);

    // ── Weekly Revenue ──
    const weeklyRevenue = useMemo(() => {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const revenueMap = [0, 0, 0, 0, 0, 0, 0];
        orders.forEach((order) => {
            if (order.status !== "Delivered") return;
            if (!order.createdAt?.toDate) return;
            const date = order.createdAt.toDate();
            const day = date.getDay();
            revenueMap[day] += order.total || 0;
        });
        return {
            labels: days,
            data: revenueMap,
        };
    }, [orders]);

    // ── Monthly Revenue ──
    const monthlyRevenue = useMemo(() => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const revenueMap = new Array(12).fill(0);
        orders.forEach((order) => {
            if (order.status !== "Delivered") return;
            if (!order.createdAt?.toDate) return;
            const date = order.createdAt.toDate();
            const month = date.getMonth();
            revenueMap[month] += order.total || 0;
        });
        return {
            labels: months,
            data: revenueMap,
        };
    }, [orders]);

    // ── Yearly Revenue ──
    const yearlyRevenue = useMemo(() => {
        const yearMap: Record<number, number> = {};
        orders.forEach((order) => {
            if (order.status !== "Delivered") return;
            if (!order.createdAt?.toDate) return;
            const date = order.createdAt.toDate();
            const year = date.getFullYear();
            yearMap[year] = (yearMap[year] || 0) + (order.total || 0);
        });
        const years = Object.keys(yearMap).sort();
        return {
            labels: years.map(y => y.slice(-2)),
            data: years.map(y => yearMap[Number(y)]),
        };
    }, [orders]);

    const getChartData = () => {
        switch (selectedPeriod) {
            case "week":
                return weeklyRevenue;
            case "month":
                return monthlyRevenue;
            case "year":
                return yearlyRevenue;
            default:
                return weeklyRevenue;
        }
    };

    const averageOrderValue = useMemo(() => {
        if (deliveredOrders === 0) return 0;
        return totalRevenue / deliveredOrders;
    }, [totalRevenue, deliveredOrders]);

    const handlePeriodChange = (period: "week" | "month" | "year") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedPeriod(period);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
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
                    <Text style={styles.title}>Revenue Analytics</Text>
                    <View style={styles.placeholder} />
                </View>
            </LinearGradient>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.statCard}>
                    <View style={styles.statGradient}>
                        <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                            <Ionicons name="cash-outline" size={22} color={Colors.primary} />
                        </View>
                        <Text style={styles.statLabel}>Total Revenue</Text>
                        <Text style={styles.statValue}>₹{totalRevenue.toLocaleString()}</Text>
                        <View style={styles.statFooter}>
                            <Ionicons name="trending-up" size={12} color={Colors.success} />
                            <Text style={styles.statSubtext}>All time</Text>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.statCard}>
                    <View style={styles.statGradient}>
                        <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                            <Ionicons name="today-outline" size={22} color={Colors.primary} />
                        </View>
                        <Text style={styles.statLabel}>Today&apos;s Revenue</Text>
                        <Text style={styles.statValue}>₹{revenueToday.toLocaleString()}</Text>
                        <View style={styles.statFooter}>
                            <Ionicons name="calendar-outline" size={12} color={Colors.muted} />
                            <Text style={styles.statSubtext}>Daily earnings</Text>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statCard}>
                    <View style={styles.statGradient}>
                        <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                            <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
                        </View>
                        <Text style={styles.statLabel}>This Month</Text>
                        <Text style={styles.statValue}>₹{revenueMonth.toLocaleString()}</Text>
                        <View style={styles.statFooter}>
                            <Ionicons name="trending-up" size={12} color={Colors.success} />
                            <Text style={styles.statSubtext}>Monthly earnings</Text>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.statCard}>
                    <View style={styles.statGradient}>
                        <View style={[styles.statIcon, { backgroundColor: Colors.primaryLight }]}>
                            <Ionicons name="receipt-outline" size={22} color={Colors.primary} />
                        </View>
                        <Text style={styles.statLabel}>Avg Order Value</Text>
                        <Text style={styles.statValue}>₹{averageOrderValue.toFixed(0)}</Text>
                        <View style={styles.statFooter}>
                            <Ionicons name="bag-outline" size={12} color={Colors.muted} />
                            <Text style={styles.statSubtext}>Per order</Text>
                        </View>
                    </View>
                </Animated.View>
            </View>

            {/* Revenue Trend Chart */}
            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.chartSection}>
                <View style={styles.chartHeader}>
                    <Text style={styles.sectionTitle}>Revenue Trend</Text>
                    <View style={styles.periodSelector}>
                        <TouchableOpacity
                            style={[styles.periodBtn, selectedPeriod === "week" && styles.periodBtnActive]}
                            onPress={() => handlePeriodChange("week")}
                        >
                            <Text style={[styles.periodText, selectedPeriod === "week" && styles.periodTextActive]}>Week</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.periodBtn, selectedPeriod === "month" && styles.periodBtnActive]}
                            onPress={() => handlePeriodChange("month")}
                        >
                            <Text style={[styles.periodText, selectedPeriod === "month" && styles.periodTextActive]}>Month</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.periodBtn, selectedPeriod === "year" && styles.periodBtnActive]}
                            onPress={() => handlePeriodChange("year")}
                        >
                            <Text style={[styles.periodText, selectedPeriod === "year" && styles.periodTextActive]}>Year</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.chartCard}>
                    {getChartData().data.some(v => v > 0) ? (
                        <LineChart
                            data={{
                                labels: getChartData().labels,
                                datasets: [{ data: getChartData().data }],
                            }}
                            width={screenWidth - 48}
                            height={220}
                            yAxisLabel="₹"
                            chartConfig={{
                                backgroundColor: "#FFFFFF",
                                backgroundGradientFrom: "#FFFFFF",
                                backgroundGradientTo: "#FFFFFF",
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                                style: { borderRadius: 16 },
                                propsForDots: { r: "5", strokeWidth: "2", stroke: Colors.primary },
                            }}
                            bezier
                            style={styles.chart}
                        />
                    ) : (
                        <View style={styles.emptyChart}>
                            <Ionicons name="bar-chart-outline" size={48} color={Colors.muted} />
                            <Text style={styles.emptyChartText}>No revenue data yet</Text>
                        </View>
                    )}
                </View>
            </Animated.View>

            {/* Order Statistics */}
            <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.orderSection}>
                <Text style={styles.sectionTitle}>Order Statistics</Text>
                <View style={styles.orderGrid}>
                    {orderStats.map((stat, index) => (
                        <View key={stat.name} style={styles.orderStatCard}>
                            <View style={styles.orderStatGradient}>
                                <View style={[styles.orderIcon, { backgroundColor: stat.color + "15" }]}>
                                    <Ionicons name={stat.icon as any} size={24} color={stat.color} />
                                </View>
                                <Text style={styles.orderCount}>{stat.count}</Text>
                                <Text style={styles.orderLabel}>{stat.name}</Text>
                                {stat.name === "Delivered" && deliveredOrders > 0 && (
                                    <View style={styles.orderPercent}>
                                        <Text style={styles.orderPercentText}>
                                            {Math.round((stat.count / orders.length) * 100)}%
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    ))}
                </View>
            </Animated.View>

            {/* Product Insights */}
            <Animated.View entering={FadeInDown.delay(500).springify()} style={styles.productSection}>
                <Text style={styles.sectionTitle}>Product Insights</Text>
                <View style={styles.topProductCard}>
                    <View style={styles.topProductHeader}>
                        <View style={styles.trophyIcon}>
                            <Ionicons name="trophy-outline" size={20} color={Colors.warning} />
                        </View>
                        <Text style={styles.topProductLabel}>Top Selling Product</Text>
                    </View>
                    <Text style={styles.topProductName}>{topProduct.name}</Text>
                    {topProduct.name !== "No Sales Yet" && (
                        <View style={styles.topProductFooter}>
                            <Ionicons name="trending-up" size={14} color={Colors.success} />
                            <Text style={styles.topProductSales}>{topProduct.quantity} units sold</Text>
                        </View>
                    )}
                </View>
            </Animated.View>

            {/* Additional Insights */}
            <Animated.View entering={FadeInDown.delay(550).springify()} style={styles.insightsSection}>
                <Text style={styles.sectionTitle}>Insights</Text>
                <View style={styles.insightsGrid}>
                    <View style={styles.insightCard}>
                        <Ionicons name="rocket-outline" size={20} color={Colors.primary} />
                        <Text style={styles.insightText}>
                            {deliveredOrders === 0 
                                ? "Start taking orders to see insights" 
                                : `Average order value is ₹${averageOrderValue.toFixed(0)}`}
                        </Text>
                    </View>
                    <View style={styles.insightCard}>
                        <Ionicons name="alert-circle-outline" size={20} color={Colors.warning} />
                        <Text style={styles.insightText}>
                            {pendingOrders > 0 
                                ? `${pendingOrders} orders pending fulfillment` 
                                : "No pending orders"}
                        </Text>
                    </View>
                </View>
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
    title: {
        fontSize: 22,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    placeholder: {
        width: 40,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        marginTop: -20,
        gap: 12,
    },
    statCard: {
        width: "48%",
        marginBottom: 4,
    },
    statGradient: {
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.separator,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.muted,
        fontWeight: "500",
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: "700",
        color: Colors.textPrimary,
        marginBottom: 6,
    },
    statFooter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    statSubtext: {
        fontSize: 10,
        color: Colors.muted,
    },

    // Chart Section
    chartSection: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    chartHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: Colors.textPrimary,
    },
    periodSelector: {
        flexDirection: "row",
        backgroundColor: Colors.surface,
        borderRadius: 20,
        padding: 4,
    },
    periodBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    periodBtnActive: {
        backgroundColor: Colors.primary,
    },
    periodText: {
        fontSize: 12,
        fontWeight: "500",
        color: Colors.muted,
    },
    periodTextActive: {
        color: "#FFFFFF",
    },
    chartCard: {
        backgroundColor: Colors.card,
        borderRadius: 24,
        padding: 12,
        borderWidth: 1,
        borderColor: Colors.separator,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    chart: {
        borderRadius: 16,
    },
    emptyChart: {
        height: 220,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyChartText: {
        fontSize: 14,
        color: Colors.muted,
        marginTop: 12,
    },

    // Order Statistics
    orderSection: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    orderGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    orderStatCard: {
        flex: 1,
    },
    orderStatGradient: {
        backgroundColor: Colors.card,
        padding: 14,
        borderRadius: 16,
        alignItems: "center",
        borderWidth: 1,
        borderColor: Colors.separator,
    },
    orderIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    orderCount: {
        fontSize: 22,
        fontWeight: "700",
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    orderLabel: {
        fontSize: 11,
        color: Colors.muted,
        fontWeight: "500",
    },
    orderPercent: {
        marginTop: 6,
        backgroundColor: Colors.surface,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    orderPercentText: {
        fontSize: 10,
        fontWeight: "500",
        color: Colors.muted,
    },

    // Product Section
    productSection: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    topProductCard: {
        backgroundColor: Colors.card,
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.separator,
        alignItems: "center",
    },
    topProductHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    trophyIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.warning + "15",
        justifyContent: "center",
        alignItems: "center",
    },
    topProductLabel: {
        fontSize: 13,
        color: Colors.muted,
        fontWeight: "500",
    },
    topProductName: {
        fontSize: 20,
        fontWeight: "600",
        color: Colors.textPrimary,
        textAlign: "center",
        marginBottom: 8,
    },
    topProductFooter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    topProductSales: {
        fontSize: 12,
        color: Colors.success,
        fontWeight: "500",
    },

    // Insights Section
    insightsSection: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    insightsGrid: {
        gap: 10,
    },
    insightCard: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: Colors.card,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.separator,
    },
    insightText: {
        flex: 1,
        fontSize: 13,
        color: Colors.textSecondary,
        fontWeight: "500",
    },
});
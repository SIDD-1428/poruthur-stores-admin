import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
    collection,
    getDocs,
} from "firebase/firestore";
import React, {
    useEffect,
    useState,
} from "react";
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
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
    accent: "#333333",
    success: "#34C759",
    warning: "#FF9500",
    danger: "#FF3B30",
};

type Address = {
    id: string;
    userId?: string;
    address?: string;
    phone?: string;
    landmark?: string;
    type?: string;
};

type UserData = {
    name?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    createdAt?: any;
};

type Customer = {
    id: string;
    name?: string;
    email?: string;
    phone: string;
    address: string;
    addressType?: string;
    landmark?: string;
    joinedDate?: string;
};

export default function Customers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            const usersSnapshot = await getDocs(collection(db, "users"));
            const addressesSnapshot = await getDocs(collection(db, "addresses"));

            const addresses: Address[] = addressesSnapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<Address, "id">),
            }));

            const customerData = usersSnapshot.docs.map((doc) => {
            const user = doc.data() as UserData;
            const userAddress = addresses.find((a) => a.userId === doc.id);

            let joinedDate = "Recently";

            if (user.createdAt?.toDate) {
                const date = user.createdAt.toDate();

                joinedDate = date.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                });
            }

            const customerName =
                user.fullName ||
                `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() ||
                user.name ||
                "Guest User";

            return {
                id: doc.id,
                name: customerName,
                email: user.email || "No email",
                phone: userAddress?.phone || user.phone || "-",
                address: userAddress?.address || "No address added",
                addressType: userAddress?.type || "Not set",
                landmark: userAddress?.landmark,
                joinedDate,
            };
        });
            setCustomers(customerData);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await loadCustomers();
        setRefreshing(false);
    };

    const formatPhoneNumber = (phone: string) => {
        if (!phone || phone === "-") return phone;
        // Format Indian phone numbers
        if (phone.length === 10) {
            return `${phone.slice(0, 5)} ${phone.slice(5)}`;
        }
        return phone;
    };

    const EmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={64} color={Colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>No Customers Yet</Text>
            <Text style={styles.emptySubtitle}>
                Customers will appear here when they sign up
            </Text>
        </View>
    );

    const CustomerCard = ({ customer }: { customer: Customer }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Navigate to customer details if needed
            }}
        >
            <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {customer.name?.charAt(0)?.toUpperCase() || "U"}
                    </Text>
                </View>
                <View style={styles.customerInfo}>
                    <Text style={styles.name}>{customer.name}</Text>
                    <View style={styles.badgeContainer}>
                        <View style={styles.badge}>
                            <Ionicons name="calendar-outline" size={10} color={Colors.muted} />
                            <Text style={styles.badgeText}>Joined {customer.joinedDate}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={14} color={Colors.muted} />
                    <Text style={styles.detailText}>{customer.email}</Text>
                </View>

                <View style={styles.detailRow}>
                    <Ionicons name="call-outline" size={14} color={Colors.muted} />
                    <Text style={styles.detailText}>{formatPhoneNumber(customer.phone)}</Text>
                </View>

                <View style={styles.detailRow}>
                    <Ionicons name="location-outline" size={14} color={Colors.muted} />
                    <View style={styles.addressContainer}>
                        <Text style={styles.addressTypeBadge}>{customer.addressType}</Text>
                        <Text style={styles.addressText} numberOfLines={2}>
                            {customer.address}
                        </Text>
                        {customer.landmark && (
                            <Text style={styles.landmarkText}>📍 Near {customer.landmark}</Text>
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingIcon}>
                    <Ionicons name="people-outline" size={48} color={Colors.muted} />
                </View>
                <Text style={styles.loadingText}>Loading customers...</Text>
            </View>
        );
    }

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
                    <Text style={styles.title}>Customers</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{customers.length}</Text>
                        <Text style={styles.statLabel}>Total Customers</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statNumber}>
                            {customers.filter(c => c.address !== "No address added").length}
                        </Text>
                        <Text style={styles.statLabel}>With Address</Text>
                    </View>
                </View>
            </LinearGradient>

            <FlatList
                data={customers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
                renderItem={({ item }) => <CustomerCard customer={item} />}
                ListEmptyComponent={EmptyState}
            />
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
        marginBottom: 16,
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
        fontSize: 24,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    placeholder: {
        width: 40,
    },

    // Stats
    statsContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.15)",
        marginHorizontal: 20,
        borderRadius: 20,
        padding: 12,
    },
    statBox: {
        flex: 1,
        alignItems: "center",
    },
    statNumber: {
        fontSize: 24,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    statLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.8)",
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: "rgba(255,255,255,0.3)",
    },

    listContainer: {
        padding: 16,
        paddingBottom: 30,
    },

    // Loading State
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: Colors.background,
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

    // Customer Card
    card: {
        backgroundColor: Colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.separator,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 14,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.surface,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
        borderWidth: 1,
        borderColor: Colors.separator,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: "600",
        color: Colors.textPrimary,
    },
    customerInfo: {
        flex: 1,
    },
    name: {
        fontSize: 17,
        fontWeight: "600",
        color: Colors.textPrimary,
        marginBottom: 4,
    },
    badgeContainer: {
        flexDirection: "row",
        alignItems: "center",
    },
    badge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.surface,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        gap: 4,
    },
    badgeText: {
        fontSize: 10,
        color: Colors.muted,
    },
    detailsContainer: {
        gap: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: Colors.separator,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 10,
    },
    detailText: {
        flex: 1,
        fontSize: 13,
        color: Colors.textSecondary,
    },
    addressContainer: {
        flex: 1,
    },
    addressTypeBadge: {
        fontSize: 11,
        fontWeight: "500",
        color: Colors.primary,
        marginBottom: 2,
    },
    addressText: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    landmarkText: {
        fontSize: 12,
        color: Colors.muted,
        marginTop: 2,
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
    },
});
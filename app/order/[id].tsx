import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  ZoomIn
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  light: "#E8E8E8",
};

const Typography: {
  title2: TextStyle;
  headline: TextStyle;
  subhead: TextStyle;
  caption: TextStyle;
  footnote: TextStyle;
} = {
  title2: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32,
  },
  headline: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  subhead: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
  footnote: {
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 15,
  },
};

const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

const Shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  }),
};

const STATUS_STEPS = [
  "Pending",
  "Accepted",
  "Packed",
  "Out For Delivery",
  "Delivered",
];

const STEP_META: Record<string, { icon: string; color: string }> = {
  Pending:          { icon: "time-outline",         color: Colors.warning },
  Accepted:         { icon: "checkmark-circle-outline", color: Colors.primary },
  Packed:           { icon: "cube-outline",          color: Colors.accent },
  "Out For Delivery": { icon: "bicycle-outline",    color: "#5856D6" },
  Delivered:        { icon: "bag-check-outline",    color: Colors.success },
};

function StepDot({
  step,
  index,
  currentStep,
  isCancelled,
}: {
  step: string;
  index: number;
  currentStep: number;
  isCancelled: boolean;
}) {
  const done = !isCancelled && index <= currentStep;
  const active = !isCancelled && index === currentStep;
  const meta = STEP_META[step];

  const scale = useSharedValue(0.8);
  useEffect(() => {
    scale.value = withDelay(index * 80, withSpring(1, { damping: 14, stiffness: 180 }));
  }, []);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={stepStyles.stepCol}>
      <Animated.View style={dotStyle}>
        {done ? (
          <LinearGradient
            colors={active ? [Colors.primary, Colors.accent] : [Colors.success, "#2FB75A"]}
            style={[stepStyles.dot, active && stepStyles.dotActive]}
          >
            <Ionicons
              name={active ? (meta.icon as any) : "checkmark"}
              size={active ? 16 : 14}
              color="#fff"
            />
          </LinearGradient>
        ) : (
          <View style={stepStyles.dotEmpty}>
            <Ionicons name={meta.icon as any} size={14} color={Colors.muted} />
          </View>
        )}
      </Animated.View>

      <Text
        style={[
          stepStyles.stepLabel,
          done && { color: active ? Colors.primary : Colors.success, fontWeight: "600" },
        ]}
        numberOfLines={2}
      >
        {step}
      </Text>
    </View>
  );
}

function InfoCard({
  icon,
  iconColor,
  label,
  children,
  delay = 0,
}: {
  icon: string;
  iconColor: string;
  label: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(18)} style={cardStyles.card}>
      <View style={cardStyles.cardHeader}>
        <View style={[cardStyles.iconBg, { backgroundColor: iconColor + "15" }]}>
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <Text style={cardStyles.cardLabel}>{label}</Text>
      </View>
      <View style={cardStyles.cardBody}>{children}</View>
    </Animated.View>
  );
}

export default function OrderDetails() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [showPinModal, setShowPinModal]=useState(false);
  const[enteredPin, setEnteredPin]=useState("");
  const[verifyingPin, setVerifyingPin]=useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!id) {
      console.log("No order ID provided");
      return;
    }

    const orderRef = doc(db, "orders", id as string);

    const unsub = onSnapshot(
      orderRef,
      (snap) => {
        if (snap.exists()) {
          setOrder({
            id: snap.id,
            ...snap.data(),
          });
        } else {
          console.log("Order does not exist:", id);
          setOrder(null);
        }
      },
      (error) => {
        console.error("ORDER DETAIL ERROR:", error);
        Alert.alert(
          "Error",
          "Unable to load this order."
        );
      }
    );

    return () => unsub();
  }, [id]);

  const navigateToCustomer = async () => {
    const latitude = order?.address?.latitude;
    const longitude = order?.address?.longitude;

    if (latitude == null || longitude == null) {
      Alert.alert(
        "Location unavailable",
        "This order doesn't contain customer coordinates."
      );
      return;
    }

    try {
      const appUrl = `google.navigation:q=${latitude},${longitude}`;
      const supported = await Linking.canOpenURL(appUrl);

      if (supported) {
        await Linking.openURL(appUrl);
      } else {
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      Alert.alert("Error", "Unable to open navigation.");
    }
  };

  const updateStatus = async (status: string) => {
    if (!order) return;
    if (order.status === "Cancelled") {
      Alert.alert("Order Cancelled", "This order has been cancelled and cannot be updated.");
      return;
    }
    if(order.status==="Delivered"){
      Alert.alert("Order Completed","This order has already been delivered.");
      return;
    }
    try {
      if(status==="Delivered"){
        setShowPinModal(true);
        return;
      }

      await updateDoc(doc(db, "orders", id as string), { status });

      if (status === "Out For Delivery") {
        await navigateToCustomer();
      }

      Alert.alert("Updated", `Order marked as ${status}`);
    } catch (e) {
      console.log(e);
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const verifyDeliveryPin = async () => {
  if (enteredPin.length !== 4) {
    Alert.alert(
      "Invalid PIN",
      "Please enter the 4-digit delivery PIN"
    );
    return;
  }

  setVerifyingPin(true);

  try {
    if (enteredPin !== order.delivery?.pin) {
      Alert.alert(
        "Incorrect PIN",
        "The delivery PIN entered is incorrect"
      );
      return;
    }

    await updateDoc(doc(db, "orders", id as string), {
      status: "Delivered",
      "delivery.verified": true,
      "delivery.verifiedAt": new Date(),
    });

    setShowPinModal(false);
    setEnteredPin("");

    Alert.alert(
      "Delivery Complete",
      "Order has been marked as delivered"
    );
  } catch (e) {
    console.log(e);
    Alert.alert(
      "Error",
      "Unable to verify delivery PIN."
    );
  } finally {
    setVerifyingPin(false);
  }
};
  if (!order) {
    return (
      <View style={styles.loadingContainer}>
        <Animated.View entering={ZoomIn.springify()} style={styles.loadingInner}>
          <View style={styles.loadingCircle}>
            <Ionicons name="receipt-outline" size={32} color={Colors.muted} />
          </View>
          <Text style={styles.loadingText}>Loading order…</Text>
        </Animated.View>
      </View>
    );
  }

  const isCancelled = order.status === "Cancelled";
  const isDelivered = order.status === "Delivered";
  const currentStep = isCancelled
    ? -1
    : STATUS_STEPS.indexOf(order.status || "Pending");
  const nextStatus =
    !isCancelled && currentStep < STATUS_STEPS.length - 1
      ? STATUS_STEPS[currentStep + 1]
      : null;

  const progressPct = isCancelled
    ? 0
    : ((currentStep + 1) / STATUS_STEPS.length) * 100;

  const statusColor = isCancelled
    ? Colors.danger
    : isDelivered
    ? Colors.success
    : Colors.primary;

  const orderDate = order.invoice?.issuedAt ?? order.createdAt;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View entering={FadeInDown.delay(40).springify()} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Order Details</Text>
          <Text style={styles.orderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
        </View>
        
        <View style={styles.headerRight}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + "15", borderColor: statusColor + "40" }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusPillText, { color: statusColor }]}>{order.status}</Text>
          </View>

          <View
            style={[
              styles.paymentBadge,
              order.payment?.method === "QR Payment"
                ? styles.qrPaymentBadge
                : styles.codPaymentBadge,
            ]}
          >
            <Ionicons
              name={
                order.payment?.method === "QR Payment"
                  ? "qr-code-outline"
                  : "cash-outline"
              }
              size={12}
              color={
                order.payment?.method === "QR Payment"
                  ? "#5856D6"
                  : "#34C759"
              }
            />
            <Text
              style={[
                styles.paymentBadgeText,
                {
                  color:
                    order.payment?.method === "QR Payment"
                      ? "#5856D6"
                      : "#34C759",
                },
              ]}
            >
              {order.payment?.method === "QR Payment"
                ? "QR Payment"
                : "Cash on Delivery"}
            </Text>
          </View>
        </View>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.delay(100).springify().damping(18)} style={styles.stepperCard}>
          <View style={styles.stepperHeader}>
            <Text style={styles.stepperTitle}>
              {isCancelled ? "Order Cancelled" : isDelivered ? "Order Delivered ✓" : "Order in Progress"}
            </Text>
            {!isCancelled && (
              <Text style={styles.stepperStep}>
                Step {currentStep + 1}/{STATUS_STEPS.length}
              </Text>
            )}
          </View>

          <View style={styles.progressTrack}>
            <Animated.View
              entering={FadeInUp.delay(200).duration(600)}
              style={[
                styles.progressFill,
                { width: `${progressPct}%`, backgroundColor: isCancelled ? Colors.danger : Colors.success },
              ]}
            />
          </View>

          <View style={styles.stepsRow}>
            {STATUS_STEPS.map((step, i) => (
              <StepDot
                key={step}
                step={step}
                index={i}
                currentStep={currentStep}
                isCancelled={isCancelled}
              />
            ))}
          </View>

          {isCancelled ? (
            <Animated.View entering={ZoomIn.delay(300).springify()} style={styles.cancelledBanner}>
              <Ionicons name="close-circle" size={18} color={Colors.danger} style={{ marginRight: 8 }} />
              <Text style={styles.cancelledText}>This order was cancelled</Text>
            </Animated.View>
          ) : isDelivered ? (
            <Animated.View entering={ZoomIn.delay(300).springify()} style={styles.deliveredBanner}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} style={{ marginRight: 8 }} />
              <Text style={styles.deliveredText}>Order delivered successfully</Text>
            </Animated.View>
          ) : nextStatus ? (
            <Animated.View entering={FadeInUp.delay(350).springify()}>
              <TouchableOpacity
                style={styles.nextStatusBtn}
                onPress={() => updateStatus(nextStatus)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.nextStatusGrad}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.nextStatusText}>Mark as {nextStatus}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ) : null}
        </Animated.View>

        {order.status==="Out For Delivery" && (
          <TouchableOpacity style={styles.printBtn}
          onPress={navigateToCustomer}>
            <LinearGradient colors={["#34C759","#2FB75A"]}
            style={styles.printBtnGradient}>
              <Ionicons name="navigate-outline" size={20} color="#FFF"/>
              <Text style={styles.printBtnText}>
                Navigate to Customer
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <InfoCard icon="receipt-outline" iconColor={Colors.primary} label="Order Info" delay={160}>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Order ID</Text>
            <Text style={styles.infoValue} selectable>#{order.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Placed on</Text>
            <Text style={styles.infoValue}>
              {orderDate?.toDate
                ? orderDate.toDate().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                : "Just now"}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoKey}>Time</Text>
            <Text style={styles.infoValue}>
              {orderDate?.toDate
                ? orderDate.toDate().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                : "–"}
            </Text>
          </View>
        </InfoCard>

        <InfoCard icon="person-outline" iconColor={Colors.accent} label="Customer" delay={210}>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Name</Text>
            <Text style={styles.infoValue}>{order.customerName || "N/A"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Email</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{order.customerEmail || "N/A"}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoKey}>Phone</Text>
            <Text style={styles.infoValue}>{order.customerPhone || order.address?.phone || "N/A"}</Text>
          </View>
        </InfoCard>

        <InfoCard icon="location-outline" iconColor={Colors.success} label="Delivery Address" delay={260}>
          <View style={styles.addressBlock}>
            <Text style={styles.addressType}>{order.address?.type || "Home"}</Text>
            <Text style={styles.addressLine}>{order.address?.address || "No address provided"}</Text>
            {order.address?.landmark ? (
              <Text style={styles.addressMuted}>Near {order.address.landmark}</Text>
            ) : null}
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={13} color={Colors.muted} />
              <Text style={styles.addressMuted}> {order.address?.phone || "No phone"}</Text>
            </View>
          </View>
        </InfoCard>

        <InfoCard icon="bag-outline" iconColor={Colors.warning} label={`Items (${order.items?.length ?? 0})`} delay={310}>
          {order.items?.map((item: any, i: number) => (
            <View
              key={i}
              style={[styles.itemRow, i === order.items.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={styles.itemLeft}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{item.unitPrice * item.quantity}</Text>
            </View>
          ))}
        </InfoCard>

        <InfoCard icon="wallet-outline" iconColor={Colors.primary} label="Bill Summary" delay={360}>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Subtotal</Text>
            <Text style={styles.infoValue}>₹{order.pricing?.subtotal ?? order.total}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Delivery</Text>
            <Text style={[styles.infoValue, { color: (order.pricing?.deliveryCharge ?? 0) === 0 ? Colors.success : Colors.textPrimary }]}>
              {(order.pricing?.deliveryCharge ?? 0) === 0
                ? "FREE"
                : `₹${order.pricing.deliveryCharge}`}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.infoKey, { fontSize: 16, fontWeight: "600", color: Colors.textPrimary }]}>Total</Text>
            <Text style={styles.totalAmount}>₹{order.pricing?.grandTotal ?? order.total}</Text>
          </View>
        </InfoCard>

        <Animated.View entering={FadeInUp.delay(420)}>
          <TouchableOpacity style={styles.printBtn} onPress={()=> router.push({ pathname:"/printOrder", params:{id:order.id,},})}>
            <LinearGradient colors={[Colors.primary,Colors.accent]}
            style={styles.printBtnGradient}>
              <Ionicons name="print-outline" size={20} color="#FFF"/>
              <Text style={styles.printBtnText}>
                  Print Invoice
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
        <View style={{ height: 40 }} />
      </ScrollView>

     <Modal
  visible={showPinModal}
  transparent
  animationType="slide"
  onRequestClose={() => setShowPinModal(false)}
>
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-end",
      }}
    >
      <View
        style={{
          backgroundColor: "#fff",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          padding: 24,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        {/* Drag Handle */}
        <View
          style={{
            alignSelf: "center",
            width: 45,
            height: 5,
            borderRadius: 5,
            backgroundColor: "#DDD",
            marginBottom: 20,
          }}
        />

        {/* Title */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Verify Delivery
        </Text>

        {/* Description */}
        <Text
          style={{
            marginTop: 8,
            textAlign: "center",
            color: "#666",
            lineHeight: 22,
          }}
        >
          Ask the customer for their 4-digit delivery PIN.
        </Text>

        {/* PIN Input */}
        <TextInput
          value={enteredPin}
          onChangeText={setEnteredPin}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="----"
          autoFocus
          returnKeyType="done"
          style={{
            marginTop: 28,
            borderWidth: 1,
            borderColor: "#DDD",
            borderRadius: 16,
            height: 60,
            textAlign: "center",
            fontSize: 28,
            letterSpacing: 14,
            fontWeight: "700",
          }}
        />

        {/* Verify Button */}
        <TouchableOpacity
          style={{
            marginTop: 24,
            borderRadius: 18,
            overflow: "hidden",
          }}
          onPress={verifyDeliveryPin}
          disabled={verifyingPin}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.primary, Colors.accent]}
            style={{
              height: 56,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {verifyingPin ? (
              <Text
                style={{
                  color: "#FFF",
                  fontWeight: "600",
                }}
              >
                Verifying...
              </Text>
            ) : (
              <Text
                style={{
                  color: "#FFF",
                  fontSize: 16,
                  fontWeight: "700",
                }}
              >
                Verify & Complete Delivery
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>
    </View>
  );
}

type MainStyles = {
  container: ViewStyle;
  loadingContainer: ViewStyle;
  loadingInner: ViewStyle;
  loadingCircle: ViewStyle;
  loadingText: TextStyle;
  header: ViewStyle;
  headerCenter: ViewStyle;
  headerRight: ViewStyle;
  backBtn: ViewStyle;
  title: TextStyle;
  orderId: TextStyle;
  statusPill: ViewStyle;
  statusDot: ViewStyle;
  statusPillText: TextStyle;
  scroll: ViewStyle;
  stepperCard: ViewStyle;
  stepperHeader: ViewStyle;
  stepperTitle: TextStyle;
  stepperStep: TextStyle;
  progressTrack: ViewStyle;
  progressFill: ViewStyle;
  stepsRow: ViewStyle;
  cancelledBanner: ViewStyle;
  cancelledText: TextStyle;
  deliveredBanner: ViewStyle;
  deliveredText: TextStyle;
  nextStatusBtn: ViewStyle;
  nextStatusGrad: ViewStyle;
  nextStatusText: TextStyle;
  infoRow: ViewStyle;
  infoKey: TextStyle;
  infoValue: TextStyle;
  addressBlock: ViewStyle;
  addressType: TextStyle;
  addressLine: TextStyle;
  addressMuted: TextStyle;
  phoneRow: ViewStyle;
  itemRow: ViewStyle;
  itemLeft: ViewStyle;
  itemName: TextStyle;
  itemQty: TextStyle;
  itemPrice: TextStyle;
  divider: ViewStyle;
  totalAmount: TextStyle;
  supportCard: ViewStyle;
  supportHeader: ViewStyle;
  supportTitle: TextStyle;
  supportText: TextStyle;
  supportBtn: ViewStyle;
  supportBtnGrad: ViewStyle;
  supportBtnText: TextStyle;
  printBtn: ViewStyle;
  printBtnGradient: ViewStyle;
  printBtnText: TextStyle;
  paymentBadge: ViewStyle;
  qrPaymentBadge: ViewStyle;
  codPaymentBadge: ViewStyle;
  paymentBadgeText: TextStyle;
};

type StepStyles = {
  stepCol: ViewStyle;
  dot: ViewStyle;
  dotActive: ViewStyle;
  dotEmpty: ViewStyle;
  stepLabel: TextStyle;
};

type CardStyles = {
  card: ViewStyle;
  cardHeader: ViewStyle;
  iconBg: ViewStyle;
  cardLabel: TextStyle;
  cardBody: ViewStyle;
};

const styles = StyleSheet.create<MainStyles>({
  container: { 
    flex: 1, 
    backgroundColor: Colors.background 
  },

  printBtn: {
    borderRadius: Radius.xl,
    overflow: "hidden",
    marginTop: 1,
    marginBottom: 6,
    ...Shadow.colored(Colors.primary),
  },

  printBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },

  printBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "600",
  },

  loadingContainer: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: Colors.background 
  },
  
  loadingInner: { 
    alignItems: "center", 
    gap: 12 
  },
  
  loadingCircle: { 
    width: 72, 
    height: 72, 
    borderRadius: 36, 
    backgroundColor: Colors.surface, 
    justifyContent: "center", 
    alignItems: "center", 
    ...Shadow.sm 
  },
  
  loadingText: { 
    ...Typography.subhead, 
    color: Colors.muted 
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
  },

  headerCenter: {
    flex: 1,
    marginRight: 8,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  
  backBtn: {
    width: 40, 
    height: 40, 
    borderRadius: 12,
    backgroundColor: Colors.surface,
    justifyContent: "center", 
    alignItems: "center",
  },
  
  title: { 
    ...Typography.title2, 
    color: Colors.textPrimary,
    fontSize: 18,
  },
  
  orderId: { 
    ...Typography.caption, 
    color: Colors.muted, 
    marginTop: 2 
  },
  
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    gap: 5,
  },
  
  statusDot: { 
    width: 6, 
    height: 6, 
    borderRadius: 3 
  },
  
  statusPillText: { 
    fontSize: 10, 
    fontWeight: "600" 
  },

  scroll: { 
    paddingHorizontal: Spacing.lg, 
    paddingBottom: 40,
    paddingTop: Spacing.md,
  },

  stepperCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadow.md,
  },
  
  stepperHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  
  stepperTitle: { 
    ...Typography.headline, 
    color: Colors.textPrimary 
  },
  
  stepperStep: { 
    ...Typography.caption, 
    color: Colors.muted, 
    fontWeight: "500" 
  },

  progressTrack: {
    height: 8,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  
  progressFill: {
    height: "100%",
    borderRadius: Radius.full,
  },

  stepsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },

  cancelledBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.danger + "15",
    borderRadius: Radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.danger + "30",
  },
  
  cancelledText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: Colors.danger 
  },

  deliveredBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.success + "15",
    borderRadius: Radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.success + "30",
  },
  
  deliveredText: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: Colors.success 
  },

  nextStatusBtn: { 
    borderRadius: Radius.xl, 
    overflow: "hidden", 
    ...Shadow.colored(Colors.primary) 
  },
  
  nextStatusGrad: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    paddingVertical: 14 
  },
  
  nextStatusText: { 
    color: "#fff", 
    fontSize: 15, 
    fontWeight: "600" 
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  
  infoKey: { 
    ...Typography.subhead, 
    color: Colors.muted 
  },
  
  infoValue: { 
    ...Typography.subhead, 
    fontWeight: "500", 
    color: Colors.textPrimary, 
    maxWidth: "60%", 
    textAlign: "right" 
  },

  addressBlock: { 
    paddingVertical: 4 
  },
  
  addressType: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: Colors.textPrimary, 
    marginBottom: 4 
  },
  
  addressLine: { 
    ...Typography.subhead, 
    color: Colors.textSecondary, 
    marginBottom: 3 
  },
  
  addressMuted: { 
    ...Typography.footnote, 
    color: Colors.muted, 
    marginBottom: 3 
  },
  
  phoneRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    marginTop: 3 
  },

  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separator,
  },
  
  itemLeft: { 
    flex: 1 
  },
  
  itemName: { 
    ...Typography.subhead, 
    fontWeight: "600", 
    color: Colors.textPrimary, 
    marginBottom: 3 
  },
  
  itemQty: { 
    ...Typography.caption, 
    color: Colors.muted 
  },
  
  itemPrice: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: Colors.textPrimary 
  },

  divider: { 
    height: StyleSheet.hairlineWidth, 
    backgroundColor: Colors.separator, 
    marginVertical: 6 
  },
  
  totalAmount: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: Colors.primary 
  },

  supportCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    ...Shadow.sm,
    alignItems: "center",
  },
  
  supportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  
  supportTitle: {
    ...Typography.headline,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  
  supportText: {
    ...Typography.caption,
    color: Colors.muted,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  
  supportBtn: {
    borderRadius: Radius.lg,
    overflow: "hidden",
    width: "100%",
  },
  
  supportBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  
  supportBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },

  paymentBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },

  qrPaymentBadge: {
    backgroundColor: "#5856D615",
  },

  codPaymentBadge: {
    backgroundColor: "#34C75915",
  },

  paymentBadgeText: {
    fontSize: 9,
    fontWeight: "600",
  },
});

const stepStyles = StyleSheet.create<StepStyles>({
  stepCol: { 
    alignItems: "center", 
    flex: 1, 
    gap: 6 
  },
  
  dot: {
    width: 36, 
    height: 36, 
    borderRadius: 18,
    justifyContent: "center", 
    alignItems: "center",
    ...Shadow.sm,
  },
  
  dotActive: { 
    ...Shadow.colored(Colors.primary) 
  },
  
  dotEmpty: {
    width: 36, 
    height: 36, 
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 1.5, 
    borderColor: Colors.separator,
  },
  
  stepLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.muted,
    textAlign: "center",
    maxWidth: 65,
    lineHeight: 13,
  },
});

const cardStyles = StyleSheet.create<CardStyles>({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadow.sm,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: 10,
  },
  
  iconBg: {
    width: 36, 
    height: 36, 
    borderRadius: 10,
    justifyContent: "center", 
    alignItems: "center",
  },
  
  cardLabel: {
    ...Typography.headline,
    color: Colors.textPrimary,
  },
  cardBody: {},
});
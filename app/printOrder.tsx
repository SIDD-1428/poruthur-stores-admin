import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useLocalSearchParams } from "expo-router";
import * as Sharing from "expo-sharing";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { db } from "../firebase/config";
import { generateInvoiceHtml } from "../utils/invoiceTemplate";

export default function PrintOrder() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [sharing,setSharing]=useState(false);
  useEffect(() => {
    console.log("Received ID:", id);

    if (!id) return;

    const unsub = onSnapshot(
      doc(db, "orders", id as string),
      (snap) => {
        console.log("Document exists:", snap.exists());

        if (snap.exists()) {
          const data = {
            id: snap.id,
            ...snap.data(),
          };

          console.log("Loaded:", data);
          setOrder(data);
        }
      }
    );

    return () => unsub();
  }, [id]);

  // Loading UI
  if (order === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#fff",
        }}
      >
        <Text>Loading Invoice...</Text>
      </View>
    );
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp?.seconds) return "";
    return new Date(timestamp.seconds * 1000).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const generatePdf = async () => {
    const { uri } = await Print.printToFileAsync({
      html: generateInvoiceHtml(order),
    });
    return uri;
  };

  const shareInvoice = async () => {
  if (sharing) return;

  try {
    setSharing(true);

    const uri = await generatePdf();

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Invoice",
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    setSharing(false);
  }
};

  const printInvoice = async () => {
    await Print.printAsync({
      html: generateInvoiceHtml(order),
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <View style={styles.card}>
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="storefront" size={20} color="#FFF" />
            </View>
            <View style={styles.logoTextContainer}>
              <Text style={styles.storeName} numberOfLines={1}>
                PORUTHUR STORES
              </Text>
              <Text style={styles.tagline} numberOfLines={1}>
                Fresh Groceries Delivered
              </Text>
            </View>
          </View>

          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={printInvoice} style={styles.iconButton}>
              <Ionicons name="print-outline" size={20} color="#1B5E20" />
            </TouchableOpacity>

            <TouchableOpacity onPress={shareInvoice} disabled={sharing}
            style={styles.iconButton}>
              <Ionicons name="share-social-outline" size={20} color="#1B5E20" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ================= STORE DETAILS ================= */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.footerText}>Abbigere, Bengaluru</Text>
          <Text style={styles.footerText}>GSTIN : 29XXXXXXXXXXXXX</Text>
          <Text style={styles.footerText}>+91 90358 13611</Text>
        </View>

        <View style={styles.divider} />

        {/* ================= INVOICE INFO ================= */}
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Invoice No.</Text>
          <Text style={styles.summaryValue}>
            {order.invoice?.number ?? `PSINV-${order.id.slice(0, 8).toUpperCase()}`}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Order ID</Text>
          <Text style={styles.summaryValue}>{order.id.slice(0, 12).toUpperCase()}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Issued On</Text>
          <Text style={styles.summaryValue}>
            {formatDate(order.invoice?.issuedAt ?? order.createdAt)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Status</Text>
          <View
            style={[
              styles.statusBadge,
              order.status === "Delivered"
                ? styles.statusDelivered
                : order.status === "Cancelled"
                ? styles.statusCancelled
                : styles.statusPending,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                order.status === "Delivered"
                  ? styles.statusTextDelivered
                  : order.status === "Cancelled"
                  ? styles.statusTextCancelled
                  : styles.statusTextPending,
              ]}
            >
              {order.status}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ================= CUSTOMER ================= */}
        <Text style={styles.sectionTitle}>CUSTOMER</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Name</Text>
          <Text style={styles.summaryValue}>{order.customerName}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Email</Text>
          <Text style={styles.summaryValue}>{order.customerEmail}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Phone</Text>
          <Text style={styles.summaryValue}>{order.address?.phone}</Text>
        </View>

        <View style={styles.divider} />

        {/* ================= DELIVERY ADDRESS ================= */}
        <Text style={styles.sectionTitle}>DELIVERY ADDRESS</Text>

        <Text style={styles.addressType}>{order.address?.type}</Text>
        <Text style={styles.addressLine}>{order.address?.address}</Text>

        {order.address?.landmark ? (
          <Text style={styles.addressLandmark}>Landmark : {order.address.landmark}</Text>
        ) : null}

        <Text style={styles.addressPincode}>PIN : {order.address?.pincode}</Text>

        <View style={styles.divider} />

        {/* ================= ITEMS ================= */}
        <Text style={styles.sectionTitle}>ORDER ITEMS</Text>

        <View style={styles.tableHeader}>
          <Text style={[styles.colName, styles.headerText]}>Item</Text>
          <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
          <Text style={[styles.colPrice, styles.headerText]}>Unit</Text>
          <Text style={[styles.colTotal, styles.headerText]}>Amount</Text>
        </View>

        {order.items?.map((item: any) => (
          <View key={item.productId} style={styles.tableRow}>
            <Text numberOfLines={1} style={styles.colName}>
              {item.name}
            </Text>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colPrice}>₹{item.unitPrice ?? item.price}</Text>
            <Text style={styles.colTotal}>₹{item.totalPrice ?? item.price * item.quantity}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* ================= BILL SUMMARY ================= */}
        <Text style={styles.sectionTitle}>BILL SUMMARY</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Items ({order.items.length})</Text>
          <Text style={styles.summaryValue}>₹{order.pricing?.subtotal ?? order.total}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery</Text>
          <Text
            style={[
              styles.summaryValue,
              {
                color: order.pricing?.deliveryCharge === 0 ? "#4CAF50" : "#333",
              },
            ]}
          >
            {order.pricing?.deliveryCharge === 0 ? "FREE" : `₹${order.pricing?.deliveryCharge}`}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>GST</Text>
          <Text style={styles.summaryValue}>₹{order.pricing?.tax ?? 0}</Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>GRAND TOTAL</Text>
          <Text style={styles.totalAmount}>₹{order.pricing?.grandTotal ?? order.total}</Text>
        </View>

        <View style={styles.divider} />

        {/* ================= PAYMENT ================= */}
        <Text style={styles.sectionTitle}>PAYMENT</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Payment Method</Text>
          <Text style={styles.summaryValue}>{order.payment?.method ?? "Cash on Delivery"}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Status</Text>
          <Text style={styles.summaryValue}>{order.payment?.status ?? "Pending"}</Text>
        </View>

        {/* ================= FOOTER ================= */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>
            Thank you for shopping with Poruthur Stores
          </Text>
          <Text style={styles.footerSmall}>
            This is a computer generated invoice and does not require a signature.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1B5E20",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  logoTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  storeName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1B5E20",
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 9,
    color: "#666",
    letterSpacing: 0.2,
    marginTop: 1,
  },

  // ── Header Buttons ──
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  divider: {
    height: 1,
    backgroundColor: "#E5E5E5",
    marginVertical: 12,
  },

  // ── Status Badge ──
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: "#FFF3E0",
  },
  statusDelivered: {
    backgroundColor: "#E8F5E9",
  },
  statusCancelled: {
    backgroundColor: "#FFEBEE",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextPending: {
    color: "#FF9800",
  },
  statusTextDelivered: {
    color: "#4CAF50",
  },
  statusTextCancelled: {
    color: "#F44336",
  },

  // ── Section ──
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 1,
    marginBottom: 8,
  },

  // ── Address ──
  addressType: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1B5E20",
  },
  addressLine: {
    fontSize: 13,
    color: "#666",
  },
  addressLandmark: {
    fontSize: 12,
    color: "#999",
  },
  addressPincode: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },

  // ── Table ──
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#F8F8F8",
    borderBottomWidth: 2,
    borderBottomColor: "#1B5E20",
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#555",
    letterSpacing: 0.5,
  },
  colName: {
    flex: 3,
    fontSize: 13,
    fontWeight: "500",
    color: "#333",
  },
  colQty: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    color: "#555",
  },
  colPrice: {
    flex: 1.5,
    textAlign: "right",
    fontSize: 13,
    color: "#555",
  },
  colTotal: {
    flex: 1.5,
    textAlign: "right",
    fontWeight: "700",
    fontSize: 13,
    color: "#333",
  },

  // ── Summary ──
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#666",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#DDD",
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1B5E20",
  },

  // ── Footer ──
  footer: {
    marginTop: 16,
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: "#666",
  },
  footerBrand: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B5E20",
    textAlign: "center",
  },
  footerSmall: {
    fontSize: 9,
    color: "#BBB",
    textAlign: "center",
  },
});
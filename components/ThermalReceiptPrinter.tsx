import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getBondedDevices,
  isBluetoothEnabled,
  Printer,
} from "expo-bluetooth-thermal-printer";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as UPNG from "upng-js";
import { db } from "../firebase/config";
import {
  HEADER_TEXT_HEIGHT,
  HEADER_TEXT_HEX,
  HEADER_TEXT_WIDTH,
} from "./receiptHeaderBitmap";

const STORAGE_KEY = "bonmart.thermalPrinter.selected.v1";
const PAPER_WIDTH = "80mm";
const LINE_WIDTH = 48;
const PAPER_DOTS = 576; // printable width of an 80 mm printer, in dots
const QR_SIZE = 160; // QR width and height in dots (about 20 mm). Smaller is harder to scan.
const BAND_ROWS = 32; // image rows sent to the printer at a time

const waitMs = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

type PrinterDevice = {
  name?: string;
  address: string;
};

type Props = {
  order: any;
};

const money = (value: any) =>
  `Rs. ${Number(value ?? 0).toFixed(2)}`;

const wrapText = (value: string, width = LINE_WIDTH) => {
  const words = String(value ?? "").replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    if (!word) continue;
    if (word.length > width) {
      if (line) lines.push(line);
      line = "";
      for (let i = 0; i < word.length; i += width) {
        lines.push(word.slice(i, i + width));
      }
      continue;
    }
    if (!line) line = word;
    else if ((line + " " + word).length <= width) line += " " + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const tableRow = (item: string, unit: string, qty: string, amount: string) =>
  item.slice(0, 20).padEnd(20) +
  unit.slice(0, 6).padEnd(6) +
  qty.slice(0, 6).padEnd(6) +
  amount.slice(0, 16).padStart(16);

const hexToBytes = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
};

// Downloads the QR image and shrinks it to QR_SIZE x QR_SIZE.
// Returns one value per pixel: 1 = black, 0 = white.
const loadQrPixels = async (imageUrl: string) => {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Unable to download the payment QR image.");
  const buffer = await response.arrayBuffer();

  let decoded: any;
  try {
    decoded = UPNG.decode(buffer);
  } catch {
    throw new Error("The payment QR image must be a PNG file.");
  }

  const rgba = new Uint8Array(UPNG.toRGBA8(decoded)[0]);
  const sourceWidth = decoded.width as number;
  const sourceHeight = decoded.height as number;
  const scale = QR_SIZE / Math.max(sourceWidth, sourceHeight);
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));
  const offsetX = Math.floor((QR_SIZE - targetWidth) / 2);
  const offsetY = Math.floor((QR_SIZE - targetHeight) / 2);
  const pixels = new Uint8Array(QR_SIZE * QR_SIZE);

  for (let y = 0; y < targetHeight; y++) {
    const startY = Math.floor((y * sourceHeight) / targetHeight);
    const endY = Math.max(startY + 1, Math.floor(((y + 1) * sourceHeight) / targetHeight));
    for (let x = 0; x < targetWidth; x++) {
      const startX = Math.floor((x * sourceWidth) / targetWidth);
      const endX = Math.max(startX + 1, Math.floor(((x + 1) * sourceWidth) / targetWidth));

      // Average the source pixels that fall inside this one printed dot
      let total = 0;
      let count = 0;
      for (let sy = startY; sy < endY && sy < sourceHeight; sy++) {
        for (let sx = startX; sx < endX && sx < sourceWidth; sx++) {
          const offset = (sy * sourceWidth + sx) * 4;
          const alpha = rgba[offset + 3] / 255;
          const luminance =
            0.299 * rgba[offset] + 0.587 * rgba[offset + 1] + 0.114 * rgba[offset + 2];
          // Transparent pixels count as white paper
          total += luminance * alpha + 255 * (1 - alpha);
          count++;
        }
      }
      if (count > 0 && total / count < 140) {
        pixels[(y + offsetY) * QR_SIZE + (x + offsetX)] = 1;
      }
    }
  }
  return pixels;
};

// Prints the header as ONE image: shop text on the left, QR on the right.
// qrPixels can be null, then the right side is left empty.
const printHeaderBitmap = async (printer: any, qrPixels: Uint8Array | null) => {
  const textBytes = hexToBytes(HEADER_TEXT_HEX);
  const textBytesPerRow = HEADER_TEXT_WIDTH / 8;
  const headerHeight = Math.max(HEADER_TEXT_HEIGHT, QR_SIZE);
  const textOffsetY = Math.floor((headerHeight - HEADER_TEXT_HEIGHT) / 2);
  const qrOffsetY = Math.floor((headerHeight - QR_SIZE) / 2);
  const qrOffsetX = PAPER_DOTS - QR_SIZE;
  const bytesPerRow = PAPER_DOTS / 8;
  const raster = new Uint8Array(bytesPerRow * headerHeight);

  const setDot = (x: number, y: number) => {
    raster[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
  };

  // Shop text on the left
  for (let y = 0; y < HEADER_TEXT_HEIGHT; y++) {
    for (let x = 0; x < HEADER_TEXT_WIDTH; x++) {
      const isBlack = textBytes[y * textBytesPerRow + (x >> 3)] & (0x80 >> (x & 7));
      if (isBlack) setDot(x, y + textOffsetY);
    }
  }

  // QR on the right
  if (qrPixels) {
    for (let y = 0; y < QR_SIZE; y++) {
      for (let x = 0; x < QR_SIZE; x++) {
        if (qrPixels[y * QR_SIZE + x]) setDot(x + qrOffsetX, y + qrOffsetY);
      }
    }
  }

  // Send the image in small bands so the printer buffer is never flooded
  for (let startRow = 0; startRow < headerHeight; startRow += BAND_ROWS) {
    const rows = Math.min(BAND_ROWS, headerHeight - startRow);
    const band = raster.slice(startRow * bytesPerRow, (startRow + rows) * bytesPerRow);
    const command = new Uint8Array(8 + band.length);
    command.set(
      [
        0x1d, 0x76, 0x30, 0x00,
        bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
        rows & 0xff, (rows >> 8) & 0xff,
      ],
      0
    );
    command.set(band, 8);
    await printer.raw(command);
    await waitMs(30);
  }
};

const twoColumnLine = (left: string, right: string) => {
  const safeRight = String(right).slice(0, 16);
  const leftWidth = Math.max(1, LINE_WIDTH - safeRight.length);
  return String(left).slice(0, leftWidth).padEnd(leftWidth) + safeRight;
};

const formatOrderDate = (timestamp: any) => {
  const date = timestamp?.toDate
    ? timestamp.toDate()
    : timestamp?.seconds
      ? new Date(timestamp.seconds * 1000)
      : timestamp instanceof Date
        ? timestamp
        : new Date();
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

async function requestBluetoothPermissions() {
  if (Platform.OS !== "android" || Number(Platform.Version) < 31) return true;

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
  ]);

  return Object.values(result).every(
    (status) => status === PermissionsAndroid.RESULTS.GRANTED
  );
}

export default function ThermalReceiptPrinter({ order }: Props) {
  const [selected, setSelected] = useState<PrinterDevice | null>(null);
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!mounted || !raw) return;
        try {
          setSelected(JSON.parse(raw));
        } catch {
          AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
        }
      })
      .catch((error) => console.warn("Unable to load saved printer", error));
    return () => {
      mounted = false;
    };
  }, []);

  const loadPairedPrinters = async () => {
    if (Platform.OS !== "android") {
      Alert.alert(
        "Android required",
        "Direct Bluetooth Classic ESC/POS printing is currently supported on Android only."
      );
      return;
    }

    setLoadingDevices(true);
    try {
      const granted = await requestBluetoothPermissions();
      if (!granted) {
        Alert.alert(
          "Bluetooth permission required",
          "Allow Nearby devices access so BonMart Admin can list paired printers."
        );
        return;
      }

      if (!isBluetoothEnabled()) {
        Alert.alert(
          "Bluetooth is off",
          "Turn on Bluetooth, then try again."
        );
        return;
      }

      const paired = (getBondedDevices() || []) as PrinterDevice[];
      setDevices(paired);
      setModalVisible(true);
      if (paired.length === 0) {
        Alert.alert(
          "No paired printers",
          "Pair the Helett BillQuick Neo in your phone's Bluetooth settings first, then tap Refresh."
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Unable to find printers",
        error?.message || "Check Bluetooth and Nearby devices permission."
      );
    } finally {
      setLoadingDevices(false);
    }
  };

  const choosePrinter = async (device: PrinterDevice) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(device));
      setSelected(device);
      setModalVisible(false);
    } catch {
      Alert.alert("Couldn't save printer", "Please try selecting the printer again.");
    }
  };

  const deselectPrinter = () => {
    Alert.alert(
      "Deselect printer?",
      "BonMart will no longer remember this printer for future orders.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deselect",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.removeItem(STORAGE_KEY);
            setSelected(null);
          },
        },
      ]
    );
  };

  const printReceipt = async () => {
    if (!selected || printing) return;
    if (Platform.OS !== "android") {
      Alert.alert("Not supported", "Thermal Bluetooth printing is available on Android.");
      return;
    }

    setPrinting(true);
    let printer: any;
    try {
      const granted = await requestBluetoothPermissions();
      if (!granted) throw new Error("Bluetooth permission was not granted.");
      if (!isBluetoothEnabled()) throw new Error("Turn on Bluetooth and try again.");

      printer = new Printer(PAPER_WIDTH);
      await printer.connect(selected.address);
      await printer.initialize();

      const invoiceNumber =
        order.invoice?.number ?? `PSINV-${String(order.id).slice(0, 8).toUpperCase()}`;
      const orderDate = formatOrderDate(order.invoice?.issuedAt ?? order.createdAt);
      const items = Array.isArray(order.items) ? order.items : [];

      // Fetch units from the products collection using each order item's productId.
// Fetch each unique product only once.
const productIds: string[] = Array.from(
  new Set<string>(
    items
      .map((item: any): string => String(item.productId ?? "").trim())
      .filter((id: string) => id.length > 0)
  )
);

const productUnitEntries = await Promise.all(
  productIds.map(async (productId: string) => {
    try {
      const productSnapshot = await getDoc(doc(db, "products", productId));

      const unit = productSnapshot.exists()
        ? String(productSnapshot.data()?.unit ?? "").trim()
        : "";

      return [productId, unit] as const;
    } catch (error) {
      console.warn(`Unable to fetch unit for product ${productId}`, error);
      return [productId, ""] as const;
    }
  })
);

const productUnits = new Map<string, string>(productUnitEntries);


      const subtotal = order.pricing?.subtotal ?? order.total ?? 0;
      const delivery = order.pricing?.deliveryCharge ?? 0;
      const tax = order.pricing?.tax ?? 0;
      const total = order.pricing?.grandTotal ?? order.total ?? 0;
      const totalSavings = Number(order.pricing?.savings ?? items.reduce((sum: number, item: any) => sum + Number(item.savings ?? Math.max(0, Number(item.mrp ?? item.unitPrice ?? item.price ?? 0) - Number(item.unitPrice ?? item.price ?? 0)) * Number(item.quantity ?? 0)), 0));
      let paymentQrUrl = "";
      try {
        const paymentSettings = await getDoc(doc(db, "settings", "payment"));
        paymentQrUrl = paymentSettings.exists()
          ? String(paymentSettings.data()?.qrCodeUrl ?? "")
          : "";
      } catch (qrError) {
        console.warn("Unable to fetch store payment QR", qrError);
      }

      let qrPixels: Uint8Array | null = null;
      let qrFailed = false;
      if (paymentQrUrl) {
        try {
          qrPixels = await loadQrPixels(paymentQrUrl);
        } catch (qrError) {
          console.warn("Unable to load payment QR", qrError);
          qrFailed = true;
        }
      }

      await printer.alignLeft();
      await printHeaderBitmap(printer, qrPixels);
      if (qrFailed) await printer.println("[Payment QR unavailable]");
      await printer.separator("=");

      await printer.alignLeft();
      await printer.println(`Invoice: ${invoiceNumber}`);
      await printer.println(`Order: ${String(order.id).slice(0, 12).toUpperCase()}`);
      await printer.println(`Date: ${orderDate}`);
      await printer.println(`Status: ${order.status ?? "Pending"}`);
      await printer.separator("-");

      await printer.bold(true);
      await printer.println("CUSTOMER DETAILS");
      await printer.bold(false);
      await printer.println(String(order.customerName ?? "N/A"));
      if (order.address?.phone) await printer.println(`Phone: ${order.address.phone}`);
      if (order.address?.address) {
        for (const line of wrapText(String(order.address.address))) {
          await printer.println(line);
        }
      }
      if (order.address?.landmark) {
        for (const line of wrapText(`Near ${order.address.landmark}`)) {
          await printer.println(line);
        }
      }
      if (order.address?.pincode) await printer.println(`PIN: ${order.address.pincode}`);
      await printer.separator("-");

      await printer.bold(true);
      await printer.println("ORDER DETAILS");
      await printer.bold(false);
      await printer.println(tableRow("Item", "Unit", "Qty", "Amount"));
      await printer.separator("-");
      for (const item of items) {
  const quantity = Number(item.quantity ?? 0);
  const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
  const lineTotal = Number(item.totalPrice ?? unitPrice * quantity);
  const productId = String(item.productId ?? "").trim();

  // Prefer the unit saved in the order; otherwise use Firestore product data.
  const unit =
    String(item.unit ?? "").trim() ||
    productUnits.get(productId) ||
    "-";

  const itemLines = wrapText(String(item.name ?? "Item"), 20);

  await printer.println(
    tableRow(
      itemLines[0] ?? "Item",
      unit,
      String(quantity),
      money(lineTotal)
    )
  );
        for (const continuation of itemLines.slice(1)) {
          await printer.println(tableRow(continuation, "", "", ""));
        }
        await waitMs(60);
      }
      await printer.separator("-");

      await printer.println(twoColumnLine("Subtotal", money(subtotal)));
      await printer.println(
        twoColumnLine("Delivery", delivery === 0 ? "FREE" : money(delivery))
      );
      await printer.println(twoColumnLine("GST", money(tax)));
      await printer.separator("=");
      await printer.bold(true);
      await printer.setSize("doubleHeight");
      await printer.println("GRAND TOTAL");
      await printer.setSize("normal");
      await printer.println(money(total));
      await printer.bold(false);
      if (totalSavings > 0) {
        await printer.separator("-");
        await printer.bold(true);
        await printer.println(twoColumnLine("YOUR SAVINGS", money(totalSavings)));
        await printer.bold(false);
      }
      await printer.separator("-");

      await printer.bold(true);
      await printer.println("PAYMENT");
      await printer.bold(false);
      await printer.println(`Method: ${order.payment?.method ?? "Cash on Delivery"}`);
      await printer.println(`Status: ${order.payment?.status ?? "Pending"}`);
      await printer.feed(3);
      await printer.alignCenter();
      await printer.println("Thank you for shopping");
      await printer.println("with BonMart!");
      await printer.feed(4);
      await printer.cut();

      // Give the printer time to finish printing what is still in its buffer
      await waitMs(2000 + items.length * 150);

      Alert.alert("Print sent", "The thermal receipt has been sent to the printer.");
    } catch (error: any) {
      Alert.alert(
        "Printing failed",
        error?.message || "Couldn't connect to the selected printer. Check that it is on and not connected to another app."
      );
    } finally {
      try {
        printer?.disconnect();
      } catch {
        // Keep the saved printer selection even when a connection drops.
      }
      setPrinting(false);
    }
  };

  if (Platform.OS !== "android") return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="print-outline" size={20} color="#1B5E20" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Print Receipt</Text>
          <Text style={styles.subtitle}>
            {selected
              ? selected.name || "Saved Bluetooth printer"
              : "Connect an 80 mm Bluetooth printer"}
          </Text>
        </View>
        {selected ? (
          <View style={styles.savedBadge}>
            <Ionicons name="checkmark-circle" size={13} color="#18864B" />
            <Text style={styles.savedText}>Saved</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>Paper: 80 mm</Text>
        <Text style={styles.metaText}>ESC/POS · Bluetooth</Text>
      </View>

      {selected ? (
        <>
          <TouchableOpacity
            style={[styles.primaryButton, printing && styles.disabledButton]}
            onPress={printReceipt}
            disabled={printing}
            activeOpacity={0.85}
          >
            {printing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="print" size={18} color="#fff" />
            )}
            <Text style={styles.primaryButtonText}>
              {printing ? "Sending receipt..." : "Print Thermal Receipt"}
            </Text>
          </TouchableOpacity>
          <View style={styles.actions}>
            <TouchableOpacity onPress={loadPairedPrinters} disabled={loadingDevices}>
              <Text style={styles.linkText}>Change printer</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={deselectPrinter}>
              <Text style={styles.destructiveText}>Deselect</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={loadPairedPrinters}
          disabled={loadingDevices}
          activeOpacity={0.85}
        >
          {loadingDevices ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="bluetooth" size={18} color="#fff" />
          )}
          <Text style={styles.primaryButtonText}>
            {loadingDevices ? "Searching paired devices..." : "Select Bluetooth Printer"}
          </Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select printer</Text>
                <Text style={styles.modalSubtitle}>Choose a paired Bluetooth printer</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.deviceList}>
              {devices.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bluetooth-outline" size={34} color="#999" />
                  <Text style={styles.emptyTitle}>No paired printers found</Text>
                  <Text style={styles.emptyText}>
                    Pair the BillQuick Neo in Android Bluetooth settings, then refresh this list.
                  </Text>
                </View>
              ) : (
                devices.map((device) => (
                  <TouchableOpacity
                    key={device.address}
                    style={styles.deviceRow}
                    onPress={() => choosePrinter(device)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.deviceIcon}>
                      <Ionicons name="print-outline" size={21} color="#1B5E20" />
                    </View>
                    <View style={styles.deviceText}>
                      <Text style={styles.deviceName}>{device.name || "Bluetooth device"}</Text>
                      <Text style={styles.deviceAddress}>{device.address}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#999" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity style={styles.secondaryButton} onPress={loadPairedPrinters}>
              <Ionicons name="refresh" size={17} color="#1B5E20" />
              <Text style={styles.secondaryButtonText}>Refresh paired devices</Text>
            </TouchableOpacity>
            <Text style={styles.helperText}>
              New printers must first be paired in Android Settings → Bluetooth.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700", color: "#222" },
  subtitle: { fontSize: 12, color: "#777", marginTop: 3 },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },
  savedText: { fontSize: 11, fontWeight: "600", color: "#18864B" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, marginBottom: 12 },
  metaText: { fontSize: 11, color: "#777" },
  primaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#1B5E20",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 14,
  },
  disabledButton: { opacity: 0.65 },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", justifyContent: "space-between", marginTop: 13 },
  linkText: { color: "#1B5E20", fontSize: 12, fontWeight: "600" },
  destructiveText: { color: "#C62828", fontSize: 12, fontWeight: "600" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "78%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#222" },
  modalSubtitle: { fontSize: 12, color: "#777", marginTop: 3 },
  deviceList: { maxHeight: 360 },
  deviceRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "#EEE", gap: 12 },
  deviceIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#F2F7F2", alignItems: "center", justifyContent: "center" },
  deviceText: { flex: 1 },
  deviceName: { fontSize: 14, fontWeight: "600", color: "#222" },
  deviceAddress: { fontSize: 11, color: "#888", marginTop: 3 },
  emptyState: { alignItems: "center", paddingVertical: 30, gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#333" },
  emptyText: { fontSize: 12, color: "#777", textAlign: "center", lineHeight: 18 },
  secondaryButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, paddingVertical: 12, marginTop: 10, borderWidth: 1, borderColor: "#1B5E20", borderRadius: 10 },
  secondaryButtonText: { color: "#1B5E20", fontSize: 13, fontWeight: "600" },
  helperText: { textAlign: "center", color: "#999", fontSize: 10, marginTop: 10, lineHeight: 15 },
});

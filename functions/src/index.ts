import * as admin from "firebase-admin";

import {
  onDocumentCreated,
} from "firebase-functions/v2/firestore";

admin.initializeApp();

const db = admin.firestore();


async function sendExpoNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data: Record<string, string>
) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data,
    channelId: "orders",
  };

  const response = await fetch(
    "https://exp.host/--/api/v2/push/send",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    }
  );

  const result = await response.json();

  console.log(
    "Expo notification response:",
    JSON.stringify(result)
  );

  if (!response.ok) {
    throw new Error(
      `Expo Push Service returned ${response.status}`
    );
  }

  return result;
}

export const notifyAdminNewOrder = onDocumentCreated(
  {
    document: "orders/{orderId}",
    region: "asia-south1",
  },

  async (event) => {
    const orderId = event.params.orderId;
    const order = event.data?.data();

    if (!order) {
      console.log("No order data found.");
      return;
    }

    console.log(
      "New order received:",
      orderId
    );

    // GET ORDER DETAILS
    const amount = Number(
      order.total ??
      order.pricing?.grandTotal ??
      order.totalAmount ??
      order.grandTotal ??
      0
    );

    const paymentMethod =
      typeof order.payment === "object" &&
      order.payment !== null
        ? order.payment.method ?? "Unknown"
        : String(order.payment ?? "Unknown");

    // GET ADMIN DEVICES
    const adminsSnapshot =
      await db.collection("admins").get();

    if (adminsSnapshot.empty) {
      console.log("No admins found.");
      return;
    }

    const tokens: string[] = [];

    adminsSnapshot.forEach((adminDoc) => {
      const adminData = adminDoc.data();

      const token = adminData.expoPushToken;

      if (
        token &&
        typeof token === "string"
      ) {
        tokens.push(token);
      }
    });

    if (tokens.length === 0) {
      console.log(
        "No admin Expo Push Tokens found."
      );
      return;
    }

    console.log(
      `Sending notification to ${tokens.length} admin(s).`
    );

    // SEND NOTIFICATION
    for (const token of tokens) {
      try {
        await sendExpoNotification(
          token,

          "🛒 New Order Received",

          `₹${amount} • Payment: ${paymentMethod}`,

          {
            type: "new_order",
            orderId: orderId,
            amount: String(amount),
            paymentMethod: paymentMethod,
          }
        );

        console.log(
          "Expo notification request sent."
        );

      } catch (error) {
        console.error(
          "Failed to send Expo notification:",
          error
        );
      }
    }
  }
);
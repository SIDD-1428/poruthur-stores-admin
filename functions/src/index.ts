import { randomUUID } from "crypto";
import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import sharp from "sharp";

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

/**
 * Converts an uploaded product image into a WebP asset on the server.
 * The original upload is retained as a recoverable source.
 */
export const optimizeProductImage = onCall(
  { region: "asia-south1", memory: "1GiB", timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in as an admin to optimize images.");
    }

    const adminDoc = await db.collection("admins").doc(request.auth.uid).get();
    if (!adminDoc.exists) {
      throw new HttpsError("permission-denied", "Only authorized admins can optimize product images.");
    }


const storagePath = request.data?.storagePath;

// Validate the Storage path.
if (
  typeof storagePath !== "string" ||
  !/^Products\/[A-Za-z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(storagePath) ||
  storagePath.includes("..") ||
  /_(optimized|thumbnail)\.webp$/i.test(storagePath)
) {
  throw new HttpsError(
    "invalid-argument",
    "A valid original product image path is required."
  );
}

const bucket = admin.storage().bucket();
const sourceFile = bucket.file(storagePath);

const [sourceExists] = await sourceFile.exists();
if (!sourceExists) {
  throw new HttpsError(
    "not-found",
    "The uploaded source image was not found."
  );
}

// Check metadata before downloading the file.
const [sourceMetadata] = await sourceFile.getMetadata();
const maxImageBytes = 15 * 1024 * 1024;
const fileSize = Number(sourceMetadata.size);
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > maxImageBytes) {
  throw new HttpsError(
    "invalid-argument",
    "Image must be smaller than 15 MB."
  );
}

if (!allowedTypes.includes(sourceMetadata.contentType ?? "")) {
  throw new HttpsError(
    "invalid-argument",
    "Only JPEG, PNG, and WebP images are supported."
  );
}

// Download only after validating metadata.
const [sourceBuffer] = await sourceFile.download();

// Verify that the file contents are actually a supported image.
const imageMetadata = await sharp(sourceBuffer, { failOn: "error" }).metadata();
const width = imageMetadata.width ?? 0;
const height = imageMetadata.height ?? 0;
const maxPixels = 40_000_000;

if (!width || !height || width * height > maxPixels) {
  throw new HttpsError(
    "invalid-argument",
    "Image dimensions are too large."
  );
}

if (!imageMetadata.format || !["jpeg", "png", "webp"].includes(imageMetadata.format)) {
  throw new HttpsError(
    "invalid-argument",
    "The uploaded file is not a supported image."
  );
}

    const outputBase = storagePath.replace(/\.[^.]+$/, "");
    const imagePath = `${outputBase}_optimized.webp`;
    const thumbnailPath = `${outputBase}_thumbnail.webp`;
    const imageToken = randomUUID();
    const thumbnailToken = randomUUID();

    const optimizedBuffer = await sharp(sourceBuffer, { failOn: "error" })
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const thumbnailBuffer = await sharp(sourceBuffer, { failOn: "error" })
      .rotate()
      .resize({ width: 320, height: 320, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 76, effort: 4 })
      .toBuffer();

    await Promise.all([
      bucket.file(imagePath).save(optimizedBuffer, {
        resumable: false,
        metadata: {
          contentType: "image/webp",
          cacheControl: "public,max-age=31536000,immutable",
          metadata: { firebaseStorageDownloadTokens: imageToken },
        },
      }),
      bucket.file(thumbnailPath).save(thumbnailBuffer, {
        resumable: false,
        metadata: {
          contentType: "image/webp",
          cacheControl: "public,max-age=31536000,immutable",
          metadata: { firebaseStorageDownloadTokens: thumbnailToken },
        },
      }),
    ]);

    const encoded = (path: string) => encodeURIComponent(path);
    const baseUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/`;
    return {
      imageUrl: `${baseUrl}${encoded(imagePath)}?alt=media&token=${imageToken}`,
      thumbnailUrl: `${baseUrl}${encoded(thumbnailPath)}?alt=media&token=${thumbnailToken}`,
      imageBytes: optimizedBuffer.length,
      thumbnailBytes: thumbnailBuffer.length,
    };
  }
);

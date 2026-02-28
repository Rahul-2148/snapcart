let admin: any = null;
let messaging: any = null;

// Initialize Firebase Admin SDK (server-side only) - Optional
try {
  admin = require("firebase-admin");

  if (admin && !admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
      console.log("Firebase Admin initialized successfully");
      messaging = admin.messaging();
    } catch (error) {
      console.error("Firebase Admin initialization error:", error);
    }
  } else if (admin) {
    messaging = admin.messaging();
  }
} catch (error) {
  console.log("firebase-admin not installed (optional package)");
}

export { messaging };

// Send push notification to a single device
export const sendPushNotification = async (
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    if (!messaging) {
      console.log("Firebase messaging not initialized");
      return { success: false, error: "Firebase not configured" };
    }

    if (!fcmToken) {
      console.log("No FCM token provided");
      return { success: false, error: "No FCM token" };
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      token: fcmToken,
    };

    const response = await messaging.send(message);
    console.log("Push notification sent successfully:", response);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    return { success: false, error: error.message };
  }
};

// Send push notification to multiple devices
export const sendMulticastNotification = async (
  fcmTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{
  success: boolean;
  successCount?: number;
  failureCount?: number;
  error?: string;
}> => {
  try {
    if (!messaging) {
      console.log("Firebase messaging not initialized");
      return { success: false, error: "Firebase not configured" };
    }

    if (!fcmTokens || fcmTokens.length === 0) {
      console.log("No FCM tokens provided");
      return { success: false, error: "No FCM tokens" };
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      tokens: fcmTokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(
      `Push notifications sent: ${response.successCount}/${fcmTokens.length}`,
    );
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error: any) {
    console.error("Error sending multicast notification:", error);
    return { success: false, error: error.message };
  }
};

// Send notification to a topic (e.g., all delivery partners)
export const sendTopicNotification = async (
  topic: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    if (!messaging) {
      console.log("Firebase messaging not initialized");
      return { success: false, error: "Firebase not configured" };
    }

    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      topic,
    };

    const response = await messaging.send(message);
    console.log(`Topic notification sent to ${topic}:`, response);
    return { success: true, messageId: response };
  } catch (error: any) {
    console.error("Error sending topic notification:", error);
    return { success: false, error: error.message };
  }
};

// Subscribe token to topic
export const subscribeToTopic = async (
  fcmToken: string,
  topic: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!messaging) {
      console.log("Firebase messaging not initialized");
      return { success: false, error: "Firebase not configured" };
    }

    await messaging.subscribeToTopic(fcmToken, topic);
    console.log(`Subscribed to topic: ${topic}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error subscribing to topic:", error);
    return { success: false, error: error.message };
  }
};

// Unsubscribe token from topic
export const unsubscribeFromTopic = async (
  fcmToken: string,
  topic: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!messaging) {
      console.log("Firebase messaging not initialized");
      return { success: false, error: "Firebase not configured" };
    }

    await messaging.unsubscribeFromTopic(fcmToken, topic);
    console.log(`Unsubscribed from topic: ${topic}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error unsubscribing from topic:", error);
    return { success: false, error: error.message };
  }
};

export default admin;

// Client-side Firebase Cloud Messaging setup
let initializeApp: any;
let getApps: any;
let getMessaging: any;
let getToken: any;
let onMessage: any;

// Try to import Firebase (optional)
try {
  const firebaseApp = require("firebase/app");
  const firebaseMessaging = require("firebase/messaging");
  initializeApp = firebaseApp.initializeApp;
  getApps = firebaseApp.getApps;
  getMessaging = firebaseMessaging.getMessaging;
  getToken = firebaseMessaging.getToken;
  onMessage = firebaseMessaging.onMessage;
} catch (error) {
  console.log("firebase packages not installed (optional)");
}

type FirebaseApp = any;
type Messaging = any;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let messaging: Messaging | null = null;

// Initialize Firebase
if (typeof window !== "undefined" && !getApps().length) {
  app = initializeApp(firebaseConfig);
}

// Get FCM token
export const requestNotificationPermission = async () => {
  try {
    if (!initializeApp || !getMessaging || !getToken) {
      console.log("Firebase not configured");
      return null;
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      console.log("Notifications not supported");
      return null;
    }

    const permission = await Notification.requestPermission();

    if (permission === "granted") {
      console.log("Notification permission granted");

      if (!messaging && "serviceWorker" in navigator) {
        messaging = getMessaging(app);
      }

      if (messaging) {
        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        console.log("FCM Token:", token);
        return token;
      }
    } else {
      console.log("Notification permission denied");
    }

    return null;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () =>
  new Promise((resolve) => {
    if (!messaging) {
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        messaging = getMessaging(app);
      }
    }

    if (messaging) {
      onMessage(messaging, (payload: any) => {
        console.log("Foreground message received:", payload);
        resolve(payload);
      });
    }
  });

// Save FCM token to backend
export const saveFCMToken = async (token: string, userId: string) => {
  try {
    const response = await fetch("/api/notifications/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fcmToken: token, userId }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error saving FCM token:", error);
    return null;
  }
};


import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore, initializeFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, type FirebaseStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  try {
    db = getFirestore(app);
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
        } else if (err.code == 'unimplemented') {
            console.warn('The current browser does not support all of the features required to enable persistence.');
        }
    });
  } catch(e) {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  }
} else {
  app = getApps()[0];
  db = getFirestore(app);
}

const auth: Auth = getAuth(app);
const storage: FirebaseStorage = getStorage(app);
const messaging = (typeof window !== 'undefined') ? getMessaging(app) : null;


/**
 * Requests permission for push notifications and returns the token.
 * @returns A promise that resolves with the FCM token, or null if permission is denied.
 */
export const fetchToken = async () => {
    if (!messaging) return null;
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
            return token;
        } else {
            console.log('Unable to get permission to notify.');
            return null;
        }
    } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
        return null;
    }
};

if (typeof window !== 'undefined' && messaging) {
    onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // You can display a custom in-app notification here if the app is in the foreground.
    });
}


/**
 * Universal file upload utility for Firebase Storage.
 * Handles file validation and returns the download URL.
 * @param file The file to upload.
 * @param folder The folder path in the storage bucket (e.g., 'profilePictures/userId').
 * @param fileName The name for the uploaded file.
 * @param maxSizeMB The maximum allowed file size in megabytes.
 * @returns A promise that resolves with the public download URL of the uploaded file.
 */
export async function uploadFile(
  file: File,
  folder: string,
  fileName: string,
  maxSizeMB: number = 5
): Promise<string> {
  // 1. Validate input
  if (!file) {
    throw new Error("No file provided for upload.");
  }
  if (!folder || !fileName) {
    throw new Error("Folder and file name are required.");
  }

  // 2. Validate file type (must be an image)
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Only images are allowed.');
  }

  // 3. Validate file size
  const maxSizeInBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    throw new Error(`File is too large. Maximum size is ${maxSizeMB}MB.`);
  }

  // 4. Create storage reference and upload
  const storageRef = ref(storage, `${folder}/${fileName}`);
  
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error("Firebase Storage upload failed:", error);
    // Re-throw a more user-friendly error. The original error may contain sensitive info.
    throw new Error("Image upload failed. Please try again.");
  }
}

export { app, auth, db, storage, messaging };

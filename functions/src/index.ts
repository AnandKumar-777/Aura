
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const fcm = admin.messaging();

export const sendPushNotification = functions.firestore
  .document("notifications/{userId}/userNotifications/{notificationId}")
  .onCreate(async (snapshot, context) => {
    const { userId } = context.params;
    const notificationData = snapshot.data();

    if (!notificationData) {
      console.log("No data associated with the event");
      return;
    }

    const { type, senderId } = notificationData;

    // 1. Get the recipient's FCM token
    const tokenDoc = await db.collection("fcmTokens").doc(userId).get();
    if (!tokenDoc.exists) {
      console.log(`No FCM token for user ${userId}`);
      return;
    }
    const tokenData = tokenDoc.data();
    if (!tokenData?.token) {
        console.log(`FCM token document for user ${userId} is missing token field.`);
        return;
    }
    const fcmToken = tokenData.token;


    // 2. Get the sender's profile to use their username in the notification
    const senderDoc = await db.collection("users").doc(senderId).get();
    if (!senderDoc.exists) {
      console.log(`Sender profile ${senderId} not found.`);
      return;
    }
    const senderUsername = senderDoc.data()?.username || "Someone";

    // 3. Construct the notification message
    let title = "New Notification";
    let body = "You have a new notification on AURA";

    switch (type) {
      case "like":
        title = "New Like!";
        body = `${senderUsername} liked your post.`;
        break;
      case "comment":
        title = "New Comment!";
        body = `${senderUsername} commented on your post.`;
        break;
      case "follow":
        title = "New Follower!";
        body = `${senderUsername} started following you.`;
        break;
       case "message":
        title = `New Message from ${senderUsername}!`;
        body = "You have a new message.";
        break;
    }

    const payload: admin.messaging.MessagingPayload = {
      notification: {
        title,
        body,
        icon: "/favicon.ico", // Optional: replace with your app's icon URL
        click_action: "/", // Optional: URL to open when notification is clicked
      },
    };

    // 4. Send the notification
    try {
        await fcm.send({
            token: fcmToken,
            ...payload
        });
        console.log(`Successfully sent notification to user ${userId}`);
    } catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
    }
  });


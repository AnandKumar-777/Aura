# **App Name**: Firebase Social

## Core Features:

- User Authentication: Enable users to securely sign up, log in, and manage their accounts using Firebase Authentication.
- Profile Creation and Management: Allow users to create and edit their profiles, including uploading a profile photo, adding a bio, and displaying follower/following counts. Profile photos should be stored in Firebase Storage.
- Post Upload and Display: Enable users to upload images with captions and timestamps. Store post metadata (image URL, caption, timestamp, user ID) in Firestore. Display posts in a grid view on the profile and in a detailed view on individual post pages.
- Home Feed: Display a chronologically ordered (newest first) feed of posts from users the current user follows. Implement infinite scrolling or pagination to handle large amounts of data.
- Like and Comment Functionality: Allow users to like and unlike posts. Implement real-time like count updates. Enable users to add comments to posts, displayed in chronological order.
- Follow System: Implement a follow/unfollow system that updates follower/following counts in real-time. The home feed should prioritize content from followed users.
- Basic Notifications: Notify users when someone likes or comments on their posts, or when someone starts following them. Store notification data in Firestore.

## Style Guidelines:

- Primary color: Soft sky blue (#87CEEB) evoking calmness and connection.
- Background color: Very light desaturated blue (#F0F8FF) maintaining the serene aesthetic.
- Accent color: Pale violet (#D8BFD8), providing a gentle contrast.
- Headline font: 'Poppins', a geometric sans-serif for a contemporary feel. Body font: 'PT Sans', a humanist sans-serif for readability.
- Use simple, outlined icons for navigation and actions to maintain a clean look.
- Implement a mobile-first, responsive design with a bottom navigation bar for key actions (Home, Search, Create, Profile).
- Use subtle fade-in animations for loading content and transitions to enhance user experience.
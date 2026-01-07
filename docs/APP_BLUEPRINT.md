# Application Blueprint: AURA

This document provides a high-level blueprint of the most important files and directories that define the app's structure, functionality, and appearance. Use this as a reference when you want to make changes.

---

### 1. Core App Structure & Routing (`src/app/`)

This is the heart of the Next.js application, using the App Router.

- **`src/app/layout.tsx`**: The root layout for the entire app. It includes the `<body>` and `<html>` tags, loads the global stylesheet (`globals.css`), and wraps all content in the `AuthProvider`. The animated starfield background is also rendered here.

- **`src/app/globals.css`**: The global stylesheet. This is a critical file that defines:
    - The core color palette and theme.
    - The animated starfield background (`@keyframes animate-stars`).
    - The shared `.glass-card` style, which creates the app's signature frosted glass look.

- **`src/app/(main)/layout.tsx`**: The main layout for the authenticated part of the app (after login). It includes the `Header` and `BottomNav`.

- **`src/app/(main)/page.tsx`**: This is the **Home Feed** screen.

- **`src/app/(main)/[username]/page.tsx`**: This is the **Profile Page** for a given user.

- **`src/app/(main)/search/page.tsx`**: The user search page.

- **`src/app/(auth)/...`**: This directory contains the `login` and `signup` pages and their shared layout.

---

### 2. Reusable UI Components (`src/components/`)

This folder contains all the reusable React components, which are the visual building blocks of the app.

- **`src/components/ui/`**: These are the base ShadCN components (e.g., `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`). Styling changes made here will affect these components everywhere they are used, ensuring consistency.

- **`src/components/layout/`**: Contains the main navigation components:
    - `Header.tsx`: The top navigation bar.
    - `BottomNav.tsx`: The floating glass navigation bar for mobile.

- **`src/components/posts/`**: Components related to displaying posts.
    - `PostCard.tsx`: The individual post card seen in the main feed.
    - `PostView.tsx`: The detailed view of a post, which appears in a dialog.

- **`src/components/profile/`**: Components used on the user profile screen.
    - `ProfileHeader.tsx`: The main header section of the profile page.
    - `PostGrid.tsx`: The grid of image thumbnails on the profile.

- **`src/components/stories/`**: Contains the `StoryBar.tsx` component displayed at the top of the home feed.

---

### 3. Data Logic & State Management (`src/lib/` & `src/context/`)

This is where the app's data structures and interactions with Firebase are defined.

- **`src/lib/types.ts`**: **(Data Blueprint)** This file is the definitive source for the app's data models. It defines the TypeScript interfaces for `UserProfile`, `Post`, `Comment`, `Story`, `Message`, and `Notification`.

- **`src/lib/firebase.ts`**: This file initializes the connection to Firebase and contains utility functions, such as `uploadFile` for Firebase Storage.

- **`src/context/AuthContext.tsx`**: A crucial context provider that manages the current user's authentication state and profile data. It makes user information available to all components throughout the app.

---

With this blueprint, you can now request changes with more precision. For example, you could ask to "Change the border radius of the `.glass-card` style in `globals.css`" or "Add the user's display name to the `BottomNav.tsx` component."

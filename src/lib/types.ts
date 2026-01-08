
import type { Timestamp } from 'firebase/firestore';

// Helper type to allow for serializable Timestamps
type SerializableTimestamp = Timestamp | string;

export interface UserProfile {
  uid: string;
  email: string | null;
  username: string;
  displayName: string;
  bio: string;
  photoURL: string;
  followersCount: number;
  followingCount: number;
  createdAt: SerializableTimestamp;
  isPrivate?: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  imageUrl?: string; // Made optional
  caption: string; // Will be used for textContent
  createdAt: SerializableTimestamp;
  likeCount: number;
  commentCount: number;
  author?: UserProfile;
  likesHidden?: boolean;
  commentingDisabled?: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  postId: string;
  text: string; // Was text, which is correct
  createdAt: SerializableTimestamp;
  author?: UserProfile;
}

export interface Notification {
  id: string;
  recipientId: string;
  senderId: string;
  type: 'like' | 'comment' | 'follow' | 'message';
  postId?: string;
  chatId?: string;
  read: boolean;
  createdAt: SerializableTimestamp;
  sender?: UserProfile;
}

export interface Story {
    id: string;
    authorId: string;
    imageUrl?: string; // Made optional
    textContent?: string; // Added for text stories
    createdAt: SerializableTimestamp;
    expiresAt: SerializableTimestamp;
}

export interface Chat {
    id: string;
    members: string[];
    lastMessage?: string;
    lastMessageAt?: SerializableTimestamp;
    updatedAt: SerializableTimestamp;
}

export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    text: string;
    createdAt: SerializableTimestamp;
    author?: UserProfile;
}

export interface FcmToken {
    token: string;
    updatedAt: SerializableTimestamp;
}

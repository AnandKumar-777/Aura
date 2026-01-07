
import type { Notification, UserProfile, Post } from '@/lib/types';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useEffect, useState } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { MessageSquare } from 'lucide-react';

type NotificationWithSender = Notification & { sender: UserProfile };

// Helper function to safely get a Date object
const toDate = (timestamp: Timestamp | string | undefined): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  // Fallback for serialized timestamp objects that might not be instances of Timestamp
  if (typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
    return new Date((timestamp as any).seconds * 1000);
  }
  return null;
};

function getNotificationLink(notification: NotificationWithSender) {
    switch (notification.type) {
        case 'like':
        case 'comment':
            return `/p/${notification.postId}`;
        case 'follow':
            return `/${notification.sender.username}`;
        case 'message':
            return `/messages/${notification.chatId}`;
        default:
            return '#';
    }
}

function getNotificationMessage(notification: NotificationWithSender) {
    const senderUsername = <strong className="font-semibold">{notification.sender.username}</strong>;
    switch (notification.type) {
        case 'like':
            return <>{senderUsername} liked your post.</>;
        case 'comment':
            return <>{senderUsername} commented on your post.</>;
        case 'follow':
            return <>{senderUsername} started following you.</>;
        case 'message':
            return <>{senderUsername} sent you a message.</>;
        default:
            return 'New notification';
    }
}

export default function NotificationItem({ notification }: { notification: NotificationWithSender }) {
    const [post, setPost] = useState<Post | null>(null);
    const notificationDate = toDate(notification.createdAt);

    useEffect(() => {
        if (notification.postId) {
            const postRef = doc(db, 'posts', notification.postId);
            getDoc(postRef).then(snap => {
                if (snap.exists()) {
                    setPost({ id: snap.id, ...snap.data() } as Post);
                }
            });
        }
    }, [notification.postId]);
    
    return (
        <Link href={getNotificationLink(notification)} className={cn(
            "flex items-center gap-4 p-3 rounded-lg transition-colors hover:bg-accent",
            !notification.read && "bg-primary/10"
        )}>
            <Avatar className="h-10 w-10">
                <AvatarImage src={notification.sender.photoURL} alt={notification.sender.username} />
                <AvatarFallback>{notification.sender.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
                <p className="text-sm">
                    {getNotificationMessage(notification)}
                    {notificationDate && <span className="text-xs text-muted-foreground ml-2">
                        {formatDistanceToNow(notificationDate, { addSuffix: true })}
                    </span>}
                </p>
            </div>
            {notification.type === 'follow' ? (
                <Button size="sm">View</Button>
            ) : notification.type === 'message' ? (
                 <div className="flex items-center justify-center h-11 w-11 rounded-md bg-muted">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                </div>
            ) : post && (
                <Image 
                    src={post.imageUrl}
                    alt="Post thumbnail"
                    width={44}
                    height={44}
                    className="aspect-square object-cover rounded-md"
                />
            )}
        </Link>
    );
}

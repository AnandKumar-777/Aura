
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, getDoc, doc, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { Notification, UserProfile } from '@/lib/types';
import NotificationItem from '@/components/notifications/NotificationItem';
import { Skeleton } from '@/components/ui/skeleton';

type NotificationWithSender = Notification & { sender: UserProfile };

export default function NotificationsPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<NotificationWithSender[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'notifications', user.uid, 'userNotifications'),
            orderBy('createdAt', 'desc'),
            limit(30)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                setNotifications([]);
                setLoading(false);
                return;
            }

            const unreadDocRefs: any[] = [];
            const notificationsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
                const notif = { id: docSnap.id, ...docSnap.data() } as Notification;
                if (!notif.read) {
                    unreadDocRefs.push(docSnap.ref);
                }

                const senderSnap = await getDoc(doc(db, 'users', notif.senderId));
                if (senderSnap.exists()) {
                    const sender = senderSnap.data() as UserProfile;
                    return { ...notif, sender };
                }
                return null;
            }));

            setNotifications(notificationsData.filter((n): n is NotificationWithSender => n !== null));
            setLoading(false);

            if (unreadDocRefs.length > 0) {
                const batch = writeBatch(db);
                unreadDocRefs.forEach(ref => batch.update(ref, { read: true }));
                await batch.commit();
            }
        });

        return () => unsubscribe();
    }, [user]);

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-headline font-bold mb-4">Notifications</h1>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (notifications.length === 0) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20">
                <h1 className="text-2xl font-headline font-bold mb-4">Notifications</h1>
                <p className="text-muted-foreground">You have no notifications yet.</p>
            </div>
        );
    }
    
    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-headline font-bold mb-4">Notifications</h1>
            <div className="space-y-1">
                {notifications.map(notif => (
                    <NotificationItem key={notif.id} notification={notif} />
                ))}
            </div>
        </div>
    );
}

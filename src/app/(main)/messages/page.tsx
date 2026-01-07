
'use client';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { Chat, UserProfile } from '@/lib/types';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare } from 'lucide-react';

type ChatWithRecipient = Chat & { recipient: UserProfile };

export default function MessagesPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<ChatWithRecipient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('members', 'array-contains', user.uid));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsData = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const chat = { id: docSnap.id, ...docSnap.data() } as Chat;
          const recipientId = chat.members.find((id) => id !== user.uid);
          
          if (recipientId) {
            const userSnap = await getDoc(doc(db, 'users', recipientId));
            if (userSnap.exists()) {
              const recipient = userSnap.data() as UserProfile;
              return { ...chat, recipient };
            }
          }
          return null;
        })
      );

      // Sort by last message time
      const sortedChats = chatsData
        .filter((c): c is ChatWithRecipient => c !== null)
        .sort((a, b) => (b.lastMessageAt?.toMillis() || 0) - (a.lastMessageAt?.toMillis() || 0));

      setChats(sortedChats);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
             <div key={i} className="flex items-center gap-4 p-2">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (chats.length === 0) {
      return (
          <div className="text-center py-20">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-semibold">No Messages</h2>
              <p className="mt-2 text-sm text-muted-foreground">You have no messages yet. Start a conversation!</p>
          </div>
      )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Messages</h1>
      <div className="border rounded-lg">
        {chats.map((chat) => (
          <Link
            href={`/messages/${chat.id}`}
            key={chat.id}
            className="flex items-center gap-4 p-3 hover:bg-accent border-b last:border-b-0"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={chat.recipient.photoURL} alt={chat.recipient.username} />
              <AvatarFallback>{chat.recipient.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-start">
                <p className="font-semibold">{chat.recipient.username}</p>
                {chat.lastMessageAt && (
                   <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(chat.lastMessageAt.toDate(), { addSuffix: true })}
                   </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">{chat.lastMessage || 'No messages yet'}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

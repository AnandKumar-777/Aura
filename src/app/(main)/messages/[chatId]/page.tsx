
'use client';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { Message, UserProfile, Chat } from '@/lib/types';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, runTransaction } from 'firebase/firestore';
import { useEffect, useState, useRef, FormEvent } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function ChatPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const chatId = params.chatId as string;

  const [chat, setChat] = useState<Chat | null>(null);
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!user || !chatId) return;

    const chatDocRef = doc(db, 'chats', chatId);

    const unsubscribeChat = onSnapshot(chatDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const chatData = docSnap.data() as Chat;
        if (!chatData.members.includes(user.uid)) {
          setLoading(false);
          return;
        }
        setChat(chatData);

        const recipientId = chatData.members.find(id => id !== user.uid);
        if (recipientId) {
          const userSnap = await getDoc(doc(db, 'users', recipientId));
          if (userSnap.exists()) {
            setRecipient(userSnap.data() as UserProfile);
          }
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    const messagesQuery = query(collection(db, `chats/${chatId}/messages`), orderBy('createdAt', 'asc'));
    const unsubscribeMessages = onSnapshot(messagesQuery, (querySnapshot) => {
      const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
    });

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [user, chatId]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim() || isSending || !recipient) return;

    setIsSending(true);
    const text = newMessage.trim();
    setNewMessage('');

    try {
        const chatRef = doc(db, 'chats', chatId);
        const messagesColRef = collection(chatRef, 'messages');

        await runTransaction(db, async (transaction) => {
            const newMsgRef = doc(messagesColRef);
            transaction.set(newMsgRef, {
                chatId: chatId,
                senderId: user.uid,
                text: text,
                createdAt: serverTimestamp()
            });

            transaction.update(chatRef, {
                lastMessage: text,
                lastMessageAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            // Create notification for the recipient
            const notificationRef = doc(collection(db, 'notifications', recipient.uid, 'userNotifications'));
            transaction.set(notificationRef, {
                recipientId: recipient.uid,
                senderId: user.uid,
                type: 'message',
                chatId: chatId,
                read: false,
                createdAt: serverTimestamp(),
            });
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error sending message",
            description: error.message,
        })
    } finally {
        setIsSending(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin"/></div>;
  }

  if (!chat) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full md:h-[calc(100vh-4rem-1px)] max-w-4xl mx-auto w-full glass-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-2 border-b">
        <Button variant="ghost" size="icon" className="mr-2" onClick={() => router.back()}>
            <ArrowLeft />
        </Button>
        {recipient && (
          <Link href={`/${recipient.username}`} className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={recipient.photoURL} alt={recipient.username} />
              <AvatarFallback>{recipient.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-semibold">{recipient.username}</span>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex items-end gap-2',
                msg.senderId === user?.uid ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-3 py-2 text-sm',
                  msg.senderId === user?.uid
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t mt-auto bg-background/20 backdrop-blur-sm">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Message..."
            autoComplete="off"
            disabled={isSending}
            className="bg-background/50"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5"/>}
          </Button>
        </form>
      </div>
    </div>
  );
}

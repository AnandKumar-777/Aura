
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { Post, UserProfile } from '@/lib/types';
import { doc, getDoc, serverTimestamp, runTransaction, onSnapshot, collection } from 'firebase/firestore';
import { Heart, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';


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


export default function PostCard({ post }: { post: Post }) {
  const { user } = useAuth();
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [isLiked, setIsLiked] = useState(false);
  const postDate = toDate(post.createdAt);

  useEffect(() => {
    const fetchAuthor = async () => {
      const authorDoc = await getDoc(doc(db, 'users', post.authorId));
      if (authorDoc.exists()) {
        setAuthor(authorDoc.data() as UserProfile);
      }
    };
    fetchAuthor();
  }, [post.authorId]);

  useEffect(() => {
    if (!user) return;
    const likeRef = doc(db, `posts/${post.id}/likes`, user.uid);
    const unsubscribe = onSnapshot(likeRef, (doc) => {
      setIsLiked(doc.exists());
    });
    return () => unsubscribe();
  }, [post.id, user]);

  useEffect(() => {
    const postRef = doc(db, `posts/${post.id}`);
    const unsubscribe = onSnapshot(postRef, (doc) => {
      if (doc.exists()) {
        setLikeCount(doc.data().likeCount);
      }
    });
    return () => unsubscribe();
  }, [post.id]);

  const handleLike = async () => {
    if (!user) return;

    const postRef = doc(db, 'posts', post.id);
    const likeRef = doc(db, `posts/${post.id}/likes`, user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) {
          throw 'Document does not exist!';
        }

        const currentLikeCount = postDoc.data().likeCount || 0;
        const likeDoc = await transaction.get(likeRef);

        if (likeDoc.exists()) {
          // Unlike
          transaction.update(postRef, { likeCount: Math.max(0, currentLikeCount - 1) });
          transaction.delete(likeRef);
        } else {
          // Like
          transaction.update(postRef, { likeCount: currentLikeCount + 1 });
          transaction.set(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
          
          if (post.authorId !== user.uid) {
            const notificationRef = doc(collection(db, 'notifications', post.authorId, 'userNotifications'));
            transaction.set(notificationRef, {
              recipientId: post.authorId,
              senderId: user.uid,
              type: 'like',
              postId: post.id,
              read: false,
              createdAt: serverTimestamp(),
            });
          }
        }
      });
    } catch (e) {
      console.error('Like transaction failed: ', e);
    }
  };

  if (!author) {
    return (
      <div className="glass-card overflow-hidden rounded-xl">
        <div className="flex items-center p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="ml-3 space-y-2">
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="aspect-square w-full" />
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <div className="flex items-center p-4">
        <Link href={`/${author.username}`} className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={author.photoURL} alt={author.username} />
              <AvatarFallback>{author.username.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm hover:underline">{author.username}</span>
        </Link>
      </div>

      {post.imageUrl && (
        <Link href={`/p/${post.id}`}>
            <div className="relative aspect-square w-full">
                <Image src={post.imageUrl} alt={post.caption} fill className="object-cover" />
            </div>
        </Link>
      )}

      <div className="p-4 space-y-3">
        {!post.imageUrl && (
             <Link href={`/p/${post.id}`}>
                <p className="text-lg whitespace-pre-wrap">{post.caption}</p>
            </Link>
        )}
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" onClick={handleLike} aria-label="Like post" className="text-foreground/80 hover:text-foreground hover:bg-accent rounded-full">
            <Heart className={cn('h-6 w-6 transition-all', isLiked ? 'fill-red-500 text-red-500' : '')} />
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="Comment on post" className="text-foreground/80 hover:text-foreground hover:bg-accent rounded-full">
            <Link href={`/p/${post.id}`}>
                <MessageCircle className="h-6 w-6" />
            </Link>
          </Button>
        </div>
        
        {likeCount > 0 && (
            <p className="text-sm font-semibold">{likeCount} {likeCount === 1 ? 'like' : 'likes'}</p>
        )}

        {post.imageUrl && (
            <div className="text-sm">
                <Link href={`/${author.username}`} className="font-semibold mr-2 hover:underline">{author.username}</Link>
                <span>{post.caption}</span>
            </div>
        )}
        
        {post.commentCount > 0 && (
             <Link href={`/p/${post.id}`} className="text-sm text-muted-foreground hover:underline">
                View all {post.commentCount} comments
            </Link>
        )}

        <div className="text-xs text-muted-foreground uppercase tracking-wider">
            {postDate && formatDistanceToNow(postDate, { addSuffix: true })}
        </div>
      </div>
    </div>
  );
}

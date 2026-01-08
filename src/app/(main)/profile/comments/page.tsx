
'use client';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { Comment, Post } from '@/lib/types';
import { collectionGroup, query, where, orderBy, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { notFound, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type CommentWithPost = Comment & { post: Post };

const toDate = (timestamp: Timestamp | string | undefined): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  if (typeof timestamp === 'object' && 'seconds' in timestamp) {
    return new Date((timestamp as any).seconds * 1000);
  }
  return null;
};


export default function UserCommentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<CommentWithPost[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchComments = async () => {
      setLoading(true);
      try {
        const commentsQuery = query(
          collectionGroup(db, 'comments'),
          where('authorId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );

        const commentsSnapshot = await getDocs(commentsQuery);
        const commentsData: CommentWithPost[] = [];

        for (const commentDoc of commentsSnapshot.docs) {
          const comment = { id: commentDoc.id, ...commentDoc.data() } as Comment;
          // The post ID is nested inside the comment document's path
          const postId = commentDoc.ref.parent.parent?.id;
          if (postId) {
            const postSnap = await getDoc(doc(db, 'posts', postId));
            if (postSnap.exists()) {
              const post = { id: postSnap.id, ...postSnap.data() } as Post;
              commentsData.push({ ...comment, postId, post });
            }
          }
        }
        setComments(commentsData);
      } catch (error) {
        console.error("Error fetching user comments: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft />
            </Button>
            <h1 className="text-2xl font-headline font-bold">My Comments</h1>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 p-4 glass-card rounded-xl">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-20 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return notFound();
  }
  
  const PageHeader = () => (
    <div className="flex items-center gap-4 mb-4">
      <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft />
      </Button>
      <h1 className="text-2xl font-headline font-bold">My Comments</h1>
    </div>
  );

  if (comments.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <PageHeader />
        <div className="text-center py-20">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No Comments Yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">You haven't commented on any posts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader />
      <div className="space-y-4">
        {comments.map(({ id, text, createdAt, post }) => {
          const commentDate = toDate(createdAt);
          return (
            <Link href={`/p/${post.id}`} key={id} className="block p-4 glass-card rounded-xl hover:bg-accent/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">You commented:</p>
                  <p className="font-medium text-foreground">"{text}"</p>
                  {commentDate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(commentDate, { addSuffix: true })}
                    </p>
                  )}
                </div>
                {post.imageUrl ? (
                  <Image
                    src={post.imageUrl}
                    alt="Post thumbnail"
                    width={80}
                    height={80}
                    className="aspect-square object-cover rounded-md"
                  />
                ) : (
                    <div className="w-20 h-20 flex items-center justify-center bg-muted rounded-md text-muted-foreground text-xs p-2 text-center">
                        Text Post
                    </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

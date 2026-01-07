
'use client';

import type { Post, UserProfile, Comment as CommentType } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Heart, Loader2, MessageCircle } from 'lucide-react';
import { useEffect, useState, FormEvent } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, runTransaction, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Helper function to safely get a Date object
const toDate = (timestamp: Timestamp | string | undefined): Date | null => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  if (typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
    return new Date((timestamp as any).seconds * 1000);
  }
  return null;
};

export default function PostView({ post: initialPost }: { post: Post }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState(initialPost);
  const [author, setAuthor] = useState<UserProfile | null>(null);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const postDate = toDate(post.createdAt);

  useEffect(() => {
    // Fetch author
    const authorDocRef = doc(db, 'users', post.authorId);
    getDoc(authorDocRef).then((docSnap) => {
      if (docSnap.exists()) {
        setAuthor(docSnap.data() as UserProfile);
      }
    });

    const postDocRef = doc(db, 'posts', post.id);
    const unsubPost = onSnapshot(postDocRef, (docSnap) => {
        if(docSnap.exists()) {
            setPost({ id: docSnap.id, ...docSnap.data() } as Post);
        }
    });

    let unsubLike: () => void = () => {};
    if (user) {
        const likeDocRef = doc(db, `posts/${post.id}/likes`, user.uid);
        unsubLike = onSnapshot(likeDocRef, (docSnap) => {
            setIsLiked(docSnap.exists());
        });
    }
    
    return () => {
        unsubPost();
        unsubLike();
    }
  }, [post.id, post.authorId, user]);
  
  useEffect(() => {
    const commentsQuery = query(collection(db, `posts/${post.id}/comments`), orderBy('createdAt', 'asc'));
    const unsubComments = onSnapshot(commentsQuery, async (querySnapshot) => {
        const commentsData: CommentType[] = [];
        for (const docSnap of querySnapshot.docs) {
            const comment = { id: docSnap.id, ...docSnap.data() } as CommentType;
            if (comment.authorId) {
                const authorSnap = await getDoc(doc(db, 'users', comment.authorId));
                if (authorSnap.exists()) {
                    comment.author = authorSnap.data() as UserProfile;
                }
            }
            commentsData.push(comment);
        }
        setComments(commentsData);
    });
    return () => unsubComments();
  }, [post.id]);

  const handleLikeToggle = async () => {
    if (!user || isLiking) return;
    setIsLiking(true);

    const postRef = doc(db, 'posts', post.id);
    const likeRef = doc(db, `posts/${post.id}/likes`, user.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw "Post does not exist!";
        
        const likeDoc = await transaction.get(likeRef);
        const newLikeCount = postDoc.data().likeCount + (likeDoc.exists() ? -1 : 1);

        transaction.update(postRef, { likeCount: Math.max(0, newLikeCount) });
        if (likeDoc.exists()) {
          transaction.delete(likeRef);
        } else {
          transaction.set(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
          // Create notification
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
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsLiking(false);
    }
  };

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || isSubmittingComment) return;
    setIsSubmittingComment(true);

    const postRef = doc(db, 'posts', post.id);

    try {
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw 'Post does not exist!';

        const newCommentCount = (postDoc.data().commentCount || 0) + 1;
        transaction.update(postRef, { commentCount: newCommentCount });
        
        const commentsColRef = collection(db, `posts/${post.id}/comments`);
        const newCommentRef = doc(commentsColRef); // auto-generate ID
        transaction.set(newCommentRef, {
            authorId: user.uid,
            text: newComment,
            createdAt: serverTimestamp(),
            postId: post.id
        });

        if (post.authorId !== user.uid) {
            const notificationRef = doc(collection(db, 'notifications', post.authorId, 'userNotifications'));
            transaction.set(notificationRef, {
                recipientId: post.authorId,
                senderId: user.uid,
                type: 'comment',
                postId: post.id,
                read: false,
                createdAt: serverTimestamp(),
            });
        }
      });
      setNewComment('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error posting comment', description: error.message });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-card">
      {post.imageUrl && (
        <div className="w-full md:w-1/2 lg:w-3/5 relative bg-black/90 md:rounded-l-lg overflow-hidden">
            <Image src={post.imageUrl} alt={post.caption} layout="fill" objectFit="contain" />
        </div>
      )}
      <div className={cn("w-full flex flex-col", post.imageUrl && "md:w-1/2 lg:w-2/5")}>
        {author && (
          <div className="flex items-center p-4 border-b">
            <Link href={`/${author.username}`} className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarImage src={author.photoURL} alt={author.username} />
                <AvatarFallback>{author.username[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-semibold text-sm hover:underline">{author.username}</span>
            </Link>
          </div>
        )}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
             {author && (
                 <div className="flex items-start gap-3">
                    <Link href={`/${author.username}`}>
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={author.photoURL} alt={author.username} />
                            <AvatarFallback>{author.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <div>
                        <p className="text-sm">
                            <Link href={`/${author.username}`} className="font-semibold mr-2 hover:underline">{author.username}</Link>
                            {post.caption}
                        </p>
                        {postDate && <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(postDate, { addSuffix: true })}
                        </p>}
                    </div>
                 </div>
             )}
             <div className="space-y-4">
                {comments.map((comment) => {
                    const commentDate = toDate(comment.createdAt);
                    return (
                        <div key={comment.id} className="flex items-start gap-3">
                        {comment.author && (
                            <Link href={`/${comment.author.username}`}>
                                <Avatar className="h-9 w-9">
                                <AvatarImage src={comment.author.photoURL} alt={comment.author.username} />
                                <AvatarFallback>{comment.author.username[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </Link>
                        )}
                        <div>
                            <p className="text-sm">
                                <Link href={`/${comment.author?.username}`} className="font-semibold mr-2 hover:underline">{comment.author?.username}</Link>
                                {comment.text}
                            </p>
                            {commentDate && <p className="text-xs text-muted-foreground mt-1">
                                {formatDistanceToNow(commentDate, { addSuffix: true })}
                            </p>}
                        </div>
                        </div>
                    );
                })}
            </div>
          </div>
        </ScrollArea>
        <div className="border-t mt-auto p-2 md:p-4">
            <div className="flex items-center space-x-1 mb-2">
                <Button variant="ghost" size="icon" onClick={handleLikeToggle} disabled={isLiking} className="text-foreground/80 hover:text-foreground hover:bg-accent rounded-full">
                    <Heart className={cn('h-6 w-6', isLiked && 'fill-red-500 text-red-500')} />
                </Button>
                <Button variant="ghost" size="icon" className="text-foreground/80 hover:text-foreground hover:bg-accent rounded-full">
                    <MessageCircle className="h-6 w-6" />
                </Button>
            </div>
            <p className="text-sm font-semibold mb-2">{post.likeCount} likes</p>
            {postDate && <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                {formatDistanceToNow(postDate, { addSuffix: true })}
            </p>}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
                <Input
                    placeholder="Add a comment..."
                    className="flex-1"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={!user}
                />
                <Button type="submit" variant="ghost" disabled={!user || !newComment.trim() || isSubmittingComment} className="hover:bg-accent">
                    {isSubmittingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
                </Button>
            </form>
        </div>
      </div>
    </div>
  );
}

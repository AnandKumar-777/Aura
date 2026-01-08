
'use client';

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  collectionGroup,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { Post, UserProfile } from '@/lib/types';
import PostCard from '@/components/posts/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import StoryBar from '@/components/stories/StoryBar';
import UserList from '@/components/profile/UserList';

function EmptyFeed() {
    return (
        <div className="space-y-6 text-left">
            <div className="p-4 rounded-xl glass-card">
                 <h2 className="text-xl font-headline mb-2">Welcome to AURA</h2>
                 <p className="text-muted-foreground mb-4">Your feed is being personalized for you. The more you interact, the better it gets.</p>
            </div>
        </div>
    );
}

// Helper function to chunk an array into smaller arrays
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunkedArr: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArr.push(array.slice(i, i + size));
  }
  return chunkedArr;
}


export default function HomePage() {
  const { user, userProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      if (!user || !userProfile) {
        setLoading(false);
        return;
      };

      setLoading(true);

      try {
        // Get the list of users the current user is following
        const followingQuery = query(
          collection(db, `users/${user.uid}/following`)
        );
        const followingSnapshot = await getDocs(followingQuery);
        const followingIds = followingSnapshot.docs.map((doc) => doc.id);
        
        const followedUserIds = [...followingIds, user.uid]; // Include own posts in feed

        if (followedUserIds.length === 0) {
            setPosts([]);
            setLoading(false);
            return;
        }

        // Firestore 'in' queries are limited to 30 items. We need to batch requests.
        const userIdChunks = chunkArray(followedUserIds, 30);
        const postPromises: Promise<any>[] = [];

        userIdChunks.forEach(chunk => {
            const postsQuery = query(
              collection(db, 'posts'),
              where('authorId', 'in', chunk),
              orderBy('createdAt', 'desc'),
              limit(20) // Get up to 20 posts per chunk
            );
            postPromises.push(getDocs(postsQuery));
        });
        
        const allPostsSnapshots = await Promise.all(postPromises);
        
        let postsData: Post[] = [];
        allPostsSnapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                postsData.push({ id: doc.id, ...doc.data() } as Post);
            });
        });
        
        // Sort all fetched posts by creation date
        postsData.sort((a, b) => {
            const dateA = a.createdAt as any;
            const dateB = b.createdAt as any;
            return dateB.seconds - dateA.seconds;
        });

        // Limit the final feed size
        setPosts(postsData.slice(0, 50));

      } catch (error) {
        console.error('Error fetching feed:', error);
      } finally {
        setLoading(false);
      }
    };

    if(user && userProfile) {
      fetchFeed();
    } else if (!user && !userProfile) {
        setLoading(false);
    }
  }, [user, userProfile]);

  return (
    <div className="space-y-8 max-w-md mx-auto">
      <StoryBar />
      {loading ? (
         <div className="space-y-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card overflow-hidden p-4 space-y-4 rounded-xl">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-64 w-full rounded-md" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyFeed />
      ) : (
        <div className="space-y-8">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}

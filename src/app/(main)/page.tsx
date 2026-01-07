
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
                 <h2 className="text-xl font-headline mb-2">Your feed is empty for now</h2>
                 <p className="text-muted-foreground mb-4">Follow some people to see their posts here.</p>
            </div>
        </div>
    );
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

        if (followingIds.length === 0) {
            setPosts([]);
            setLoading(false);
            return;
        }

        // Fetch posts from followed users. Firestore 'in' queries are limited to 30 items.
        const postsQuery = query(
          collection(db, 'posts'),
          where('authorId', 'in', followedUserIds.slice(0, 30)),
          orderBy('createdAt', 'desc'),
          limit(20)
        );

        const postsSnapshot = await getDocs(postsQuery);
        const postsData = postsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Post[];

        setPosts(postsData);
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

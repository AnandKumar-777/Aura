
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { Story, UserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusCircle, UserPlus, Type } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';
import { StoryUploadSheet } from './StoryUploadSheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type StoryWithAuthor = Story & { author: UserProfile };

function StoryViewer({ story, onOpenChange }: { story: StoryWithAuthor | null, onOpenChange: (open: boolean) => void }) {
    if (!story) return null;

    return (
        <Dialog open={!!story} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 max-w-md w-full !h-full max-h-[90vh] flex flex-col !rounded-lg overflow-hidden gap-0">
                <DialogHeader className="p-4 flex-row items-center space-x-3 bg-background z-10">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={story.author.photoURL} alt={story.author.username} />
                      <AvatarFallback>{story.author.username[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold text-sm">{story.author.username}</p>
                    </div>
                </DialogHeader>
                <div className="flex-1 w-full h-full bg-black relative flex items-center justify-center">
                    {story.imageUrl && <img src={story.imageUrl} className="w-full h-full object-contain" alt="Story" />}
                    {story.textContent && (
                         <p className="text-white text-2xl font-bold p-8 text-center whitespace-pre-wrap">
                            {story.textContent}
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function StoryBar() {
  const { user, userProfile } = useAuth();
  const [stories, setStories] = useState<StoryWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadSheetOpen, setIsUploadSheetOpen] = useState(false);
  const [viewingStory, setViewingStory] = useState<StoryWithAuthor | null>(null);

  useEffect(() => {
    const fetchStories = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const followingQuery = query(collection(db, `users/${user.uid}/following`));
        const followingSnapshot = await getDocs(followingQuery);
        const followingIds = followingSnapshot.docs.map((doc) => doc.id);
        const storyUserIds = [...followingIds, user.uid];

        if (storyUserIds.length === 0) {
          setLoading(false);
          return;
        }

        const now = Timestamp.now();
        const storiesQuery = query(
          collection(db, 'stories'),
          where('authorId', 'in', storyUserIds.slice(0,10)),
          where('expiresAt', '>', now),
          orderBy('expiresAt', 'desc')
        );

        const storiesSnapshot = await getDocs(storiesQuery);
        if (storiesSnapshot.empty) {
            setStories([]);
            setLoading(false);
            return;
        }

        const authorIds = [...new Set(storiesSnapshot.docs.map(doc => doc.data().authorId))];
        const usersQuery = query(collection(db, 'users'), where('uid', 'in', authorIds));
        const usersSnapshot = await getDocs(usersQuery);
        const authors = Object.fromEntries(usersSnapshot.docs.map(doc => [doc.id, doc.data() as UserProfile]));

        const uniqueStories: { [key: string]: StoryWithAuthor } = {};
        storiesSnapshot.docs.forEach(doc => {
            const story = doc.data() as Story;
            if (!uniqueStories[story.authorId] && authors[story.authorId]) {
                 uniqueStories[story.authorId] = { ...story, id: doc.id, author: authors[story.authorId] };
            }
        });
        
        setStories(Object.values(uniqueStories));

      } catch (error) {
        console.error('Error fetching stories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [user]);

  return (
    <>
    <StoryViewer story={viewingStory} onOpenChange={() => setViewingStory(null)} />
    <div className="w-full bg-white/5 backdrop-blur-lg shadow-sm p-4 rounded-xl border border-white/5">
      <div className="flex items-center space-x-4 overflow-x-auto pb-2 -mb-2">
        {userProfile && (
            <StoryUploadSheet open={isUploadSheetOpen} onOpenChange={setIsUploadSheetOpen}>
                <div className="flex flex-col items-center space-y-1 flex-shrink-0">
                    <button onClick={() => setIsUploadSheetOpen(true)} className="relative">
                        <Avatar className="h-14 w-14 border-2 border-dashed border-muted-foreground">
                            <AvatarImage src={userProfile.photoURL} alt={userProfile.username} />
                            <AvatarFallback>{userProfile.username[0]}</AvatarFallback>
                        </Avatar>
                        <PlusCircle className="absolute -bottom-1 -right-1 h-6 w-6 bg-background rounded-full text-primary" />
                    </button>
                    <span className="text-xs text-muted-foreground">Your Story</span>
                </div>
            </StoryUploadSheet>
        )}

        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col items-center space-y-1 flex-shrink-0">
                 <Skeleton className="h-14 w-14 rounded-full" />
                 <Skeleton className="h-2 w-12 rounded-md" />
            </div>
          ))
        ) : (
          stories.filter(s => s.authorId !== user?.uid).map((story) => (
            <button key={story.id} onClick={() => setViewingStory(story)} className="flex flex-col items-center space-y-1 flex-shrink-0">
              <div className="h-16 w-16 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 to-fuchsia-500">
                <div className="bg-background rounded-full p-0.5 h-full w-full">
                    <Avatar className="h-full w-full">
                        <AvatarImage src={story.author.photoURL} alt={story.author.username} />
                        <AvatarFallback>{story.author.username[0]}</AvatarFallback>
                    </Avatar>
                </div>
              </div>
              <span className="text-xs truncate w-14 text-center">{story.author.username}</span>
            </button>
          ))
        )}

        <Link href="/search" className="flex flex-col items-center space-y-1 flex-shrink-0">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                 <UserPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <span className="text-xs truncate w-14 text-center">Find More</span>
        </Link>
      </div>
    </div>
    </>
  );
}

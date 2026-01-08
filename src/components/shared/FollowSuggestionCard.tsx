
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { collection, doc, runTransaction, serverTimestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { UserPlus, UserCheck, Loader2, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';

const DISMISS_KEY = 'aura_dev_suggestion_dismissed';

export default function FollowSuggestionCard({ userIdToFollow }: { userIdToFollow: string }) {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed !== 'true') {
        setIsVisible(true);
    }
    
    // Fetch profile to follow
    getDoc(doc(db, 'users', userIdToFollow)).then(docSnap => {
        if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
        }
    }).finally(() => setLoadingProfile(false));

    if (!currentUser) {
      setIsUpdating(false);
      return;
    }

    // Check if already following
    const followDocRef = doc(db, `users/${currentUser.uid}/following`, userIdToFollow);
    const unsubscribe = onSnapshot(followDocRef, (doc) => {
      setIsFollowing(doc.exists());
      setIsUpdating(false);
    });

    return () => unsubscribe();

  }, [currentUser, userIdToFollow]);
  
  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setIsVisible(false);
  }

  const handleFollowToggle = async () => {
    if (!currentUser || !profile || isUpdating) return;
    setIsUpdating(true);
    const currentUserRef = doc(db, 'users', currentUser.uid);
    const targetUserRef = doc(db, 'users', profile.uid);
    const followingRef = doc(db, `users/${currentUser.uid}/following`, profile.uid);
    const followerRef = doc(db, `users/${profile.uid}/followers`, currentUser.uid);

    try {
      await runTransaction(db, async (transaction) => {
        const currentUserDoc = await transaction.get(currentUserRef);
        const targetUserDoc = await transaction.get(targetUserRef);
        if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
          throw 'User does not exist!';
        }

        const isCurrentlyFollowing = isFollowing;
        
        if (isCurrentlyFollowing) {
          // This case is unlikely for this component but included for completeness
          transaction.delete(followingRef);
          transaction.delete(followerRef);
          transaction.update(currentUserRef, { followingCount: currentUserDoc.data().followingCount - 1 });
          transaction.update(targetUserRef, { followersCount: targetUserDoc.data().followersCount - 1 });
        } else {
          transaction.set(followingRef, { userId: profile.uid, createdAt: serverTimestamp() });
          transaction.set(followerRef, { userId: currentUser.uid, createdAt: serverTimestamp() });
          transaction.update(currentUserRef, { followingCount: currentUserDoc.data().followingCount + 1 });
          transaction.update(targetUserRef, { followersCount: targetUserDoc.data().followersCount + 1 });

          // Create notification
          const notificationRef = doc(collection(db, 'notifications', profile.uid, 'userNotifications'));
          transaction.set(notificationRef, {
            recipientId: profile.uid,
            senderId: currentUser.uid,
            type: 'follow',
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      });
      // After following successfully, also dismiss the card
      handleDismiss();
    } catch (e) {
      console.error('Follow transaction failed: ', e);
    }
    // isUpdating will be set to false by the onSnapshot listener, which triggers a re-render
  };

  if (!isVisible || loadingProfile || !profile) {
    if (loadingProfile && isVisible) {
        return (
            <div className="glass-card p-4 rounded-xl space-y-3 relative">
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center gap-4">
                    <Skeleton className="h-14 w-14 rounded-full" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
        );
    }
    return null;
  }
  
  // Don't show if user is already following
  if (isFollowing) return null;

  return (
    <div className="glass-card p-4 rounded-xl space-y-3 relative">
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={handleDismiss}>
            <X className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-foreground">Follow our Developers Account</h3>
        <div className="flex items-center justify-between">
            <Link href={`/${profile.username}`} className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                <AvatarImage src={profile.photoURL} alt={profile.username} />
                <AvatarFallback>{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                <p className="font-semibold">{profile.username}</p>
                <p className="text-sm text-muted-foreground">{profile.displayName}</p>
                </div>
            </Link>
            {currentUser && currentUser.uid !== profile.uid && (
                <Button size="sm" onClick={handleFollowToggle} disabled={isUpdating}>
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> :
                    isFollowing ? <UserCheck className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />
                }
                {isFollowing ? 'Following' : 'Follow'}
                </Button>
            )}
        </div>
    </div>
  );
}


'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { collection, query, where, getDocs, limit, orderBy, doc, runTransaction, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function UserList({ users }: { users: UserProfile[] }) {
    if (users.length === 0) {
        return <p className="text-muted-foreground text-center pt-4">No users found.</p>
    }

    return (
        <div className="space-y-2 glass-card p-2 rounded-xl">
            {users.map((profile) => (
                <UserListItem key={profile.uid} profile={profile} />
            ))}
        </div>
    )
}


function UserListItem({ profile }: { profile: UserProfile }) {
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(true);

  useEffect(() => {
    if (!currentUser) {
        setIsUpdating(false);
        return;
    }
    const followDocRef = doc(db, `users/${currentUser.uid}/following`, profile.uid);
    const unsubscribe = onSnapshot(followDocRef, (doc) => {
      setIsFollowing(doc.exists());
      setIsUpdating(false);
    });
    return () => unsubscribe();
  }, [currentUser, profile.uid]);

  const handleFollowToggle = async () => {
    if (!currentUser || isUpdating) return;
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
          const notificationRef = doc(collection(db, 'notifications'));
          transaction.set(notificationRef, {
            recipientId: profile.uid,
            senderId: currentUser.uid,
            type: 'follow',
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      });
    } catch (e) {
      console.error('Follow transaction failed: ', e);
    } finally {
      // isUpdating will be set to false by the onSnapshot listener
    }
  };
  
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors">
      <Link href={`/${profile.username}`} className="flex items-center gap-3">
        <Avatar>
          <AvatarImage src={profile.photoURL} alt={profile.username} />
          <AvatarFallback>{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold">{profile.username}</p>
          <p className="text-sm text-muted-foreground">{profile.displayName}</p>
        </div>
      </Link>
      {currentUser && currentUser.uid !== profile.uid && (
        <Button size="sm" onClick={handleFollowToggle} disabled={isUpdating} variant={isFollowing ? 'outline' : 'default'}>
          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> :
            isFollowing ? <UserCheck className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />
          }
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      )}
    </div>
  );
}

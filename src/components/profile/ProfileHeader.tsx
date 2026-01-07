
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { doc, runTransaction, serverTimestamp, onSnapshot, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { Loader2, MessageSquare, UserCheck, UserPlus, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ProfileHeader({ profile, postCount }: { profile: UserProfile; postCount: number }) {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(true);
  const [followerCount, setFollowerCount] = useState(profile.followersCount);
  const [followingCount, setFollowingCount] = useState(profile.followingCount);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", profile.uid), (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            setFollowerCount(data.followersCount);
            setFollowingCount(data.followingCount);
        }
    });
    return () => unsub();
  }, [profile.uid]);

  useEffect(() => {
    if (!currentUser) {
        setIsUpdating(false);
        return;
    };
    setIsUpdating(true);
    const followRef = doc(db, `users/${currentUser.uid}/following`, profile.uid);
    const unsubscribe = onSnapshot(followRef, (doc) => {
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
        const currentFollowingCount = currentUserDoc.data().followingCount || 0;
        const targetFollowersCount = targetUserDoc.data().followersCount || 0;
        
        if (isCurrentlyFollowing) {
          transaction.delete(followingRef);
          transaction.delete(followerRef);
          transaction.update(currentUserRef, { followingCount: Math.max(0, currentFollowingCount - 1) });
          transaction.update(targetUserRef, { followersCount: Math.max(0, targetFollowersCount - 1) });
        } else {
          transaction.set(followingRef, { userId: profile.uid, createdAt: serverTimestamp() });
          transaction.set(followerRef, { userId: currentUser.uid, createdAt: serverTimestamp() });
          transaction.update(currentUserRef, { followingCount: currentFollowingCount + 1 });
          transaction.update(targetUserRef, { followersCount: targetFollowersCount + 1 });
          
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
    } catch (e) {
      console.error('Follow transaction failed: ', e);
    } 
  };

  const handleMessage = async () => {
    if (!currentUser) return;
    setIsCreatingChat(true);

    try {
      const chatsRef = collection(db, 'chats');
      const q = query(chatsRef, where('members', 'array-contains', currentUser.uid));
      const querySnapshot = await getDocs(q);
      
      let existingChatId: string | null = null;
      querySnapshot.forEach(doc => {
          if (doc.data().members.includes(profile.uid)) {
              existingChatId = doc.id;
          }
      });

      if (existingChatId) {
          router.push(`/messages/${existingChatId}`);
      } else {
          const newChatRef = await addDoc(chatsRef, {
              members: [currentUser.uid, profile.uid],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
          });
          router.push(`/messages/${newChatRef.id}`);
      }

    } catch (error) {
        console.error("Error creating or finding chat:", error);
    } finally {
        setIsCreatingChat(false);
    }
  };


  const isOwnProfile = currentUser?.uid === profile.uid;

  return (
    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 p-4 md:p-6 glass-card rounded-xl">
      <Avatar className="w-28 h-28 md:w-36 md:h-36 border-2 shadow-sm">
        <AvatarImage src={profile.photoURL} alt={profile.username} />
        <AvatarFallback>{profile.username.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="space-y-4 flex-1 text-center md:text-left">
        <div className="flex items-center gap-4 flex-wrap justify-center md:justify-start">
          <h1 className="text-2xl font-light">{profile.username}</h1>
          <div className="flex gap-2">
            {isOwnProfile ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile/edit">
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Profile
                </Link>
              </Button>
            ) : currentUser && (
              <>
                  <Button size="sm" onClick={handleFollowToggle} disabled={isUpdating}>
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : 
                      isFollowing ? <UserCheck className="h-4 w-4 mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />
                  }
                  {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleMessage} disabled={isCreatingChat}>
                      {isCreatingChat ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                      Message
                  </Button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-6 justify-center md:justify-start text-sm">
          <div><span className="font-semibold">{postCount}</span> posts</div>
          <Link href={`/${profile.username}/followers`} className="hover:underline">
            <span className="font-semibold">{followerCount}</span> followers
          </Link>
          <Link href={`/${profile.username}/following`} className="hover:underline">
            <span className="font-semibold">{followingCount}</span> following
          </Link>
        </div>
        <div>
          <h2 className="font-semibold">{profile.displayName}</h2>
          <p className="text-sm text-muted-foreground">{profile.bio}</p>
        </div>
      </div>
    </div>
  );
}

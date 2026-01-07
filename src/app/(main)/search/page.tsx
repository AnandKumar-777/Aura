
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { collection, query, where, getDocs, limit, orderBy, doc, runTransaction, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useSearchParams } from 'next/navigation';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialSearchTerm = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [results, setResults] = useState<UserProfile[]>([]);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  
  const performSearch = async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        orderBy('username'),
        where('username', '>=', term),
        where('username', '<=', term + '\uf8ff'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map((doc) => doc.data() as UserProfile).filter(p => p.uid !== user?.uid);
      setResults(users);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('followersCount', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const suggestedUsers = querySnapshot.docs
          .map((doc) => doc.data() as UserProfile)
          .filter(p => p.uid !== user?.uid);
        setSuggestions(suggestedUsers);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user && !initialSearchTerm) {
      fetchSuggestions();
    }
  }, [user, initialSearchTerm]);

  useEffect(() => {
    if (initialSearchTerm) {
      performSearch(initialSearchTerm);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearchTerm]);

  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    performSearch(term);
  }, 300);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    if (term.length > 0) {
      setLoading(true);
      debouncedSearch(term);
    } else {
        setResults([]);
    }
  };

  const usersToShow = searchTerm.length > 0 ? results : suggestions;

  return (
    <div className="space-y-6">
      <Input
        placeholder="Search for users..."
        value={searchTerm}
        onChange={handleSearchChange}
        className="text-base text-center placeholder:text-foreground/50"
      />
      {loading && <Loader2 className="mx-auto mt-4 h-6 w-6 animate-spin" />}
      
      {!loading && usersToShow.length > 0 && (
        <div className="space-y-4">
           {searchTerm.length === 0 && (
             <h2 className="text-lg font-semibold text-muted-foreground">Suggested for you</h2>
            )}
          <div className="space-y-2 glass-card p-2 rounded-xl">
            {usersToShow.map((profile) => (
              <UserSearchResult key={profile.uid} profile={profile} currentUserId={user?.uid} />
            ))}
          </div>
        </div>
      )}

      {!loading && searchTerm && results.length === 0 && (
        <p className="text-muted-foreground text-center pt-4">No users found for &quot;{searchTerm}&quot;.</p>
      )}
    </div>
  );
}

function UserSearchResult({ profile, currentUserId }: { profile: UserProfile; currentUserId?: string }) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(true);

  useEffect(() => {
    if (!currentUserId) {
        setIsUpdating(false);
        return;
    }
    const followDocRef = doc(db, `users/${currentUserId}/following`, profile.uid);
    const unsubscribe = onSnapshot(followDocRef, (doc) => {
      setIsFollowing(doc.exists());
      setIsUpdating(false);
    });
    return () => unsubscribe();
  }, [currentUserId, profile.uid]);

  const handleFollowToggle = async () => {
    if (!currentUserId || isUpdating) return;
    setIsUpdating(true);
    const currentUserRef = doc(db, 'users', currentUserId);
    const targetUserRef = doc(db, 'users', profile.uid);
    const followingRef = doc(db, `users/${currentUserId}/following`, profile.uid);
    const followerRef = doc(db, `users/${profile.uid}/followers`, currentUserId);

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
          transaction.set(followerRef, { userId: currentUserId, createdAt: serverTimestamp() });
          transaction.update(currentUserRef, { followingCount: currentUserDoc.data().followingCount + 1 });
          transaction.update(targetUserRef, { followersCount: targetUserDoc.data().followersCount + 1 });

          // Create notification
          const notificationRef = doc(collection(db, 'notifications', profile.uid, 'userNotifications'));
          transaction.set(notificationRef, {
            recipientId: profile.uid,
            senderId: currentUserId,
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
      {currentUserId && currentUserId !== profile.uid && (
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

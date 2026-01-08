
'use client';

import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { auth, db, fetchToken } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import FullScreenLoader from '@/components/shared/FullScreenLoader';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  unreadNotificationsCount: number;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  unreadNotificationsCount: 0,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleToken = async (currentUser: User) => {
        if ('serviceWorker' in navigator) {
            const token = await fetchToken();
            if (token) {
                // Save the token to Firestore
                const tokenRef = doc(db, 'fcmTokens', currentUser.uid);
                await setDoc(tokenRef, { token, updatedAt: serverTimestamp() });
            }
        }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        handleToken(user);
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        } else {
          // This case can happen if the user doc creation fails after signup
          // Or if the user is deleted from Firestore but not from Auth
          setUserProfile(null); 
        }
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
        setUnreadNotificationsCount(0);
        return;
    }
    const q = query(
        collection(db, `notifications/${user.uid}/userNotifications`),
        where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        setUnreadNotificationsCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (loading) return;
    
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');

    if (!user && !isAuthPage) {
      router.push('/login');
    } else if (user && isAuthPage) {
      router.push('/');
    }
  }, [user, loading, pathname, router]);


  if (loading) {
     const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
     if (!isAuthPage) {
       return <FullScreenLoader />;
     }
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, unreadNotificationsCount }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

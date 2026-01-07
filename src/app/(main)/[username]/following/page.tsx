
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { notFound } from 'next/navigation';
import UserList from '@/components/profile/UserList';
import { unstable_noStore as noStore } from 'next/cache';

async function getFollowing(username: string): Promise<UserProfile[]> {
  noStore();
  const usersRef = collection(db, 'users');
  const userQuery = query(usersRef, where('username', '==', username), limit(1));
  const userQuerySnapshot = await getDocs(userQuery);

  if (userQuerySnapshot.empty) {
    notFound();
  }
  const user = userQuerySnapshot.docs[0].data() as UserProfile;

  const followingRef = collection(db, `users/${user.uid}/following`);
  const followingSnapshot = await getDocs(followingRef);
  const followingIds = followingSnapshot.docs.map(doc => doc.id);

  if (followingIds.length === 0) {
    return [];
  }

  const followingProfilesQuery = query(usersRef, where('uid', 'in', followingIds));
  const followingProfilesSnapshot = await getDocs(followingProfilesQuery);

  return followingProfilesSnapshot.docs.map(doc => doc.data() as UserProfile);
}


export default async function FollowingPage({ params }: { params: { username: string } }) {
  const users = await getFollowing(params.username);
  
  return <UserList users={users} />;
}


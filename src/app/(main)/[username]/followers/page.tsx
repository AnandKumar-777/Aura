
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile } from '@/lib/types';
import { notFound } from 'next/navigation';
import UserList from '@/components/profile/UserList';
import { unstable_noStore as noStore } from 'next/cache';

async function getFollowers(username: string): Promise<UserProfile[]> {
  noStore();
  const usersRef = collection(db, 'users');
  const userQuery = query(usersRef, where('username', '==', username), limit(1));
  const userQuerySnapshot = await getDocs(userQuery);

  if (userQuerySnapshot.empty) {
    notFound();
  }
  const user = userQuerySnapshot.docs[0].data() as UserProfile;

  const followersRef = collection(db, `users/${user.uid}/followers`);
  const followersSnapshot = await getDocs(followersRef);
  const followerIds = followersSnapshot.docs.map(doc => doc.id);

  if (followerIds.length === 0) {
    return [];
  }

  const followerProfilesQuery = query(usersRef, where('uid', 'in', followerIds));
  const followerProfilesSnapshot = await getDocs(followerProfilesQuery);

  return followerProfilesSnapshot.docs.map(doc => doc.data() as UserProfile);
}


export default async function FollowersPage({ params }: { params: { username: string } }) {
  const users = await getFollowers(params.username);
  
  return <UserList users={users} />;
}


import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import type { UserProfile, Post } from '@/lib/types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import PostGrid from '@/components/profile/PostGrid';
import { unstable_noStore as noStore } from 'next/cache';

// Helper to convert Firestore Timestamps to serializable strings
const convertTimestamps = (obj: any) => {
    for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object' && obj[key].hasOwnProperty('seconds')) {
            // Check if it's a Firestore Timestamp-like object
            obj[key] = new Date(obj[key].seconds * 1000).toISOString();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            convertTimestamps(obj[key]);
        }
    }
    return obj;
};

async function getUserData(username: string): Promise<{profile: UserProfile | null, posts: Post[]}> {
    noStore();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { profile: null, posts: [] };
    }
    
    const userProfile = querySnapshot.docs[0].data() as UserProfile;

    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, where('authorId', '==', userProfile.uid), orderBy('createdAt', 'desc'));
    const postsSnapshot = await getDocs(postsQuery);

    const posts = postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Post[];
    
    // Convert timestamps before returning
    const serializableProfile = convertTimestamps(userProfile);
    const serializablePosts = posts.map(post => convertTimestamps(post));

    return { profile: serializableProfile, posts: serializablePosts };
}


export default async function ProfilePage({ params }: { params: { username: string } }) {
    const { profile, posts } = await getUserData(params.username);

    if (!profile) {
        notFound();
    }

    return (
        <div className="space-y-8">
            <ProfileHeader profile={profile} postCount={posts.length} />
            <PostGrid posts={posts} />
        </div>
    );
}

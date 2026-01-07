
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';
import { db } from '@/lib/firebase';
import type { Post } from '@/lib/types';
import PostView from '@/components/posts/PostView';
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

async function getPostData(postId: string) {
    noStore();
    const postRef = doc(db, 'posts', postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
        return null;
    }
    const post = { id: postSnap.id, ...postSnap.data() } as Post;
    return convertTimestamps(post);
}

export default async function PostPage({ params }: { params: { postId: string } }) {
    const post = await getPostData(params.postId);

    if (!post) {
        notFound();
    }
    
    return (
        <div className="max-w-4xl mx-auto md:-m-4">
             <div className="border rounded-lg overflow-hidden h-[calc(100vh-5rem)] max-h-[700px]">
                <PostView post={post} />
            </div>
        </div>
    );
}

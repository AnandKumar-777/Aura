
'use client';

import type { Post } from '@/lib/types';
import Image from 'next/image';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import PostView from '@/components/posts/PostView';
import { useState } from 'react';
import { MessageCircle, Camera, FileText } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

export default function PostGrid({ posts }: { posts: Post[] }) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  if (posts.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-20 flex flex-col items-center glass-card rounded-xl">
        <div className="w-24 h-24 rounded-full border-2 border-dashed border-muted flex items-center justify-center mb-4">
            <Camera className="w-10 h-10 text-muted-foreground" />
        </div>
        <h3 className="text-2xl font-semibold">No Posts Yet</h3>
        <p className="text-muted-foreground mb-4">Share your first post with the community.</p>
        <Button asChild>
            <Link href="/create">Create Post</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1 md:gap-2">
        {posts.map((post) => (
          <Dialog key={post.id} onOpenChange={(open) => !open && setSelectedPost(null)}>
            <DialogTrigger asChild>
              <div
                onClick={() => setSelectedPost(post)}
                className="relative aspect-square cursor-pointer group rounded-md overflow-hidden bg-muted/20"
              >
                {post.imageUrl ? (
                  <>
                    <Image src={post.imageUrl} alt={post.caption} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="text-white flex items-center gap-2 font-bold text-lg">
                            <MessageCircle />
                            <span>{post.commentCount}</span>
                        </div>
                    </div>
                  </>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                        <FileText className="w-8 h-8 text-foreground/50"/>
                    </div>
                )}
              </div>
            </DialogTrigger>
          </Dialog>
        ))}
      </div>
      {selectedPost && (
         <Dialog open={!!selectedPost} onOpenChange={(open) => !open && setSelectedPost(null)}>
            <DialogContent className={cn(
              "p-0 border-0 !rounded-lg",
              selectedPost.imageUrl ? "max-w-4xl w-full h-[90vh] max-h-[700px] flex" : "max-w-md w-full"
            )}>
                 <PostView post={selectedPost} />
            </DialogContent>
         </Dialog>
      )}
    </>
  );
}

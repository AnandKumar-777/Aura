
'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { zodResolver } from '@hookform/resolvers/zod';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

const postSchema = z.object({
  caption: z.string().min(1, "Post content cannot be empty.").max(2200, "Post is too long."),
});

export default function CreatePage() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      caption: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof postSchema>) => {
    if (!user || !userProfile) {
      toast({ variant: "destructive", title: "You must be logged in to create a post." });
      return;
    }

    setIsSubmitting(true);
    try {
        await addDoc(collection(db, 'posts'), {
            authorId: user.uid,
            caption: values.caption,
            likeCount: 0,
            commentCount: 0,
            createdAt: serverTimestamp(),
        });

        toast({ title: "Post created successfully!" });
        router.push(`/${userProfile.username}`); 
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Error creating post", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-headline font-bold mb-4">Create New Post</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
                control={form.control}
                name="caption"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                        <Textarea placeholder="What's on your mind?" {...field} rows={6} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Share
            </Button>
        </form>
      </Form>
    </div>
  );
}

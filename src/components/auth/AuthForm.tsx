
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';

const formSchema = z.object({
  username: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

const signupSchema = formSchema.extend({
  username: z.string().min(3, 'Username must be at least 3 characters.').max(20, 'Username must be less than 20 characters.'),
});

interface AuthFormProps {
  type: 'login' | 'signup';
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function AuthForm({ type }: AuthFormProps) {
  const isLogin = type === 'login';
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(isLogin ? formSchema : signupSchema),
    defaultValues: isLogin ? {
      email: '',
      password: '',
    } : {
      username: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, values.email, values.password);
        router.push('/');
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          values.email,
          values.password
        );
        
        await sleep(1000);

        if (values.username) {
            const usernameDoc = await getDoc(doc(db, "usernames", values.username));
            if (usernameDoc.exists()) {
                form.setError("username", { type: "manual", message: "Username is already taken." });
                setIsLoading(false);
                return;
            }
        }
        
        const user = userCredential.user;

        const userProfile = {
          uid: user.uid,
          email: user.email,
          username: values.username,
          displayName: values.username,
          bio: '',
          photoURL: `https://picsum.photos/seed/${user.uid}/200`,
          followersCount: 0,
          followingCount: 0,
          createdAt: serverTimestamp(),
        };

        const batch = writeBatch(db);
        batch.set(doc(db, 'users', user.uid), userProfile);
        batch.set(doc(db, 'usernames', values.username!), { uid: user.uid });
        await batch.commit();

        router.push('/');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 glass-card p-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {!isLogin && (
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="gocheeta" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="user@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLogin ? 'Log In' : 'Sign Up'}
          </Button>
        </form>
      </Form>
      <div className="text-center text-sm text-muted-foreground">
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <Button variant="link" asChild className="p-0 h-auto">
          <Link href={isLogin ? '/signup' : '/login'}>
            {isLogin ? 'Sign Up' : 'Log In'}
          </Link>
        </Button>
      </div>
    </div>
  );
}

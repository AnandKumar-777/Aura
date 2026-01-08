
'use client';

import { useAuth } from '@/context/AuthContext';
import { notFound, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, updateDoc } from 'firebase/firestore';
import { db, uploadFile } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, User, Lock, MessageSquare, AtSign, UserX, HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const profileSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(50),
  bio: z.string().max(150, 'Bio must be 150 characters or less').optional(),
  photo: z.instanceof(File).optional(),
  isPrivate: z.boolean().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      bio: '',
      isPrivate: false,
    },
  });

  useEffect(() => {
    if (!loading && userProfile) {
      form.reset({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        isPrivate: userProfile.isPrivate || false,
      });
      setPreview(userProfile.photoURL);
    }
  }, [userProfile, loading, form]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user || !userProfile) {
    notFound();
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('photo', file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    try {
      let photoURL = userProfile.photoURL;

      if (data.photo) {
        const imageFile = data.photo;
        const folder = `profilePictures/${user.uid}`;
        const fileName = 'profile.jpg'; // Overwrite the same file
        photoURL = await uploadFile(imageFile, folder, 2); // Max 2MB for profile pics
      }
      
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        displayName: data.displayName,
        bio: data.bio,
        photoURL: photoURL,
        isPrivate: data.isPrivate,
      });

      toast({ title: 'Profile updated successfully!' });
      router.push(`/${userProfile.username}`);
      router.refresh(); // Force refresh to show updated data

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error updating profile',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const settingsItems = [
      { icon: User, text: 'Personal Details', content: 'Manage your personal information.'},
      { icon: Lock, text: 'Password and security', content: 'Change your password and manage security settings.'},
      { icon: MessageSquare, text: 'Comments', content: 'View and manage posts you have commented on.'},
      { icon: AtSign, text: 'Tag and Mention', content: 'Manage who can tag and mention you.'},
      { icon: UserX, text: 'Muted/blocked Account', content: 'Manage accounts you have muted or blocked.'},
      { icon: HelpCircle, text: 'Help', content: 'Get help with Aura.'},
  ]

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-headline font-bold mb-6">Edit Profile</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={preview || userProfile.photoURL} />
              <AvatarFallback>{userProfile.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{userProfile.username}</h2>
              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary cursor-pointer hover:underline">
                      Change profile photo
                      <FormControl>
                        <Input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                      </FormControl>
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="displayName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Your display name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bio</FormLabel>
                <FormControl>
                  <Textarea placeholder="A little bit about yourself" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Separator />
          
          <div className="space-y-4">
             <h2 className="text-lg font-semibold">Additional Settings</h2>
             <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="account-type">
                    <AccordionTrigger>
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5"/> Account type and tools
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                       <FormField
                        control={form.control}
                        name="isPrivate"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                Private Account
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                When your account is private, only people you approve can see your photos and videos.
                                </p>
                            </div>
                            <FormControl>
                                <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            </FormItem>
                        )}
                        />
                    </AccordionContent>
                </AccordionItem>

                {settingsItems.map(item => (
                     <AccordionItem value={item.text} key={item.text}>
                        <AccordionTrigger>
                            <div className="flex items-center gap-3">
                                <item.icon className="h-5 w-5"/> {item.text}
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           {item.content}
                        </AccordionContent>
                    </AccordionItem>
                ))}

             </Accordion>
          </div>


          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </Form>
    </div>
  );
}

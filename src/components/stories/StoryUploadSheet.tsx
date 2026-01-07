
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { Loader2, Type } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Textarea } from '../ui/textarea';

export function StoryUploadSheet({ open, onOpenChange, children }: { open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [textContent, setTextContent] = useState('');

  const handleClose = () => {
    setTextContent('');
    setIsSubmitting(false);
    onOpenChange(false);
  }

  const handleSubmit = async () => {
    if (!user || !textContent.trim()) {
      toast({ variant: "destructive", title: "You must be logged in and write something for your story." });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const createdAt = Timestamp.now();
      const expiresAt = new Timestamp(createdAt.seconds + 24 * 60 * 60, createdAt.nanoseconds);

      await addDoc(collection(db, 'stories'), {
        authorId: user.uid,
        textContent,
        createdAt,
        expiresAt,
      });

      toast({ title: "Story uploaded successfully!" });
      handleClose();

    } catch (error: any) {
      toast({ variant: 'destructive', title: "Error uploading story", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
        else onOpenChange(true);
    }}>
      {children}
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add to your story</SheetTitle>
          <SheetDescription>
            Your story will be visible for 24 hours.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 space-y-4">
           <div className="w-full aspect-video border-2 border-dashed rounded-lg flex items-center justify-center relative bg-muted/20">
                <Textarea
                    placeholder="Start typing..."
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="bg-transparent border-0 focus-visible:ring-0 h-full text-center flex items-center justify-center text-lg"
                />
            </div>
            
            <Button onClick={handleSubmit} disabled={isSubmitting || !textContent.trim()} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Share to Story
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

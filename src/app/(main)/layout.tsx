
'use client';

import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Home, Search, PlusSquare, MessageSquare } from 'lucide-react';

function DesktopNav() {
  return (
    <div className="hidden md:flex flex-col items-center space-y-2 fixed bottom-6 right-6 z-40">
        <Button variant="ghost" size="icon" asChild className="text-foreground/80 hover:text-foreground bg-background/50 backdrop-blur-sm border border-border h-12 w-12 rounded-full hover:bg-accent">
            <Link href="/"><Home className="h-6 w-6" /></Link>
        </Button>
        <Button variant="ghost" size="icon" asChild className="text-foreground/80 hover:text-foreground bg-background/50 backdrop-blur-sm border border-border h-12 w-12 rounded-full hover:bg-accent">
            <Link href="/search"><Search className="h-6 w-6" /></Link>
        </Button>
        <Button variant="ghost" size="icon" asChild className="text-foreground/80 hover:text-foreground bg-background/50 backdrop-blur-sm border border-border h-12 w-12 rounded-full hover:bg-accent">
            <Link href="/create"><PlusSquare className="h-6 w-6" /></Link>
        </Button>
        <Button variant="ghost" size="icon" asChild className="text-foreground/80 hover:text-foreground bg-background/50 backdrop-blur-sm border border-border h-12 w-12 rounded-full hover:bg-accent">
            <Link href="/messages"><MessageSquare className="h-6 w-6" /></Link>
        </Button>
    </div>
  )
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Don't apply padding for full-screen chat on desktop
  const isChatPage = /^\/messages\/[a-zA-Z0-9]+$/.test(pathname);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className={cn(
        "flex-1 w-full max-w-4xl mx-auto py-4 px-4 sm:px-6 lg:px-8 pb-24 md:pb-4",
        isChatPage && "p-0 sm:p-0 lg:p-0 max-w-none"
      )}>
        {children}
      </main>
      <BottomNav />
      <DesktopNav />
    </div>
  );
}

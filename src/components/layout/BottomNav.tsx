
'use client';

import { useAuth } from '@/context/AuthContext';
import { Home, PlusSquare, Search, User, Bell, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

export default function BottomNav() {
  const { userProfile, unreadNotificationsCount } = useAuth();
  const pathname = usePathname();

  if (!userProfile) return null;

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/create', icon: PlusSquare, label: 'Create' },
    { href: '/messages', icon: MessageSquare, label: 'Messages' },
    { href: '/notifications', icon: Bell, label: 'Notifications' },
    { href: `/${userProfile.username}`, icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Button
              key={item.label}
              variant="ghost"
              asChild
              className={cn(
                'flex flex-col h-auto p-2 relative rounded-lg w-14 h-14 text-foreground/70',
                isActive && 'text-primary bg-accent'
              )}
            >
              <Link href={item.href}>
                <item.icon className="h-6 w-6" />
                {item.label === 'Notifications' && unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </span>
                )}
                <span className="sr-only">{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}

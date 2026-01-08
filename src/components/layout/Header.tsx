
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { signOut } from 'firebase/auth';
import { LogOut, User, Bell, Settings } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { auth } from '@/lib/firebase';
import { Badge } from '@/components/ui/badge';

export default function Header() {
  const { user, userProfile, unreadNotificationsCount } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between max-w-5xl mx-auto px-4">
        {/* Left placeholder for spacing */}
        <div className="w-24"></div> 
        
        {/* Centered Logo */}
        <div className="flex-1 flex justify-center">
            <Link href="/" className="flex flex-col items-center">
                <span className="font-bold font-headline text-2xl text-white tracking-[0.3em]" style={{ textShadow: '0 0 8px rgba(255,255,255,0.5)' }}>AURA</span>
                <span className="text-xs text-muted-foreground -mt-1 uppercase tracking-widest" style={{ textShadow: '0 0 8px rgba(255,255,255,0.3)' }}>BY ANAND</span>
            </Link>
        </div>

        {/* Right-aligned user menu and notifications */}
        <div className="flex items-center justify-end space-x-1 sm:space-x-2 w-24">
           <Button variant="ghost" size="icon" asChild className="relative text-foreground/80 hover:text-foreground hover:bg-accent hidden md:flex">
            <Link href="/notifications">
                <Bell />
                {unreadNotificationsCount > 0 && (
                    <Badge variant="destructive" className="absolute top-1 right-1 h-4 w-4 p-0 flex items-center justify-center text-xs animate-pulse">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                    </Badge>
                )}
            </Link>
            </Button>
          {user && userProfile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-accent focus-visible:ring-primary/50 group">
                  <Avatar className="h-9 w-9 border-2 border-transparent group-hover:border-primary/50 transition-colors">
                    <AvatarImage src={userProfile.photoURL} alt={userProfile.username} />
                    <AvatarFallback className="bg-muted">
                      {userProfile.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass-card" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{userProfile.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      @{userProfile.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/${userProfile.username}`}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                  <Link href="/notifications" className="flex items-center md:hidden">
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Notifications</span>
                    {unreadNotificationsCount > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                            {unreadNotificationsCount}
                        </Badge>
                    )}
                  </Link>
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href="/profile/edit">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

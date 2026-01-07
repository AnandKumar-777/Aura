import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'AURA',
  description: 'A calm space to share your moments.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={cn(inter.variable, "font-body antialiased")}>
        <AuthProvider>
           <div className="fixed top-0 left-0 h-full w-full bg-background z-[-1]">
            <div className="stars stars-sm" />
            <div className="stars stars-md" />
            <div className="stars stars-lg" />
          </div>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}

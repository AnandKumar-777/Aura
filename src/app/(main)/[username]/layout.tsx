
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ProfileSubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { username: string };
}) {
  return (
    <div>
        <div className="flex items-center gap-4 mb-4">
            <Button asChild variant="ghost" size="icon">
                <Link href={`/${params.username}`}>
                    <ArrowLeft />
                </Link>
            </Button>
            <h1 className="text-xl font-bold">{params.username}</h1>
        </div>
        {children}
    </div>
  );
}

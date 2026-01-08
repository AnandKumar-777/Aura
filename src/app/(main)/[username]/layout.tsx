import React from "react";

type LayoutProps = {
  params: Promise<{
    username: string;
  }>;
  children: React.ReactNode;
};

export default async function UserLayout({ params, children }: LayoutProps) {
  await params; // ensures Next.js 15 async params compliance
  return <>{children}</>;
}

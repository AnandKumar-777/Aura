import React from "react";

type LayoutProps = {
  params: Promise<{
    username: string;
  }>;
  children: React.ReactNode;
};

export default async function UserLayout({ params, children }: LayoutProps) {
  const { username } = await params;

  return (
    <div>
      {/* optional: username context */}
      {children}
    </div>
  );
}

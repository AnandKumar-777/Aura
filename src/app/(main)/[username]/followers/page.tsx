type PageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function FollowersPage({ params }: PageProps) {
  const { username } = await params;

  return (
    <div>
      Followers of {username}
    </div>
  );
}

type PageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;

  return (
    <div>
      Profile of {username}
    </div>
  );
}
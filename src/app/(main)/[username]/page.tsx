type PageProps = {
    params: Promise<{
      username: string;
    }>;
  };
  
  export default async function FollowingPage({ params }: PageProps) {
    const { username } = await params;
  
    return (
      <div>
        Following of {username}
      </div>
    );
  }
  
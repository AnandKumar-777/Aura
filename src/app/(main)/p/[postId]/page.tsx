type PageProps = {
    params: Promise<{
      postId: string;
    }>;
  };
  
  export default async function PostPage({ params }: PageProps) {
    const { postId } = await params;
  
    return (
      <div>
        Post ID: {postId}
      </div>
    );
  }
  
type ProfilePostsPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProfilePostsPage({ params }: ProfilePostsPageProps) {
  const { handle } = await params;
  return <main>@{handle} Posts</main>;
}

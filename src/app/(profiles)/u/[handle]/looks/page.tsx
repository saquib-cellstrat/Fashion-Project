type ProfileLooksPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProfileLooksPage({ params }: ProfileLooksPageProps) {
  const { handle } = await params;
  return <main>@{handle} Looks</main>;
}

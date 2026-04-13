type ProfileSavedPageProps = {
  params: Promise<{ handle: string }>;
};

export default async function ProfileSavedPage({ params }: ProfileSavedPageProps) {
  const { handle } = await params;
  return <main>@{handle} Saved Hairstyles</main>;
}

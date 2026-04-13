type EditorSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function EditorSessionPage({ params }: EditorSessionPageProps) {
  const { sessionId } = await params;
  return <main>Editor Session {sessionId}</main>;
}

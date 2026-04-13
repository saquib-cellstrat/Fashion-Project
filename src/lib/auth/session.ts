export type Session = {
  userId: string;
  email: string;
};

export async function getCurrentSession() {
  return null as Session | null;
}

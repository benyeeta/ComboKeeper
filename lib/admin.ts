import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";

export async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const currentUser = sessionCookie ? await decrypt(sessionCookie) : null;

  if (!currentUser) {
    return { authorized: false as const, error: "You must be logged in.", currentUser: null };
  }

  const isAdmin = Boolean(
    process.env.ADMIN_OSU_ID && currentUser.id === Number(process.env.ADMIN_OSU_ID)
  );

  if (!isAdmin) {
    return { authorized: false as const, error: "Forbidden.", currentUser };
  }

  return { authorized: true as const, error: null, currentUser };
}

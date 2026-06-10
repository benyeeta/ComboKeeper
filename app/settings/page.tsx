import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { decrypt } from "@/lib/session";
import ThemeSelect from "@/components/ThemeSelect";
import { Suspense } from "react";

async function updatePrivacy(formData: FormData) {
  "use server";
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  const userSession = sessionCookie ? await decrypt(sessionCookie) : null;
  if (!userSession) throw new Error("Unauthorized");

  const isPublic = formData.get("isPublicProfile") === "on";
  const userId = parseInt(formData.get("userId") as string, 10);
  if (userId !== userSession.id) throw new Error("Forbidden");

  await prisma.player.update({
    where: { id: userSession.id },
    data: { isPublicProfile: isPublic }
  });

  revalidatePath("/settings");
  revalidatePath("/profile");
}

async function updateTheme(formData: FormData) {
  "use server";
  const newTheme = formData.get("theme") as string;
  const cookieStore = await cookies();
  cookieStore.set("theme", newTheme, { path: "/" });
  revalidatePath("/", "layout"); // Re-render the layout immediately
}

async function SettingsContent() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (!sessionCookie) redirect("/api/auth/login");
  
  const userSession = await decrypt(sessionCookie);
  if (!userSession) redirect("/api/auth/login");

  const player = await prisma.player.findUnique({
    where: { id: userSession.id }
  });

  if (!player) return <div className="p-8 text-white">Player not found in database.</div>;

  const theme = cookieStore.get("theme")?.value || "dark";

  return (
    <div className="max-w-3xl mx-auto mt-8 text-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
          <h2 className="text-xl font-semibold mb-4">Appearance</h2>
          <ThemeSelect currentTheme={theme} updateTheme={updateTheme} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200">
          <h2 className="text-xl font-semibold mb-4">Privacy</h2>
        
          <form action={updatePrivacy} className="space-y-4">
            <input type="hidden" name="userId" value={player.id} />
            <div className="flex items-start gap-3">
              <div className="flex items-center h-5">
                <input
                  id="isPublicProfile"
                  name="isPublicProfile"
                  type="checkbox"
                  defaultChecked={player.isPublicProfile}
                  className="w-4 h-4 text-pink-600 bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600 rounded focus:ring-pink-500 focus:ring-offset-white dark:focus:ring-offset-gray-800"
                />
              </div>
              <div className="flex flex-col">
                <label htmlFor="isPublicProfile" className="text-sm font-medium text-gray-900 dark:text-white">Public Profile</label>
                <p className="text-sm text-gray-500 dark:text-gray-400">When enabled, your profile and historical stats are visible to everyone. When disabled, your profile is hidden from the public, but your scores in the team dashboard will always be visible to your teammates.</p>
              </div>
            </div>
          
            <button type="submit" className="mt-4 bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded transition-colors text-sm">Save Changes</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center mt-24 text-gray-500">
        <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-lg font-medium">Loading Settings...</p>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

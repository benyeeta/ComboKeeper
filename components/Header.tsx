import Link from 'next/link';
import { cookies } from 'next/headers';
import UserDropdown from '@/components/UserDropdown';
import NotificationBell from '@/components/NotificationBell';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/session';
import NavLinks from '@/components/NavLinks';
import MobileNav from '@/components/MobileNav';
import FeedbackModal from '@/components/FeedbackModal';

export async function Header() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  let user = null;
  let notifications: any[] = [];

  if (sessionCookie) {
    try {
      user = await decrypt(sessionCookie);
      if (user && prisma.notification) {
        notifications = await prisma.notification.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 10
        });
      }
    } catch (e) {
      console.error("Failed to parse session", e);
    }
  }

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3 md:gap-8">
          <MobileNav />
          <Link href="/" className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Combo<span className="text-pink-500">Keeper</span>
          </Link>
          <NavLinks />
        </div>
        <div className="flex items-center gap-4">
          {user && process.env.ADMIN_OSU_ID && user.id === Number(process.env.ADMIN_OSU_ID) && (
            <Link
              href="/admin/feedback"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Feedback Admin
            </Link>
          )}
          <FeedbackModal />
          {user ? (
            <>
              <NotificationBell initialNotifications={notifications} />
              <UserDropdown user={user} />
            </>
          ) : (
            <a
              href="/api/auth/login"
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors"
            >
              Login with osu!
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
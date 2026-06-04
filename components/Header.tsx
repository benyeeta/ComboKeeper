import Link from 'next/link';
import { cookies } from 'next/headers';
import UserDropdown from '@/components/UserDropdown';
import NotificationBell from '@/components/NotificationBell';
import prisma from '@/lib/prisma';
import { decrypt } from '@/lib/session';

const navItems = [
  { name: 'Dashboard', href: '/' },
];

export async function Header() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  let user = null;
  let notifications: any[] = [];

  if (sessionCookie) {
    try {
      user = await decrypt(sessionCookie);
      if (prisma.notification) {
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
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Combo<span className="text-pink-500">Keeper</span>
        </Link>
        <nav className="hidden md:flex items-center gap-4">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
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
    </header>
  );
}
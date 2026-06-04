"use client";

import { useState, useRef, useEffect } from "react";
import { markNotificationsAsRead, acceptInvite, rejectInvite } from "@/app/actions";

export default function NotificationBell({ initialNotifications }: { initialNotifications: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      const unreadInfo = notifications.filter(n => !n.isRead && n.type !== "TEAM_INVITE");
      if (unreadInfo.length > 0) {
        setNotifications(notifications.map(n => n.type !== "TEAM_INVITE" ? { ...n, isRead: true } : n));
        await markNotificationsAsRead();
      }
    }
  };

  const handleAccept = async (nId: string, teamId: string) => {
    setNotifications(notifications.map(n => n.id === nId ? { ...n, isRead: true, type: "INFO", message: "You accepted the team invitation." } : n));
    await acceptInvite(nId, teamId);
  };

  const handleReject = async (nId: string, teamId: string) => {
    setNotifications(notifications.map(n => n.id === nId ? { ...n, isRead: true, type: "INFO", message: "You declined the team invitation." } : n));
    await rejectInvite(nId, teamId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleOpen}
        className="relative p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-pink-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl py-2 z-50 max-h-96 overflow-y-auto">
          <h3 className="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">Notifications</h3>
          {notifications.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-500">No notifications yet.</p>
          ) : (
            <div className="flex flex-col">
              {notifications.map((n) => (
                <div key={n.id} className={`px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${n.isRead ? 'opacity-70' : 'bg-gray-50 dark:bg-gray-700/20'}`}>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                  <span className="text-xs text-gray-500 mt-1 block">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                  {n.type === "TEAM_INVITE" && !n.isRead && n.teamId && (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => handleAccept(n.id, n.teamId)} className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors">Accept</button>
                      <button onClick={() => handleReject(n.id, n.teamId)} className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-1.5 px-3 rounded transition-colors">Decline</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
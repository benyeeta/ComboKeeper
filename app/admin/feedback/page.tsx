import { verifyAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";
import { formatFeedbackForCursor } from "@/lib/feedbackExport";
import FeedbackAdmin from "@/components/FeedbackAdmin";
import { redirect } from "next/navigation";
import { Suspense } from "react";

async function FeedbackAdminContent() {
  const auth = await verifyAdmin();
  if (!auth.authorized) redirect("/");

  const items = await prisma.feedback.findMany({
    orderBy: { createdAt: "desc" },
  });

  const pendingItems = items
    .filter((item) => item.status === "PENDING")
    .slice()
    .reverse();

  return (
    <div className="max-w-4xl mx-auto mt-8 px-4 text-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-2">Feedback</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
        Review submissions, mark them done, and copy a compiled list into Cursor.
      </p>
      <FeedbackAdmin
        initialItems={items}
        initialMarkdown={formatFeedbackForCursor(pendingItems)}
      />
    </div>
  );
}

export default function FeedbackAdminPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center mt-24 text-gray-500">
          <div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-lg font-medium">Loading feedback...</p>
        </div>
      }
    >
      <FeedbackAdminContent />
    </Suspense>
  );
}

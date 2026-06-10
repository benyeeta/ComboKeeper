import { verifyAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";
import { formatFeedbackForCursor } from "@/lib/feedbackExport";
import FeedbackAdmin from "@/components/FeedbackAdmin";
import { redirect } from "next/navigation";

export default async function FeedbackAdminPage() {
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

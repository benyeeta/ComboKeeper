type FeedbackItem = {
  id: string;
  type: string;
  message: string;
  username: string | null;
  hasImage: boolean;
  createdAt: Date;
  status: string;
};

const TYPE_LABELS: Record<string, string> = {
  Bug: "Bug Reports",
  Suggestion: "Feature Suggestions",
  Other: "Other",
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatFeedbackForCursor(items: FeedbackItem[]) {
  if (items.length === 0) {
    return "No pending feedback items.";
  }

  const grouped = new Map<string, FeedbackItem[]>();
  for (const item of items) {
    const group = grouped.get(item.type) ?? [];
    group.push(item);
    grouped.set(item.type, group);
  }

  const lines = [
    "Please triage and implement the following ComboKeeper user feedback:",
    "",
  ];

  let index = 1;
  for (const type of ["Bug", "Suggestion", "Other"]) {
    const group = grouped.get(type);
    if (!group?.length) continue;

    lines.push(`## ${TYPE_LABELS[type] ?? type}`);
    lines.push("");

    for (const item of group) {
      const author = item.username ?? "Anonymous";
      const screenshot = item.hasImage ? " (screenshot attached in Discord)" : "";
      lines.push(
        `${index}. [${item.type.toUpperCase()}] ${item.message}${screenshot}`,
      );
      lines.push(`   - Submitted by ${author} on ${formatDate(item.createdAt)}`);
      lines.push("");
      index += 1;
    }
  }

  return lines.join("\n").trimEnd();
}

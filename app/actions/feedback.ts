'use server';

import prisma from '@/lib/prisma';
import { verifyAdmin } from '@/lib/admin';
import { formatFeedbackForCursor } from '@/lib/feedbackExport';
import { revalidatePath } from 'next/cache';

export async function getFeedbackItems(status: 'PENDING' | 'ALL' = 'PENDING') {
  const auth = await verifyAdmin();
  if (!auth.authorized) return { error: auth.error };

  const items = await prisma.feedback.findMany({
    where: status === 'ALL' ? undefined : { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });

  return { items };
}

export async function exportFeedbackMarkdown(status: 'PENDING' | 'ALL' = 'PENDING') {
  const auth = await verifyAdmin();
  if (!auth.authorized) return { error: auth.error };

  const items = await prisma.feedback.findMany({
    where: status === 'ALL' ? undefined : { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  });

  return { markdown: formatFeedbackForCursor(items) };
}

export async function updateFeedbackStatus(id: string, status: 'PENDING' | 'DONE' | 'DISMISSED') {
  const auth = await verifyAdmin();
  if (!auth.authorized) return { error: auth.error };

  await prisma.feedback.update({
    where: { id },
    data: { status },
  });

  revalidatePath('/admin/feedback');
  return { success: true };
}

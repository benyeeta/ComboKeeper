'use server';

// Import your database and auth instances here
// import { db } from '@/lib/db';
// import { auth } from '@/lib/auth';

export async function saveScoresToDatabase(scores: any[]) {
  // 1. Authenticate user
  // const session = await auth();
  // if (!session) throw new Error("Unauthorized");

  if (!Array.isArray(scores) || scores.length === 0) {
    return { success: false, message: 'No scores provided' };
  }

  try {
    // 2. Insert into your database
    // await db.score.createMany({
    //   data: scores.map(s => ({ ... })),
    //   skipDuplicates: true
    // });

    console.log(`Successfully received ${scores.length} scores on the backend!`);
    return { success: true, count: scores.length };
  } catch (error) {
    console.error('Failed to save scores:', error);
    throw new Error('Failed to save scores to the database');
  }
}

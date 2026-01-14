import { db } from "@/db";
import { subjects, topics } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function findOrCreateSubject(name: string): Promise<string | null> {
  if (!name) return null;

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Check if exists
  const [existing] = await db
    .select()
    .from(subjects)
    .where(sql`LOWER(${subjects.slug}) = LOWER(${slug})`)
    .limit(1);

  if (existing) return existing.id;

  // Create new
  const [newSubject] = await db
    .insert(subjects)
    .values({ name, slug })
    .returning();

  return newSubject.id;
}

export async function findOrCreateTopic(name: string, subjectId: string): Promise<string | null> {
  if (!name || !subjectId) return null;

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Check if exists
  const [existing] = await db
    .select()
    .from(topics)
    .where(
      sql`LOWER(${topics.slug}) = LOWER(${slug}) AND ${topics.subjectId} = ${subjectId}`
    )
    .limit(1);

  if (existing) {
    // Increment scan count
    await db
      .update(topics)
      .set({ scanCount: sql`${topics.scanCount} + 1` })
      .where(eq(topics.id, existing.id));

    return existing.id;
  }

  // Create new
  const [newTopic] = await db
    .insert(topics)
    .values({ name, slug, subjectId })
    .returning();

  return newTopic.id;
}

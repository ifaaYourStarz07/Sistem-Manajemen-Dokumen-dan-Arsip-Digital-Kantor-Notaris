import db from '../db/index.ts';

export function logActivity(
  userId: number | null,
  aksi: string,
  entitas: string,
  entitasId: number | null,
  detail: string
): void {
  try {
    db.prepare(`
      INSERT INTO activity_logs (user_id, aksi, entitas, entitas_id, detail)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, aksi, entitas, entitasId, detail);
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}

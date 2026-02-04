import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { serializeTask, ok, err } from '@/lib/apiHelpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { creator } = body;
    if (!creator) return err('creator is required');

    const task = store.cancelTask(id, creator);
    if (!task) return err('Task not found, not owned by creator, or not in open state', 400);

    return ok(serializeTask(task));
  } catch {
    return err('Invalid request body', 400);
  }
}

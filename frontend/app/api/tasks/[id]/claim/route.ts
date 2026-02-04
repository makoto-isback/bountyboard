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
    const { claimer } = body;
    if (!claimer) return err('claimer is required');

    const task = store.claimTask(id, claimer);
    if (!task) return err('Task not found or not available for claiming', 400);

    return ok(serializeTask(task));
  } catch {
    return err('Invalid request body', 400);
  }
}

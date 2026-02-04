import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { serializeTask, ok, err } from '@/lib/apiHelpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = store.getTask(id);
  if (!task) return err('Task not found', 404);
  return ok(serializeTask(task));
}

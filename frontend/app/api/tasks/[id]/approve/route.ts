import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { serializeTask, ok, err } from '@/lib/apiHelpers';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = store.approveTask(id);
  if (!task) return err('Task not found or not in submitted state', 400);
  return ok(serializeTask(task));
}

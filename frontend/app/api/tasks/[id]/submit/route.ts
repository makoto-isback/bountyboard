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
    const { proof_url, proof_hash, note } = body;

    if (!proof_url && !proof_hash && !note) {
      return err('At least one of proof_url, proof_hash, or note is required');
    }

    const task = store.submitWork(id, { proof_url, proof_hash, note });
    if (!task) return err('Task not found or not in claimed state', 400);

    return ok(serializeTask(task));
  } catch {
    return err('Invalid request body', 400);
  }
}

import { NextRequest } from 'next/server';
import { ok, err } from '@/lib/apiHelpers';

/**
 * POST /api/tasks/:id/claim-expired
 *
 * Returns the unsigned transaction for auto-releasing expired escrow.
 * Anyone can call this after 48h of submission without approval.
 *
 * Body: { caller: string }
 *
 * Note: The actual transaction must be signed client-side.
 * This endpoint validates eligibility and returns instructions.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { caller } = body;

    if (!caller) return err('caller wallet address is required');

    // Return instruction metadata for client-side transaction building
    return ok({
      task_id: parseInt(id),
      instruction: 'ClaimExpired',
      caller,
      description: 'Auto-release escrow to worker after 48h timeout. Transaction must be signed client-side.',
      timeout_hours: 48,
    });
  } catch {
    return err('Invalid request body', 400);
  }
}

import { store } from '@/lib/store';
import { ok } from '@/lib/apiHelpers';

export async function GET() {
  return ok(store.getStats());
}

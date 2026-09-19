import type { NextRequest } from 'next/server';
import { readSession } from '@/lib/access';
import { logUpsellEvent } from '@/lib/upsell';

/**
 * The outcomes the sheet reports back: dismissed, checkout started, reminded.
 * "shown", "suppressed" and "purchased" are written by the server itself.
 * Tier and stage only; never the flag, never the man.
 */
const CLIENT_OUTCOMES = new Set(['dismissed', 'checkout_started', 'reminded']);
const TIERS = new Set(['safety', 'strong', 'stacked']);
const STAGES = new Set(['before', 'during', 'after']);

export async function POST(req: NextRequest) {
  const session = await readSession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const { tier, stage, outcome } = body ?? {};
  if (!TIERS.has(tier) || !STAGES.has(stage) || !CLIENT_OUTCOMES.has(outcome)) {
    return Response.json({ error: 'Invalid event' }, { status: 400 });
  }
  await logUpsellEvent(session.email, tier, stage, outcome);
  return Response.json({ ok: true });
}

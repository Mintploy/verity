/**
 * Counts the vendor calls one report actually costs.
 *
 * Enformion bills per call, not per report, and a report fans out across a
 * dozen endpoints with most of them behind conditions that only open for
 * certain men. Reading the code gives a range; only a real search gives the
 * number. This records every billed request as it happens and prints one line
 * per report, so the cost of a search is a fact in the logs rather than an
 * estimate.
 *
 * AsyncLocalStorage rather than a module-level counter: two women searching at
 * the same moment share a warm lambda, and a shared counter would blend their
 * two reports into one meaningless total.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface BilledCall {
  endpoint: string;
  ok: boolean;
  ms: number;
}

export interface CallTally {
  calls: BilledCall[];
}

const store = new AsyncLocalStorage<CallTally>();

export function withCallTally<T>(fn: (tally: CallTally) => Promise<T>): Promise<T> {
  const tally: CallTally = { calls: [] };
  return store.run(tally, () => fn(tally));
}

/** Endpoint path only. Never the body, which carries the subject's details. */
function endpointOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * fetch, with the call counted against the current report.
 *
 * Every billed Enformion request goes through here. Outside a withCallTally
 * scope it behaves as plain fetch, so nothing depends on the tally existing.
 */
export async function billedFetch(url: string, init: RequestInit): Promise<Response> {
  const started = Date.now();
  const endpoint = endpointOf(url);
  try {
    const res = await fetch(url, init);
    store.getStore()?.calls.push({ endpoint, ok: res.ok, ms: Date.now() - started });
    return res;
  } catch (e) {
    // A timeout or a refused connection is still a call we attempted, and on
    // some plans still a call we are charged for. Count it and say it failed.
    store.getStore()?.calls.push({ endpoint, ok: false, ms: Date.now() - started });
    throw e;
  }
}

/** One line: the total, then each endpoint with how many times it was hit. */
export function summarize(tally: CallTally): string {
  const byEndpoint = new Map<string, { n: number; ok: number; ms: number }>();
  for (const c of tally.calls) {
    const e = byEndpoint.get(c.endpoint) ?? { n: 0, ok: 0, ms: 0 };
    e.n += 1;
    if (c.ok) e.ok += 1;
    e.ms += c.ms;
    byEndpoint.set(c.endpoint, e);
  }

  const parts = [...byEndpoint.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .map(([path, v]) => `${path}=${v.n}${v.ok === v.n ? '' : ` (${v.n - v.ok} failed)`}`);

  const totalMs = tally.calls.reduce((s, c) => s + c.ms, 0);
  const failed = tally.calls.filter(c => !c.ok).length;

  return [
    `${tally.calls.length} billed calls`,
    failed ? `${failed} failed` : null,
    `${totalMs}ms total`,
    parts.join(' '),
  ].filter(Boolean).join(' | ');
}

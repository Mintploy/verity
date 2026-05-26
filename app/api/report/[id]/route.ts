import type { NextRequest } from 'next/server';

// In production, fetch from your database.
// For now, returns a 404 — reports are generated via POST /api/search.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return Response.json(
    { error: 'Report not found. Run a new search to generate a report.', id },
    { status: 404 }
  );
}

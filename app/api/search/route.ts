import type { NextRequest } from 'next/server';
import { generateReport } from '@/lib/apis/index';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, name } = body;

    if (!phone) {
      return Response.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // TODO: Verify user has active membership before allowing search
    // const session = await getServerSession(authOptions);
    // if (!session?.user?.membershipActive) {
    //   return Response.json({ error: 'Active membership required' }, { status: 403 });
    // }

    const report = await generateReport({ phone, name });

    return Response.json({ report, searchId: report.searchId });
  } catch (err: any) {
    console.error('Search error:', err);
    return Response.json({ error: err.message ?? 'Search failed' }, { status: 500 });
  }
}

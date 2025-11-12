import { NextRequest, NextResponse } from 'next/server';
import { getIndexer } from '@/lib/imageIndexer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/images/search?q=query
 * Search for images by description
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }
    
    const indexer = getIndexer();
    const results = await indexer.search(query);
    
    return NextResponse.json({
      query,
      results,
      count: results.length
    });
  } catch (error) {
    console.error('Error searching images:', error);
    return NextResponse.json(
      { error: 'Failed to search images' },
      { status: 500 }
    );
  }
}

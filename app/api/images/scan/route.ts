import { NextRequest, NextResponse } from 'next/server';
import { getIndexer } from '@/lib/imageIndexer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/images/scan
 * Trigger a full scan of images
 */
export async function POST(request: NextRequest) {
  try {
    const indexer = getIndexer();
    
    // Run scan in background
    indexer.scanAndIndex().catch(console.error);
    
    return NextResponse.json({
      success: true,
      message: 'Image scan started'
    });
  } catch (error) {
    console.error('Error starting scan:', error);
    return NextResponse.json(
      { error: 'Failed to start scan' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/images/scan
 * Get scan status
 */
export async function GET() {
  try {
    const indexer = getIndexer();
    const stats = await indexer.getStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}

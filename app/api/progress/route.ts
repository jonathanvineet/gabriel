import { NextRequest, NextResponse } from 'next/server';

// Store upload progress in memory (in production, use Redis or similar)
const uploadProgress = new Map<string, { progress: number; total: number; status: string }>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const uploadId = searchParams.get('id');

  if (!uploadId) {
    return NextResponse.json({ error: 'Upload ID required' }, { status: 400 });
  }

  const progress = uploadProgress.get(uploadId);
  
  if (!progress) {
    return NextResponse.json({ progress: 0, total: 0, status: 'not_found' });
  }

  return NextResponse.json(progress);
}

export async function POST(request: NextRequest) {
  const { uploadId, progress, total, status } = await request.json();

  if (!uploadId) {
    return NextResponse.json({ error: 'Upload ID required' }, { status: 400 });
  }

  uploadProgress.set(uploadId, { progress, total, status });

  // Clean up after completion
  if (status === 'completed' || status === 'error') {
    setTimeout(() => {
      uploadProgress.delete(uploadId);
    }, 5000);
  }

  return NextResponse.json({ success: true });
}

export function updateProgress(uploadId: string, progress: number, total: number, status: string) {
  uploadProgress.set(uploadId, { progress, total, status });
}

export function clearProgress(uploadId: string) {
  uploadProgress.delete(uploadId);
}

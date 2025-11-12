'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Lazy load ImageSearch component with loading fallback
const ImageSearch = dynamic(() => import('./ImageSearch'), {
  loading: () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      <span className="ml-3 text-white/60">Loading search...</span>
    </div>
  ),
  ssr: false, // Disable SSR for faster initial load
});

export default ImageSearch;

'use client';

import { useState, useEffect } from 'react';
import { Search, Sparkles, Loader2, X, Download, Eye } from 'lucide-react';

interface ImageResult {
  path: string;
  filename: string;
  description: string;
  size: number;
  lastModified: number;
}

export default function ImageSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [stats, setStats] = useState<{ totalImages: number; lastScan: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageResult | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetch('/api/images/scan');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/images/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const triggerScan = async () => {
    setScanning(true);
    try {
      await fetch('/api/images/scan', { method: 'POST' });
      setTimeout(loadStats, 2000);
    } catch (error) {
      console.error('Error triggering scan:', error);
    } finally {
      setScanning(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      {/* Unified Search Bar */}
      <div className="relative">
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-amber-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="🔍 Search images by AI... (e.g., 'person', 'car', 'sunset', 'red building')"
              className="w-full pl-12 pr-4 py-3 bg-black/50 border border-white/20 rounded-xl text-white placeholder:text-white/40 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 text-amber-400 w-5 h-5 animate-spin" />
            )}
            {query && !loading && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Scan Button */}
          <button
            onClick={triggerScan}
            disabled={scanning}
            className="px-4 py-3 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 rounded-xl border border-amber-400/30 hover:border-amber-400/50 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {scanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Scan
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="mt-2 text-xs text-white/40 pl-12">
            {stats.totalImages} images indexed • Last scan: {new Date(stats.lastScan).toLocaleString()}
          </div>
        )}
      </div>

      {/* Search Results - Integrated Grid */}
      {query && results.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-amber-400 font-medium">
              ✨ Found {results.length} {results.length === 1 ? 'image' : 'images'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {results.map((result, index) => (
              <div
                key={index}
                onClick={() => setPreviewImage(result)}
                className="group relative bg-black/30 border border-white/10 rounded-xl overflow-hidden hover:border-amber-400/50 transition-all cursor-pointer hover:scale-105"
              >
                {/* Image */}
                <div className="aspect-square bg-black/50 flex items-center justify-center overflow-hidden">
                  <img
                    src={`/api/files?path=${encodeURIComponent(result.path)}`}
                    alt={result.description}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `/api/files/download?path=${encodeURIComponent(result.path)}`;
                    }}
                  />
                  
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs text-white/80 font-medium truncate" title={result.filename}>
                    {result.filename}
                  </p>
                  <p className="text-xs text-white/40 truncate mt-0.5" title={result.description}>
                    {result.description}
                  </p>
                  <p className="text-xs text-amber-400/60 mt-1">
                    {formatFileSize(result.size)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {query && results.length === 0 && !loading && (
        <div className="mt-6 text-center py-12 bg-black/20 rounded-xl border border-white/10">
          <Search className="w-16 h-16 mx-auto mb-4 text-white/20" />
          <p className="text-white/60">No images found matching &ldquo;{query}&rdquo;</p>
          <p className="text-sm text-white/40 mt-2">Try different keywords or scan your images first</p>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-6xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Image */}
            <div className="flex-1 flex items-center justify-center mb-4">
              <img
                src={`/api/files?path=${encodeURIComponent(previewImage.path)}`}
                alt={previewImage.description}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // Fallback to download endpoint
                  target.src = `/api/download?path=${encodeURIComponent(previewImage.path)}`;
                }}
              />
            </div>

            {/* Info */}
            <div className="bg-black/80 border border-white/20 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-2">{previewImage.filename}</h3>
              <p className="text-white/60 mb-4">{previewImage.description}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-4 text-sm text-white/40">
                  <span>{formatFileSize(previewImage.size)}</span>
                  <span>•</span>
                  <span>{new Date(previewImage.lastModified).toLocaleDateString()}</span>
                </div>
                
                <a
                  href={`/api/download?path=${encodeURIComponent(previewImage.path)}`}
                  download
                  className="px-4 py-2 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 rounded-lg border border-amber-400/30 hover:border-amber-400/50 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

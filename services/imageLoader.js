/**
 * Image Loader - Inspired by Mihon's Coil integration and image loading
 * Handles image fetching, caching, and progressive loading
 */

import { GET } from './networkUtils';
import { downloadAndCacheImage, getCachedImage } from './cacheManager';

/**
 * Image load state
 */
export const ImageLoadState = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

/**
 * Image loader class with progress tracking
 * Similar to Mihon's ProgressResponseBody and image fetchers
 */
class ImageLoaderImpl {
  constructor() {
    this.loadingImages = new Map();
    this.progressListeners = new Map();
  }

  /**
   * Load an image with caching and progress tracking
   */
  async loadImage(url, options = {}) {
    const {
      cacheKey = url,
      useCache = true,
      onProgress = null,
      headers = {},
    } = options;

    // Check if already loading
    if (this.loadingImages.has(cacheKey)) {
      return this.loadingImages.get(cacheKey);
    }

    // Check cache first
    if (useCache) {
      const cached = await getCachedImage(cacheKey, 'pages');
      if (cached) {
        console.log(`[ImageLoader] Using cached image: ${cacheKey}`);
        return { uri: cached, cached: true };
      }
    }

    // Create loading promise
    const loadPromise = this._fetchImage(url, headers, onProgress);
    this.loadingImages.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;
      
      // Cache if requested
      if (useCache && result.uri) {
        await downloadAndCacheImage(url, cacheKey, 'pages');
      }

      return result;
    } finally {
      this.loadingImages.delete(cacheKey);
    }
  }

  /**
   * Internal fetch with progress tracking
   */
  async _fetchImage(url, headers = {}, onProgress = null) {
    try {
      console.log(`[ImageLoader] Fetching image: ${url}`);

      // For now, return URL directly (React Native Image handles the actual loading)
      // In a full implementation, you could download and track progress
      
      const response = await GET(url, headers, { maxRetries: 3 });
      
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }

      // For web/blob URLs, we could read the blob
      // For native, we just return the URL
      return { uri: url, cached: false };
    } catch (error) {
      console.error('[ImageLoader] Error loading image:', error);
      throw error;
    }
  }

  /**
   * Preload multiple images
   * Similar to Mihon's chapter page preloading
   */
  async preloadImages(urls, options = {}) {
    const {
      concurrent = 3,
      onProgress = null,
    } = options;

    const results = [];
    const queue = [...urls];
    let completed = 0;

    const loadNext = async () => {
      if (queue.length === 0) return;
      
      const url = queue.shift();
      
      try {
        const result = await this.loadImage(url, {
          ...options,
          onProgress: (progress) => {
            if (onProgress) {
              onProgress({
                url,
                completed,
                total: urls.length,
                itemProgress: progress,
              });
            }
          },
        });
        
        results.push({ url, result, success: true });
      } catch (error) {
        results.push({ url, error, success: false });
      } finally {
        completed++;
        await loadNext();
      }
    };

    // Start concurrent loads
    const promises = [];
    for (let i = 0; i < Math.min(concurrent, urls.length); i++) {
      promises.push(loadNext());
    }

    await Promise.all(promises);

    return results;
  }

  /**
   * Cancel loading for a specific image
   */
  cancelLoad(cacheKey) {
    this.loadingImages.delete(cacheKey);
  }

  /**
   * Clear all pending loads
   */
  clearAll() {
    this.loadingImages.clear();
  }
}

/**
 * Singleton image loader instance
 */
let imageLoaderInstance = null;

export const getImageLoader = () => {
  if (!imageLoaderInstance) {
    imageLoaderInstance = new ImageLoaderImpl();
  }
  return imageLoaderInstance;
};

/**
 * Image quality presets
 * Similar to Mihon's image quality settings
 */
export const ImageQuality = {
  LOW: { maxWidth: 800, maxHeight: 1200, quality: 0.7 },
  MEDIUM: { maxWidth: 1200, maxHeight: 1800, quality: 0.8 },
  HIGH: { maxWidth: 1600, maxHeight: 2400, quality: 0.9 },
  ORIGINAL: { maxWidth: null, maxHeight: null, quality: 1.0 },
};

// Module-level default quality (used when a specific quality isn't provided)
let DEFAULT_QUALITY = ImageQuality.HIGH;

const resolveQuality = (quality) => {
  if (!quality) return DEFAULT_QUALITY;
  if (typeof quality === 'string') {
    const q = quality.toUpperCase();
    return ImageQuality[q] || DEFAULT_QUALITY;
  }
  return quality;
};

/**
 * Get cover image URL with proper sizing
 * Inspired by Mihon's cover URL generation
 */
export const getCoverImageUrl = (baseUrl, mangaId, fileName, quality = null) => {
  if (!baseUrl || !mangaId || !fileName) return null;
  const q = resolveQuality(quality);

  // For MangaDex
  if (baseUrl.includes('mangadex')) {
    const size = q === ImageQuality.ORIGINAL ? '' : '.512.jpg';
    return `https://uploads.mangadex.org/covers/${mangaId}/${fileName}${size}`;
  }

  return `${baseUrl}/covers/${mangaId}/${fileName}`;
};

/**
 * Get page image URL
 */
export const getPageImageUrl = (baseUrl, hash, fileName, quality = null) => {
  if (!baseUrl || !hash || !fileName) return null;
  const q = resolveQuality(quality);

  // For MangaDex at-home server
  const dataQuality = q === ImageQuality.LOW ? 'data-saver' : 'data';
  return `${baseUrl}/${dataQuality}/${hash}/${fileName}`;
};

/**
 * Image fetcher with retry for failed images
 * Similar to Mihon's image request retry logic
 */
export const fetchImageWithRetry = async (url, maxRetries = 3) => {
  const loader = getImageLoader();
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await loader.loadImage(url, {
        onProgress: (progress) => {
          console.log(`[ImageLoader] Progress for ${url}: ${progress}%`);
        },
      });
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[ImageLoader] Retry ${attempt + 1} in ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Batch image loader for efficient loading
 * Inspired by Mihon's chapter page loading
 */
export class BatchImageLoader {
  constructor(urls, options = {}) {
    this.urls = urls;
    this.options = {
      concurrent: 3,
      retries: 3,
      onProgress: null,
      onImageLoaded: null,
      onError: null,
      ...options,
    };
    
    this.loaded = new Map();
    this.errors = new Map();
    this.loading = false;
    this.cancelled = false;
  }

  async start() {
    if (this.loading) {
      console.warn('[BatchImageLoader] Already loading');
      return;
    }

    this.loading = true;
    this.cancelled = false;

    const loader = getImageLoader();
    
    try {
      const results = await loader.preloadImages(this.urls, {
        concurrent: this.options.concurrent,
        onProgress: (progress) => {
          if (this.options.onProgress) {
            this.options.onProgress(progress);
          }
        },
      });

      results.forEach(({ url, result, success, error }) => {
        if (success) {
          this.loaded.set(url, result);
          if (this.options.onImageLoaded) {
            this.options.onImageLoaded(url, result);
          }
        } else {
          this.errors.set(url, error);
          if (this.options.onError) {
            this.options.onError(url, error);
          }
        }
      });

      return {
        loaded: this.loaded,
        errors: this.errors,
        total: this.urls.length,
      };
    } finally {
      this.loading = false;
    }
  }

  cancel() {
    this.cancelled = true;
    this.loading = false;
    getImageLoader().clearAll();
  }

  getProgress() {
    return {
      loaded: this.loaded.size,
      errors: this.errors.size,
      total: this.urls.length,
      percentage: (this.loaded.size / this.urls.length) * 100,
    };
  }
}

/**
 * Facade export to match services/index.js usage
 */
export const ImageLoader = {
  setDefaultQuality: (quality) => {
    DEFAULT_QUALITY = resolveQuality(quality);
    console.log('[ImageLoader] Default quality set');
  },
  loadImage: (url, options = {}) => getImageLoader().loadImage(url, options),
  preloadImages: (urls, options = {}) => getImageLoader().preloadImages(urls, options),
  cancelLoad: (cacheKey) => getImageLoader().cancelLoad(cacheKey),
  clearAll: () => getImageLoader().clearAll(),
  getCoverImageUrl: (baseUrl, mangaId, fileName, quality = null) => getCoverImageUrl(baseUrl, mangaId, fileName, quality),
  getPageImageUrl: (baseUrl, hash, fileName, quality = null) => getPageImageUrl(baseUrl, hash, fileName, quality),
  fetchImageWithRetry,
  ImageQuality,
};

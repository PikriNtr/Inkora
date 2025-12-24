/**
 * Cache Manager - Inspired by Mihon's CoverCache and ChapterCache
 * Manages caching for images and data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// Use legacy API to avoid deprecation warnings in Expo SDK 54+
import * as FileSystem from 'expo-file-system/legacy';

/**
 * Cache keys
 */
const CACHE_KEYS = {
  COVERS: 'inkora_covers_',
  CHAPTERS: 'inkora_chapters_',
  MANGA: 'inkora_manga_',
  EXTENSIONS: 'inkora_extensions',
  PREFERENCES: 'inkora_prefs_',
};

/**
 * Cache expiration times (in milliseconds)
 */
const CACHE_EXPIRATION = {
  COVERS: 7 * 24 * 60 * 60 * 1000,      // 7 days
  CHAPTERS: 24 * 60 * 60 * 1000,        // 1 day
  MANGA: 6 * 60 * 60 * 1000,            // 6 hours
  EXTENSIONS: 24 * 60 * 60 * 1000,      // 1 day
};

/**
 * File cache directory
 */
const getCacheDirectory = () => {
  return `${FileSystem.cacheDirectory}inkora/`;
};

/**
 * Initialize cache directories
 */
export const initializeCacheDirectories = async () => {
  try {
    const cacheDir = getCacheDirectory();
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      console.log('[CacheManager] Created cache directory:', cacheDir);
    }
    
    // Create subdirectories
    const subdirs = ['covers', 'pages', 'temp'];
    for (const subdir of subdirs) {
      const subdirPath = `${cacheDir}${subdir}/`;
      const subdirInfo = await FileSystem.getInfoAsync(subdirPath);
      if (!subdirInfo.exists) {
        await FileSystem.makeDirectoryAsync(subdirPath, { intermediates: true });
      }
    }
  } catch (error) {
    console.error('[CacheManager] Error initializing cache directories:', error);
  }
};

/**
 * Memory cache for frequently accessed data
 * Similar to Mihon's MemoryCache
 */
class MemoryCache {
  constructor(maxSize = 50) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.accessOrder = [];
  }

  get(key) {
    if (!this.cache.has(key)) return null;

    const entry = this.cache.get(key);
    
    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access order (LRU)
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    return entry.value;
  }

  set(key, value, ttl = null) {
    // Evict oldest if at max size
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldestKey = this.accessOrder.shift();
      this.cache.delete(oldestKey);
    }

    const entry = {
      value,
      expiresAt: ttl ? Date.now() + ttl : null,
      cachedAt: Date.now(),
    };

    this.cache.set(key, entry);
    
    // Update access order
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  has(key) {
    return this.get(key) !== null;
  }

  delete(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  size() {
    return this.cache.size;
  }
}

// Global memory caches
const coverCache = new MemoryCache(100);
const mangaCache = new MemoryCache(50);
const chapterCache = new MemoryCache(30);

/**
 * Get cached data from AsyncStorage
 */
const getFromStorage = async (key) => {
  try {
    const data = await AsyncStorage.getItem(key);
    if (!data) return null;

    const parsed = JSON.parse(data);
    
    // Check expiration
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return parsed.value;
  } catch (error) {
    console.error('[CacheManager] Error reading from storage:', error);
    return null;
  }
};

/**
 * Save data to AsyncStorage
 */
const saveToStorage = async (key, value, ttl = null) => {
  try {
    const data = {
      value,
      expiresAt: ttl ? Date.now() + ttl : null,
      cachedAt: Date.now(),
    };

    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('[CacheManager] Error saving to storage:', error);
  }
};

/**
 * Cover cache operations
 * Similar to Mihon's CoverCache
 */
export const CoverCache = {
  async get(mangaId) {
    // Try memory cache first
    let cover = coverCache.get(mangaId);
    if (cover) return cover;

    // Try storage cache
    cover = await getFromStorage(`${CACHE_KEYS.COVERS}${mangaId}`);
    if (cover) {
      coverCache.set(mangaId, cover, CACHE_EXPIRATION.COVERS);
    }

    return cover;
  },

  async set(mangaId, coverUrl) {
    coverCache.set(mangaId, coverUrl, CACHE_EXPIRATION.COVERS);
    await saveToStorage(`${CACHE_KEYS.COVERS}${mangaId}`, coverUrl, CACHE_EXPIRATION.COVERS);
  },

  async delete(mangaId) {
    coverCache.delete(mangaId);
    await AsyncStorage.removeItem(`${CACHE_KEYS.COVERS}${mangaId}`);
  },

  async clear() {
    coverCache.clear();
    const keys = await AsyncStorage.getAllKeys();
    const coverKeys = keys.filter(key => key.startsWith(CACHE_KEYS.COVERS));
    await AsyncStorage.multiRemove(coverKeys);
  },
};

/**
 * Chapter cache operations
 * Similar to Mihon's ChapterCache
 */
export const ChapterCache = {
  async get(mangaId) {
    let chapters = chapterCache.get(mangaId);
    if (chapters) return chapters;

    chapters = await getFromStorage(`${CACHE_KEYS.CHAPTERS}${mangaId}`);
    if (chapters) {
      chapterCache.set(mangaId, chapters, CACHE_EXPIRATION.CHAPTERS);
    }

    return chapters;
  },

  async set(mangaId, chapters) {
    chapterCache.set(mangaId, chapters, CACHE_EXPIRATION.CHAPTERS);
    await saveToStorage(`${CACHE_KEYS.CHAPTERS}${mangaId}`, chapters, CACHE_EXPIRATION.CHAPTERS);
  },

  async delete(mangaId) {
    chapterCache.delete(mangaId);
    await AsyncStorage.removeItem(`${CACHE_KEYS.CHAPTERS}${mangaId}`);
  },

  async clear() {
    chapterCache.clear();
    const keys = await AsyncStorage.getAllKeys();
    const chapterKeys = keys.filter(key => key.startsWith(CACHE_KEYS.CHAPTERS));
    await AsyncStorage.multiRemove(chapterKeys);
  },
};

/**
 * Manga details cache
 */
export const MangaCache = {
  async get(mangaId) {
    let manga = mangaCache.get(mangaId);
    if (manga) return manga;

    manga = await getFromStorage(`${CACHE_KEYS.MANGA}${mangaId}`);
    if (manga) {
      mangaCache.set(mangaId, manga, CACHE_EXPIRATION.MANGA);
    }

    return manga;
  },

  async set(mangaId, manga) {
    mangaCache.set(mangaId, manga, CACHE_EXPIRATION.MANGA);
    await saveToStorage(`${CACHE_KEYS.MANGA}${mangaId}`, manga, CACHE_EXPIRATION.MANGA);
  },

  async delete(mangaId) {
    mangaCache.delete(mangaId);
    await AsyncStorage.removeItem(`${CACHE_KEYS.MANGA}${mangaId}`);
  },

  async clear() {
    mangaCache.clear();
    const keys = await AsyncStorage.getAllKeys();
    const mangaKeys = keys.filter(key => key.startsWith(CACHE_KEYS.MANGA));
    await AsyncStorage.multiRemove(mangaKeys);
  },
};

/**
 * Extensions cache
 */
export const ExtensionsCache = {
  async get() {
    return await getFromStorage(CACHE_KEYS.EXTENSIONS);
  },

  async set(extensions) {
    await saveToStorage(CACHE_KEYS.EXTENSIONS, extensions, CACHE_EXPIRATION.EXTENSIONS);
  },

  async clear() {
    await AsyncStorage.removeItem(CACHE_KEYS.EXTENSIONS);
  },
};

/**
 * Download and cache an image file
 * Similar to Mihon's image download and caching
 */
export const downloadAndCacheImage = async (url, mangaId, type = 'cover') => {
  try {
    const cacheDir = getCacheDirectory();
    const filename = `${type}_${mangaId}_${Date.now()}.jpg`;
    const filePath = `${cacheDir}${type}s/${filename}`;

    console.log(`[CacheManager] Downloading image to cache: ${url}`);

    const downloadResult = await FileSystem.downloadAsync(url, filePath);

    if (downloadResult.status === 200) {
      console.log(`[CacheManager] Image cached at: ${filePath}`);
      return filePath;
    }

    return null;
  } catch (error) {
    console.error('[CacheManager] Error downloading image:', error);
    return null;
  }
};

/**
 * Get cached image file
 */
export const getCachedImage = async (mangaId, type = 'cover') => {
  try {
    const cacheDir = `${getCacheDirectory()}${type}s/`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);

    if (!dirInfo.exists) return null;

    const files = await FileSystem.readDirectoryAsync(cacheDir);
    const cachedFile = files.find(file => file.includes(`${type}_${mangaId}_`));

    if (cachedFile) {
      return `${cacheDir}${cachedFile}`;
    }

    return null;
  } catch (error) {
    console.error('[CacheManager] Error getting cached image:', error);
    return null;
  }
};

/**
 * Clear all caches
 */
export const clearAllCaches = async () => {
  try {
    console.log('[CacheManager] Clearing all caches...');

    // Clear memory caches
    coverCache.clear();
    mangaCache.clear();
    chapterCache.clear();

    // Clear AsyncStorage caches
    await CoverCache.clear();
    await ChapterCache.clear();
    await MangaCache.clear();
    await ExtensionsCache.clear();

    // Clear file caches
    const cacheDir = getCacheDirectory();
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);

    if (dirInfo.exists) {
      await FileSystem.deleteAsync(cacheDir, { idempotent: true });
      await initializeCacheDirectories();
    }

    console.log('[CacheManager] All caches cleared');
  } catch (error) {
    console.error('[CacheManager] Error clearing caches:', error);
  }
};

/**
 * Get cache size
 */
export const getCacheSize = async () => {
  try {
    const cacheDir = getCacheDirectory();
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);

    if (!dirInfo.exists) return 0;

    // This is a simplified version - in production, recursively calculate size
    return dirInfo.size || 0;
  } catch (error) {
    console.error('[CacheManager] Error getting cache size:', error);
    return 0;
  }
};

/**
 * Preferences storage
 * Similar to Mihon's PreferencesHelper
 */
export const Preferences = {
  async get(key, defaultValue = null) {
    const value = await getFromStorage(`${CACHE_KEYS.PREFERENCES}${key}`);
    return value !== null ? value : defaultValue;
  },

  async set(key, value) {
    await saveToStorage(`${CACHE_KEYS.PREFERENCES}${key}`, value);
  },

  async delete(key) {
    await AsyncStorage.removeItem(`${CACHE_KEYS.PREFERENCES}${key}`);
  },

  async clear() {
    const keys = await AsyncStorage.getAllKeys();
    const prefKeys = keys.filter(key => key.startsWith(CACHE_KEYS.PREFERENCES));
    await AsyncStorage.multiRemove(prefKeys);
  },
};

// Initialize cache directories on module load
initializeCacheDirectories();

/**
 * Aggregate CacheManager object for easier consumption
 * Matches usage in services/index.js
 */
export const CacheManager = {
  initializeCacheDirectories,
  clearAll: clearAllCaches,
  getCacheSize,
  CoverCache,
  ChapterCache,
  MangaCache,
  ExtensionsCache,
  Preferences,
};

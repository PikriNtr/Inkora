/**
 * Service Layer Index
 * Centralizes all service imports and provides initialization utilities
 * Inspired by Mihon's dependency injection and service management
 */

// Core Network & Source Services
import { NetworkUtils } from './networkUtils';
import { SourceManager } from './sourceManager';
import { BatoService } from './batoService';
import { XbatoService } from './xbatoService';
import { MangaService } from './mangaService';
import { ExtensionService } from './extensionService';

// Cache & Storage Services
import { CacheManager } from './cacheManager';
import { 
  LibraryService, 
  HistoryService, 
  ProgressService,
  CategoriesService,
  AppPreferences,
  SourcePreferences 
} from './storageService';

// UI Enhancement Services
import { FilterSystem } from './filterSystem';
import { ImageLoader } from './imageLoader';

/**
 * Service initialization state
 */
let servicesInitialized = false;

/**
 * Initialize all services in the correct order
 * Call this once at app startup (e.g., in App.js)
 */
export async function initializeServices() {
  if (servicesInitialized) {
    console.log('[Services] Already initialized, skipping...');
    return true;
  }

  console.log('[Services] Initializing service layer...');

  try {
    // Step 1: Initialize cache directories
    console.log('[Services] Setting up cache directories...');
    await CacheManager.initializeCacheDirectories();

    // Step 2: Load app preferences
    console.log('[Services] Loading preferences...');
    const prefs = await AppPreferences.getAll();
    console.log('[Services] Theme:', prefs.theme, '| Reading Mode:', prefs.readingMode);

    // Step 3: Initialize source manager with built-in sources
    console.log('[Services] Initializing source manager...');
    await SourceManager.initialize();
    const sources = SourceManager.getAllSources();
    console.log(`[Services] Loaded ${sources.length} sources`);

    // Step 4: Initialize image loader
    console.log('[Services] Configuring image loader...');
    ImageLoader.setDefaultQuality(prefs.imageQuality || 'high');

    // Step 5: Load categories
    console.log('[Services] Loading categories...');
    const categories = await CategoriesService.getAll();
    console.log(`[Services] Found ${categories.length} categories`);

    servicesInitialized = true;
    console.log('[Services] ✓ Service layer initialized successfully');
    
    return true;
  } catch (error) {
    console.error('[Services] Failed to initialize:', error);
    return false;
  }
}

/**
 * Clear all app data (for debugging or user request)
 */
export async function clearAllData() {
  console.log('[Services] Clearing all app data...');
  
  try {
    await Promise.all([
      LibraryService.clear(),
      HistoryService.clear(),
      CacheManager.clearAll(),
      AppPreferences.reset(),
    ]);
    
    console.log('[Services] ✓ All data cleared');
    return true;
  } catch (error) {
    console.error('[Services] Error clearing data:', error);
    return false;
  }
}

/**
 * Get service health status (for debugging)
 */
export async function getServiceStatus() {
  const cacheSize = await CacheManager.getCacheSize();
  const library = await LibraryService.getAll();
  const history = await HistoryService.getAll(10);
  const sources = SourceManager.getAllSources();
  const prefs = await AppPreferences.getAll();

  return {
    initialized: servicesInitialized,
    sources: {
      total: sources.length,
      available: sources.filter(s => !s.isStub).length,
      languages: [...new Set(sources.map(s => s.lang))],
    },
    library: {
      mangaCount: library.length,
    },
    history: {
      recentEntries: history.length,
    },
    cache: {
      totalSizeMB: (cacheSize / (1024 * 1024)).toFixed(2),
    },
    preferences: {
      theme: prefs.theme,
      readingMode: prefs.readingMode,
      imageQuality: prefs.imageQuality,
    },
  };
}

/**
 * Export all services for direct access
 */
export {
  // Network & Sources
  NetworkUtils,
  SourceManager,
  BatoService,
  XbatoService,
  MangaService,
  ExtensionService,
  
  // Cache & Storage
  CacheManager,
  LibraryService,
  HistoryService,
  ProgressService,
  CategoriesService,
  AppPreferences,
  SourcePreferences,
  
  // UI Enhancement
  FilterSystem,
  ImageLoader,
};

/**
 * Convenience exports for common operations
 */

// Search across all sources
export async function searchAllSources(query, filters = {}) {
  const sources = SourceManager.getAllSources().filter(s => !s.isStub);
  const results = [];

  for (const source of sources) {
    try {
      const sourceResults = await source.searchManga(query, filters);
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        results: sourceResults,
      });
    } catch (error) {
      console.error(`[Search] Error searching ${source.name}:`, error.message);
    }
  }

  return results;
}

// Get popular manga from all sources
export async function getPopularFromAllSources(page = 1) {
  const sources = SourceManager.getAllSources().filter(s => !s.isStub);
  const results = [];

  for (const source of sources) {
    try {
      const popularManga = await source.getPopularManga(page);
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        manga: popularManga,
      });
    } catch (error) {
      console.error(`[Popular] Error fetching from ${source.name}:`, error.message);
    }
  }

  return results;
}

// Check for library updates
export async function checkLibraryUpdates() {
  console.log('[Library] Checking for updates...');
  const library = await LibraryService.getAll();
  const updates = [];

  for (const manga of library) {
    try {
      const source = SourceManager.getSource(manga.sourceId);
      if (!source || source.isStub) continue;

      const details = await source.getMangaDetails(manga.id);
      
      // Compare last update time or chapter count
      if (details.lastUpdate > manga.lastUpdate) {
        updates.push({
          manga: manga,
          hasUpdate: true,
          newChapters: details.chapters || [],
        });
      }
    } catch (error) {
      console.error(`[Library] Error checking ${manga.title}:`, error.message);
    }
  }

  console.log(`[Library] Found ${updates.length} updates`);
  return updates;
}

// Export utility functions
export default {
  initializeServices,
  clearAllData,
  getServiceStatus,
  searchAllSources,
  getPopularFromAllSources,
  checkLibraryUpdates,
};

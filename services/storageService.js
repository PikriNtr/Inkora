/**
 * Service to manage app storage using AsyncStorage
 * Handles pinned extensions, reading preferences, library, history, etc.
 * Inspired by Mihon's database and storage layers
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  PINNED_SOURCES: '@inkora_pinned_sources',
  READING_MODE: '@inkora_reading_mode',
  READING_PREFERENCES: '@inkora_reading_preferences',
  LIBRARY: '@inkora_library',
  HISTORY: '@inkora_history',
  READING_PROGRESS: '@inkora_reading_progress_',
  CATEGORIES: '@inkora_categories',
  APP_PREFS: '@inkora_app_prefs',
  SOURCE_PREFS: '@inkora_source_prefs_',
};

/**
 * Get pinned source IDs
 */
export const getPinnedSources = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PINNED_SOURCES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting pinned sources:', error);
    return [];
  }
};

/**
 * Pin a source
 */
export const pinSource = async (sourceId) => {
  try {
    const pinned = await getPinnedSources();
    if (!pinned.includes(sourceId)) {
      pinned.push(sourceId);
      await AsyncStorage.setItem(STORAGE_KEYS.PINNED_SOURCES, JSON.stringify(pinned));
    }
    return pinned;
  } catch (error) {
    console.error('Error pinning source:', error);
    return [];
  }
};

/**
 * Unpin a source
 */
export const unpinSource = async (sourceId) => {
  try {
    const pinned = await getPinnedSources();
    const filtered = pinned.filter(id => id !== sourceId);
    await AsyncStorage.setItem(STORAGE_KEYS.PINNED_SOURCES, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error('Error unpinning source:', error);
    return [];
  }
};

/**
 * Toggle pin status
 */
export const togglePinSource = async (sourceId) => {
  const pinned = await getPinnedSources();
  if (pinned.includes(sourceId)) {
    return await unpinSource(sourceId);
  } else {
    return await pinSource(sourceId);
  }
};

/**
 * Get reading mode preference
 */
export const getReadingMode = async () => {
  try {
    const mode = await AsyncStorage.getItem(STORAGE_KEYS.READING_MODE);
    return mode || 'paged'; // default to paged mode
  } catch (error) {
    console.error('Error getting reading mode:', error);
    return 'paged';
  }
};

/**
 * Set reading mode preference
 */
export const setReadingMode = async (mode) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.READING_MODE, mode);
    return mode;
  } catch (error) {
    console.error('Error setting reading mode:', error);
    return 'paged';
  }
};

/**
 * Get reading preferences
 */
export const getReadingPreferences = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.READING_PREFERENCES);
    return data ? JSON.parse(data) : {
      mode: 'paged', // 'paged', 'webtoon', 'continuous'
      tapToHideUI: true,
      swipeToChangePage: true,
    };
  } catch (error) {
    console.error('Error getting reading preferences:', error);
    return {
      mode: 'paged',
      tapToHideUI: true,
      swipeToChangePage: true,
    };
  }
};

/**
 * Set reading preferences
 */
export const setReadingPreferences = async (preferences) => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.READING_PREFERENCES,
      JSON.stringify(preferences)
    );
    return preferences;
  } catch (error) {
    console.error('Error setting reading preferences:', error);
    return preferences;
  }
};

/**
 * ========================================
 * LIBRARY MANAGEMENT (Mihon-inspired)
 * ========================================
 */

/**
 * Library manga entry model
 */
export class LibraryManga {
  constructor(data) {
    this.id = data.id;
    this.sourceId = data.sourceId;
    this.title = data.title;
    this.author = data.author;
    this.artist = data.artist;
    this.description = data.description;
    this.genres = data.genres || [];
    this.status = data.status;
    this.coverUrl = data.coverUrl;
    this.url = data.url;
    this.favorite = data.favorite || false;
    this.dateAdded = data.dateAdded || Date.now();
    this.lastUpdate = data.lastUpdate || Date.now();
    this.categories = data.categories || ['default'];
    this.unreadCount = data.unreadCount || 0;
  }
}

/**
 * Get all library manga
 */
export const getLibrary = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LIBRARY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    return parsed.map(item => new LibraryManga(item));
  } catch (error) {
    console.error('[Library] Error getting library:', error);
    return [];
  }
};

/**
 * Add manga to library
 */
export const addToLibrary = async (manga) => {
  try {
    const library = await getLibrary();
    
    // Check if already exists
    const exists = library.find(m => m.id === manga.id && m.sourceId === manga.sourceId);
    if (exists) {
      console.log('[Library] Manga already in library');
      return false;
    }

    const libraryManga = new LibraryManga({
      ...manga,
      favorite: true,
      dateAdded: Date.now(),
    });

    library.push(libraryManga);
    await AsyncStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(library));
    
    console.log('[Library] Added manga:', manga.title);
    return true;
  } catch (error) {
    console.error('[Library] Error adding to library:', error);
    return false;
  }
};

/**
 * Remove manga from library
 */
export const removeFromLibrary = async (mangaId, sourceId) => {
  try {
    const library = await getLibrary();
    const filtered = library.filter(m => !(m.id === mangaId && m.sourceId === sourceId));
    
    await AsyncStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(filtered));
    console.log('[Library] Removed manga from library');
    return true;
  } catch (error) {
    console.error('[Library] Error removing from library:', error);
    return false;
  }
};

/**
 * Clear entire library
 */
export const clearLibrary = async () => {
  await AsyncStorage.removeItem(STORAGE_KEYS.LIBRARY);
};

/**
 * Update manga in library
 */
export const updateLibraryManga = async (mangaId, sourceId, updates) => {
  try {
    const library = await getLibrary();
    const index = library.findIndex(m => m.id === mangaId && m.sourceId === sourceId);
    
    if (index === -1) return false;

    library[index] = {
      ...library[index],
      ...updates,
      lastUpdate: Date.now(),
    };

    await AsyncStorage.setItem(STORAGE_KEYS.LIBRARY, JSON.stringify(library));
    return true;
  } catch (error) {
    console.error('[Library] Error updating:', error);
    return false;
  }
};

/**
 * Check if manga is in library
 */
export const isInLibrary = async (mangaId, sourceId) => {
  const library = await getLibrary();
  return library.some(m => m.id === mangaId && m.sourceId === sourceId);
};

/**
 * ========================================
 * READING HISTORY (Mihon-inspired)
 * ========================================
 */

/**
 * History entry model
 */
export class HistoryEntry {
  constructor(data) {
    this.mangaId = data.mangaId;
    this.mangaTitle = data.mangaTitle;
    this.chapterId = data.chapterId;
    this.chapterTitle = data.chapterTitle;
    this.sourceId = data.sourceId;
    this.coverUrl = data.coverUrl;
    this.readAt = data.readAt || Date.now();
    this.readDuration = data.readDuration || 0;
  }
}

/**
 * Get reading history
 */
export const getHistory = async (limit = 100) => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!data) return [];
    
    const parsed = JSON.parse(data);
    const history = parsed.map(item => new HistoryEntry(item));
    
    // Sort by read date (most recent first)
    history.sort((a, b) => b.readAt - a.readAt);
    
    return limit ? history.slice(0, limit) : history;
  } catch (error) {
    console.error('[History] Error getting history:', error);
    return [];
  }
};

/**
 * Add history entry
 */
export const addToHistory = async (manga, chapter, readDuration = 0) => {
  try {
    const history = await getHistory(null); // Get all
    
    // Remove existing entry for this chapter
    const filtered = history.filter(h => 
      !(h.mangaId === manga.id && h.chapterId === chapter.id)
    );
    
    // Add new entry
    filtered.unshift(new HistoryEntry({
      mangaId: manga.id,
      mangaTitle: manga.title,
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      sourceId: manga.sourceId,
      coverUrl: manga.coverUrl,
      readAt: Date.now(),
      readDuration,
    }));

    // Keep only last 500 entries
    const limited = filtered.slice(0, 500);
    
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(limited));
    console.log('[History] Added entry');
    return true;
  } catch (error) {
    console.error('[History] Error adding:', error);
    return false;
  }
};

/**
 * Clear all history
 */
export const clearHistory = async () => {
  await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY);
  console.log('[History] Cleared all history');
};

/**
 * ========================================
 * READING PROGRESS (Mihon-inspired)
 * ========================================
 */

/**
 * Reading progress model
 */
export class ReadingProgress {
  constructor(data) {
    this.mangaId = data.mangaId;
    this.chapterId = data.chapterId;
    this.lastPageRead = data.lastPageRead || 0;
    this.totalPages = data.totalPages || 0;
    this.completed = data.completed || false;
    this.lastRead = data.lastRead || Date.now();
  }

  get progress() {
    return this.totalPages > 0 ? (this.lastPageRead / this.totalPages) * 100 : 0;
  }
}

/**
 * Get reading progress for a chapter
 */
export const getReadingProgress = async (mangaId, chapterId) => {
  try {
    const key = `${STORAGE_KEYS.READING_PROGRESS}${mangaId}_${chapterId}`;
    const data = await AsyncStorage.getItem(key);
    
    if (!data) return null;
    
    return new ReadingProgress(JSON.parse(data));
  } catch (error) {
    console.error('[Progress] Error getting progress:', error);
    return null;
  }
};

/**
 * Save reading progress
 */
export const saveReadingProgress = async (mangaId, chapterId, page, totalPages) => {
  try {
    const progress = new ReadingProgress({
      mangaId,
      chapterId,
      lastPageRead: page,
      totalPages,
      completed: page >= totalPages - 1,
      lastRead: Date.now(),
    });

    const key = `${STORAGE_KEYS.READING_PROGRESS}${mangaId}_${chapterId}`;
    await AsyncStorage.setItem(key, JSON.stringify(progress));
    
    console.log(`[Progress] Saved: ${page}/${totalPages}`);
    return true;
  } catch (error) {
    console.error('[Progress] Error saving:', error);
    return false;
  }
};

/**
 * Get all progress for a manga
 */
export const getMangaProgress = async (mangaId) => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const progressKeys = allKeys.filter(key => 
      key.startsWith(`${STORAGE_KEYS.READING_PROGRESS}${mangaId}_`)
    );

    const progressData = await AsyncStorage.multiGet(progressKeys);
    
    return progressData
      .map(([key, value]) => value ? new ReadingProgress(JSON.parse(value)) : null)
      .filter(p => p !== null);
  } catch (error) {
    console.error('[Progress] Error getting manga progress:', error);
    return [];
  }
};

/**
 * ========================================
 * CATEGORIES (Mihon-inspired)
 * ========================================
 */

/**
 * Get all categories
 */
export const getCategories = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!data) {
      // Return default categories
      return [
        { id: 'default', name: 'Default', order: 0 },
        { id: 'reading', name: 'Reading', order: 1 },
        { id: 'completed', name: 'Completed', order: 2 },
        { id: 'plan_to_read', name: 'Plan to Read', order: 3 },
      ];
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error('[Categories] Error getting categories:', error);
    return [];
  }
};

/**
 * Add category
 */
export const addCategory = async (name) => {
  try {
    const categories = await getCategories();
    const newCategory = {
      id: `cat_${Date.now()}`,
      name,
      order: categories.length,
    };

    categories.push(newCategory);
    await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
    
    return newCategory;
  } catch (error) {
    console.error('[Categories] Error adding:', error);
    return null;
  }
};

/**
 * ========================================
 * APP PREFERENCES (Mihon-inspired)
 * ========================================
 */

const DEFAULT_PREFS = {
  theme: 'system',
  readingMode: 'ltr', // ltr, rtl, vertical
  imageQuality: 'high',
  autoDownloadChapters: false,
  downloadOnlyOnWifi: true,
  showNSFW: false,
  defaultSourceLanguage: 'en',
  libraryUpdateInterval: 24, // hours
  keepScreenOn: true,
  volumeKeyNavigation: true,
};

/**
 * Get all app preferences
 */
export const getAppPreferences = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.APP_PREFS);
    if (!data) return DEFAULT_PREFS;
    
    return { ...DEFAULT_PREFS, ...JSON.parse(data) };
  } catch (error) {
    console.error('[Preferences] Error getting prefs:', error);
    return DEFAULT_PREFS;
  }
};

/**
 * Set app preference
 */
export const setAppPreference = async (key, value) => {
  try {
    const prefs = await getAppPreferences();
    prefs[key] = value;
    
    await AsyncStorage.setItem(STORAGE_KEYS.APP_PREFS, JSON.stringify(prefs));
    console.log(`[Preferences] Set ${key} = ${value}`);
    return true;
  } catch (error) {
    console.error('[Preferences] Error setting pref:', error);
    return false;
  }
};

/**
 * Reset app preferences to defaults
 */
export const resetAppPreferences = async () => {
  await AsyncStorage.setItem(STORAGE_KEYS.APP_PREFS, JSON.stringify(DEFAULT_PREFS));
};

/**
 * Get source-specific preferences
 */
export const getSourcePreferences = async (sourceId) => {
  try {
    const key = `${STORAGE_KEYS.SOURCE_PREFS}${sourceId}`;
    const data = await AsyncStorage.getItem(key);
    
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('[SourcePrefs] Error getting:', error);
    return {};
  }
};

/**
 * Set source preference
 */
export const setSourcePreference = async (sourceId, key, value) => {
  try {
    const prefs = await getSourcePreferences(sourceId);
    prefs[key] = value;
    
    const storageKey = `${STORAGE_KEYS.SOURCE_PREFS}${sourceId}`;
    await AsyncStorage.setItem(storageKey, JSON.stringify(prefs));
    
    return true;
  } catch (error) {
    console.error('[SourcePrefs] Error setting:', error);
    return false;
  }
};

/**
 * Aggregate service-style exports to align with services/index.js usage
 */
export const LibraryService = {
  getAll: getLibrary,
  add: addToLibrary,
  remove: removeFromLibrary,
  update: updateLibraryManga,
  isInLibrary,
  clear: clearLibrary,
};

export const HistoryService = {
  getAll: getHistory,
  add: addToHistory,
  clear: clearHistory,
};

export const ProgressService = {
  get: getReadingProgress,
  save: saveReadingProgress,
  getAllForManga: getMangaProgress,
};

export const CategoriesService = {
  getAll: getCategories,
  add: addCategory,
};

export const AppPreferences = {
  getAll: getAppPreferences,
  set: setAppPreference,
  reset: resetAppPreferences,
};

export const SourcePreferences = {
  get: getSourcePreferences,
  set: setSourcePreference,
};

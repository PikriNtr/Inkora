/**
 * Source Manager - Inspired by Mihon's AndroidSourceManager
 * Manages sources, extensions, and their lifecycle
 */

import { GET, parseJSON } from './networkUtils';
import * as BatoService from './batoService';
import * as XbatoService from './xbatoService';

/**
 * Source types
 */
export const SourceType = {
  HTTP: 'http',
  LOCAL: 'local',
  STUB: 'stub',
};

/**
 * Built-in sources (like Mihon's LocalSource and built-in sources)
 */
const BUILT_IN_SOURCES = [
  {
    id: 'bato_to',
    name: 'Bato',
    lang: 'en',
    baseUrl: 'https://bato.to',
    type: SourceType.HTTP,
    versionId: 1,
    supportsLatest: true,
    isNsfw: false,
    service: BatoService,
  },
  {
    id: 'xbato_com',
    name: 'Xbato',
    lang: 'en',
    baseUrl: 'https://xbato.com',
    type: SourceType.HTTP,
    versionId: 1,
    supportsLatest: true,
    isNsfw: false,
    service: XbatoService,
  },
  {
    id: 'mangadex_org',
    name: 'MangaDex',
    lang: 'all',
    baseUrl: 'https://mangadex.org',
    type: SourceType.HTTP,
    versionId: 1,
    supportsLatest: true,
    isNsfw: false,
  },
];

/**
 * Source Manager class - Singleton pattern like Mihon
 */
class SourceManager {
  constructor() {
    this.sources = new Map();
    this.stubSources = new Map();
    this.isInitialized = false;
    this.listeners = new Set();
  }

  /**
   * Initialize the source manager
   * Similar to Mihon's init() in AndroidSourceManager
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[SourceManager] Already initialized');
      return;
    }

    console.log('[SourceManager] Initializing...');

    // Load built-in sources
    BUILT_IN_SOURCES.forEach(source => {
      this.registerSource(source);
    });

    console.log(`[SourceManager] Loaded ${this.sources.size} built-in sources`);

    this.isInitialized = true;
    this.notifyListeners();
  }

  /**
   * Register a source
   */
  registerSource(source) {
    const enrichedSource = {
      ...source,
      id: source.id || this.generateSourceId(source.name, source.lang),
      isConfigurable: false,
      isStub: false,
    };

    this.sources.set(enrichedSource.id, enrichedSource);
    console.log(`[SourceManager] Registered source: ${enrichedSource.name} (${enrichedSource.lang})`);
  }

  /**
   * Register a stub source (for sources that failed to load)
   * Like Mihon's StubSource
   */
  registerStubSource(sourceId, sourceName = 'Unknown Source') {
    const stubSource = {
      id: sourceId,
      name: sourceName,
      lang: 'unknown',
      baseUrl: '',
      type: SourceType.STUB,
      isStub: true,
      versionId: 0,
    };

    this.stubSources.set(sourceId, stubSource);
    console.log(`[SourceManager] Registered stub source: ${sourceName}`);
  }

  /**
   * Get source by ID
   * Similar to Mihon's get()
   */
  getSource(sourceId) {
    return this.sources.get(sourceId) || null;
  }

  /**
   * Get source or stub
   * Similar to Mihon's getOrStub()
   */
  getSourceOrStub(sourceId) {
    return this.sources.get(sourceId) || this.stubSources.get(sourceId) || this.createStubSource(sourceId);
  }

  /**
   * Create a stub source on the fly
   */
  createStubSource(sourceId) {
    const stub = {
      id: sourceId,
      name: `Source ${sourceId}`,
      lang: 'unknown',
      baseUrl: '',
      type: SourceType.STUB,
      isStub: true,
      versionId: 0,
    };
    this.stubSources.set(sourceId, stub);
    return stub;
  }

  /**
   * Get all online sources
   * Similar to Mihon's getOnlineSources()
   */
  getOnlineSources() {
    return Array.from(this.sources.values()).filter(
      source => source.type === SourceType.HTTP && !source.isStub
    );
  }

  /**
   * Get catalogue sources (sources that support browsing)
   * Similar to Mihon's getCatalogueSources()
   */
  getCatalogueSources() {
    return this.getOnlineSources();
  }

  /**
   * Get sources by language
   */
  getSourcesByLanguage(lang) {
    return this.getOnlineSources().filter(
      source => source.lang === lang || source.lang === 'all'
    );
  }

  /**
   * Get available languages
   */
  getAvailableLanguages() {
    const languages = new Set();
    this.getOnlineSources().forEach(source => {
      languages.add(source.lang);
    });
    return Array.from(languages).sort();
  }

  /**
   * Generate source ID from name and language
   * Similar to Mihon's generateId() using MD5
   */
  generateSourceId(name, lang = 'all', versionId = 1) {
    const str = `${name.toLowerCase()}/${lang}/${versionId}`;
    // Simple hash function (in production, use a proper hash)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  /**
   * Add listener for source changes
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify listeners of changes
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.getOnlineSources());
      } catch (error) {
        console.error('[SourceManager] Error in listener:', error);
      }
    });
  }

  /**
   * Clear all sources (for testing/reset)
   */
  clear() {
    this.sources.clear();
    this.stubSources.clear();
    this.isInitialized = false;
    this.notifyListeners();
  }
}

// Singleton instance
let sourceManagerInstance = null;

/**
 * Get the singleton SourceManager instance
 * Like Mihon's dependency injection pattern
 */
export const getSourceManager = () => {
  if (!sourceManagerInstance) {
    sourceManagerInstance = new SourceManager();
  }
  return sourceManagerInstance;
};

// Facade object to match services/index.js usage
export const SourceManagerAPI = {
  initialize: async () => getSourceManager().initialize(),
  getAllSources: () => getSourceManager().getOnlineSources(),
  getSource: (id) => getSourceManager().getSource(id),
  getSourceOrStub: (id) => getSourceManager().getSourceOrStub(id),
  registerSource: (src) => getSourceManager().registerSource(src),
  addListener: (cb) => getSourceManager().addListener(cb),
  clear: () => getSourceManager().clear(),
  getSourcesByLanguage: (lang) => getSourceManager().getSourcesByLanguage(lang),
  getAvailableLanguages: () => getSourceManager().getAvailableLanguages(),
};

// Export alias so consumers can `import { SourceManager } from './sourceManager'`
export { SourceManagerAPI as SourceManager };

// Default export (not used by index.js); keep for flexibility
export default SourceManager;

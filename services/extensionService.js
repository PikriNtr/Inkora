/**
 * Service to fetch and manage extension repositories
 * Similar to Tachiyomi/Mihon extension system
 */

import { GET, parseJSON } from './networkUtils';

const EXTENSION_REPOSITORIES = [
  'https://raw.githubusercontent.com/keiyoushi/extensions/repo/index.min.json',
  'https://raw.githubusercontent.com/suwayomi/tachiyomi-extension/repo/index.min.json',
];

/**
 * Fetch extensions from all repositories
 */
export const fetchExtensions = async () => {
  try {
    console.log('[ExtensionService] Fetching extensions from repositories...');
    const allExtensions = [];
    
    for (const repoUrl of EXTENSION_REPOSITORIES) {
      try {
        console.log('[ExtensionService] Fetching from:', repoUrl);
        const response = await GET(repoUrl, {}, { maxRetries: 2, checkCloudflare: false });
        const data = await parseJSON(response);
        
        if (Array.isArray(data)) {
          // Extract sources from each extension
          data.forEach(extension => {
            if (extension.sources && Array.isArray(extension.sources)) {
              extension.sources.forEach(source => {
                allExtensions.push({
                  ...source,
                  extensionName: extension.name,
                  extensionVersion: extension.version,
                  extensionLang: extension.lang,
                  nsfw: extension.nsfw === 1,
                });
              });
            }
          });
        }
        console.log(`[ExtensionService] Found ${allExtensions.length} sources from ${repoUrl}`);
      } catch (error) {
        console.warn(`[ExtensionService] Failed to fetch from ${repoUrl}:`, error.message);
      }
    }
    
    console.log(`[ExtensionService] Total extensions loaded: ${allExtensions.length}`);
    return allExtensions;
  } catch (error) {
    console.error('[ExtensionService] Error fetching extensions:', error.message);
    return [];
  }
};

/**
 * Group sources by name (collapse duplicates)
 * Returns grouped sources with available languages
 */
export const groupSourcesByName = (extensions) => {
  const grouped = {};
  
  extensions.forEach(source => {
    const sourceName = source.name;
    
    if (!grouped[sourceName]) {
      grouped[sourceName] = {
        name: sourceName,
        baseUrl: source.baseUrl,
        id: source.id,
        languages: [],
        sources: [], // Store all source variants
        nsfw: source.nsfw,
      };
    }
    
    // Add language if not already present
    const lang = source.lang || 'all';
    if (!grouped[sourceName].languages.includes(lang)) {
      grouped[sourceName].languages.push(lang);
    }
    
    // Store the source variant
    grouped[sourceName].sources.push({
      ...source,
      lang: lang,
    });
  });
  
  // Convert to array and sort languages
  return Object.values(grouped).map(group => ({
    ...group,
    languages: group.languages.sort(),
  }));
};

/**
 * Get source by name and language
 */
export const getSourceByNameAndLang = (groupedSources, name, lang) => {
  const group = groupedSources.find(g => g.name === name);
  if (!group) return null;
  
  // Find source with matching language, fallback to first available
  const source = group.sources.find(s => s.lang === lang) || group.sources[0];
  return source;
};

/**
 * Group extensions by language (legacy - kept for compatibility)
 */
export const groupExtensionsByLanguage = (extensions) => {
  const grouped = {};
  
  extensions.forEach(ext => {
    const lang = ext.lang || 'all';
    if (!grouped[lang]) {
      grouped[lang] = [];
    }
    grouped[lang].push(ext);
  });
  
  return grouped;
};

/**
 * Filter extensions by language and NSFW preference
 */
export const filterExtensions = (extensions, options = {}) => {
  let filtered = [...extensions];
  
  if (options.language) {
    filtered = filtered.filter(ext => 
      ext.lang === options.language || ext.lang === 'all'
    );
  }
  
  if (options.hideNSFW) {
    filtered = filtered.filter(ext => !ext.nsfw);
  }
  
  if (options.searchQuery) {
    const query = options.searchQuery.toLowerCase();
    filtered = filtered.filter(ext =>
      ext.name.toLowerCase().includes(query) ||
      ext.baseUrl.toLowerCase().includes(query)
    );
  }
  
  return filtered;
};


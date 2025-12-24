/**
 * Service for Xbato (xbato.com) manga source
 * Using unofficial Xbato API: https://xbato-api.hanifu.id
 */

import { GET, parseJSON } from './networkUtils';

const XBATO_API_BASE = 'https://xbato-api.hanifu.id';

/**
 * Helper function to encode URL to base64
 */
const encodeBase64 = (str) => {
  // Use btoa for base64 encoding (works in React Native)
  try {
    return btoa(str);
  } catch (error) {
    // Fallback for environments without btoa
    return Buffer.from(str).toString('base64');
  }
};

/**
 * Helper function to decode base64 to URL
 */
const decodeBase64 = (str) => {
  try {
    return atob(str);
  } catch (error) {
    return Buffer.from(str, 'base64').toString('utf-8');
  }
};

/**
 * Helper function to make fetch request with better error handling
 * Uses networkUtils for consistent error handling
 */
const fetchXbatoApi = async (url) => {
  console.log('[XbatoService] Fetching from:', url);
  
  const response = await GET(url, { 'Accept': 'application/json' }, {
    maxRetries: 2,
    checkCloudflare: false,
  });
  
  const data = await parseJSON(response);
  console.log('[XbatoService] Response received');
  return data;
};

/**
 * Search manga on Xbato
 */
export const searchXbatoManga = async (query) => {
  try {
    console.log('[XbatoService] Searching for:', query);
    
    // API requires minimum 3 characters
    if (query.trim().length < 3) {
      console.log('[XbatoService] Query too short, minimum 3 characters required');
      return [];
    }
    
    const url = `${XBATO_API_BASE}/search?query=${encodeURIComponent(query)}`;
    const data = await fetchXbatoApi(url);
    
    if (!data || !Array.isArray(data)) {
      console.log('[XbatoService] No results found');
      return [];
    }
    
    console.log(`[XbatoService] Found ${data.length} results`);
    
    return data.map(item => ({
      id: item.url || item.link, // Store the full URL as ID
      title: item.title || item.name,
      description: item.description || item.synopsis || '',
      coverUrl: item.image || item.thumbnail || item.cover || null,
      author: item.author || null,
      status: item.status || 'unknown',
      type: item.type || 'manga',
      // Store the original URL for later use
      _originalUrl: item.url || item.link,
    }));
  } catch (error) {
    console.error('[XbatoService] Error searching manga:', error.message);
    return [];
  }
};

/**
 * Get popular/latest manga from Xbato
 * Uses a generic search term to get results since the API requires min 3 chars
 */
export const getXbatoPopularManga = async () => {
  try {
    console.log('[XbatoService] Fetching popular manga');
    
    // Use a generic search term that's likely to return many results
    const popularSearchTerms = ['the', 'manga', 'one'];
    const searchTerm = popularSearchTerms[Math.floor(Math.random() * popularSearchTerms.length)];
    
    const url = `${XBATO_API_BASE}/search?query=${encodeURIComponent(searchTerm)}`;
    const data = await fetchXbatoApi(url);
    
    if (!data || !Array.isArray(data)) {
      console.log('[XbatoService] No results found');
      return [];
    }
    
    console.log(`[XbatoService] Found ${data.length} manga`);
    
    return data.map(item => ({
      id: item.url || item.link,
      title: item.title || item.name,
      description: item.description || item.synopsis || '',
      coverUrl: item.image || item.thumbnail || item.cover || null,
      author: item.author || null,
      status: item.status || 'unknown',
      type: item.type || 'manga',
      _originalUrl: item.url || item.link,
    }));
  } catch (error) {
    console.error('[XbatoService] Error fetching popular manga:', error.message);
    return [];
  }
};

/**
 * Get manga details from Xbato
 */
export const getXbatoMangaDetails = async (mangaUrl) => {
  try {
    console.log('[XbatoService] Fetching manga details for URL:', mangaUrl);
    
    // The manga URL should be the full xbato.com URL
    // Encode it to base64
    const encodedUrl = encodeBase64(mangaUrl);
    const url = `${XBATO_API_BASE}/comic/${encodedUrl}`;
    
    const data = await fetchXbatoApi(url);
    
    if (!data) {
      console.log('[XbatoService] No details found');
      return null;
    }
    
    return {
      id: mangaUrl,
      title: data.title || data.name,
      description: data.description || data.synopsis || '',
      coverUrl: data.image || data.thumbnail || data.cover || null,
      author: data.author || null,
      artist: data.artist || null,
      status: data.status || 'unknown',
      type: data.type || 'manga',
      genres: data.genres || data.tags || [],
      chapters: data.chapters || [],
      _originalUrl: mangaUrl,
    };
  } catch (error) {
    console.error('[XbatoService] Error fetching manga details:', error.message);
    return null;
  }
};

/**
 * Get chapters for a manga from Xbato
 */
export const getXbatoChapters = async (mangaUrl) => {
  try {
    console.log('[XbatoService] Fetching chapters for manga URL:', mangaUrl);
    
    // Get manga details which should include chapters
    const details = await getXbatoMangaDetails(mangaUrl);
    
    if (!details || !details.chapters) {
      console.log('[XbatoService] No chapters found');
      return [];
    }
    
    console.log(`[XbatoService] Found ${details.chapters.length} chapters`);
    
    return details.chapters.map((chapter, index) => ({
      id: chapter.url || chapter.link, // Store full chapter URL
      name: chapter.title || chapter.name || `Chapter ${chapter.number || index + 1}`,
      chapter: chapter.number || chapter.chapter,
      volume: chapter.volume || null,
      date: chapter.date || chapter.uploadDate || null,
      scanlationGroup: chapter.group || chapter.scanlator || null,
      _originalUrl: chapter.url || chapter.link,
    }));
  } catch (error) {
    console.error('[XbatoService] Error fetching chapters:', error.message);
    return [];
  }
};

/**
 * Get chapter pages/images from Xbato
 */
export const getXbatoChapterPages = async (chapterUrl) => {
  try {
    console.log('[XbatoService] Fetching chapter pages for URL:', chapterUrl);
    
    // Encode chapter URL to base64
    const encodedUrl = encodeBase64(chapterUrl);
    const url = `${XBATO_API_BASE}/images/${encodedUrl}`;
    
    const data = await fetchXbatoApi(url);
    
    if (!data) {
      console.log('[XbatoService] No pages found');
      return [];
    }
    
    // The response should be an array of image URLs
    if (Array.isArray(data)) {
      console.log(`[XbatoService] Found ${data.length} pages`);
      return data.map((imageUrl, index) => ({
        url: imageUrl,
        page: index + 1,
      }));
    }
    
    // If data has a different structure, adjust accordingly
    if (data.images && Array.isArray(data.images)) {
      console.log(`[XbatoService] Found ${data.images.length} pages`);
      return data.images.map((imageUrl, index) => ({
        url: imageUrl,
        page: index + 1,
      }));
    }
    
    return [];
  } catch (error) {
    console.error('[XbatoService] Error fetching chapter pages:', error.message);
    return [];
  }
};
/**
 * Service for Xbato (xbato.com) manga source
 * Uses custom backend API that bypasses Cloudflare
 * 
 * SETUP:
 * 1. Deploy the backend (server.js) to Vercel/Railway/Render
 * 2. Update API_BASE_URL below with your deployed URL
 */

// CHANGE THIS to your deployed backend URL
const API_BASE_URL = 'http://localhost:3000'; // For local testing
// const API_BASE_URL = 'https://your-app.vercel.app'; // For production

/**
 * Helper function to make fetch request with better error handling
 */
const fetchXbatoApi = async (endpoint) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('Fetching from backend:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error response:', errorData);
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Response received:', data);
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

/**
 * Search manga on Xbato
 */
export const searchXbatoManga = async (query) => {
  try {
    console.log('Searching Xbato for:', query);
    
    // Validate query length
    if (!query || query.trim().length < 2) {
      console.log('Query too short, minimum 2 characters required');
      return [];
    }
    
    const data = await fetchXbatoApi(`/api/search?query=${encodeURIComponent(query)}`);
    
    if (!Array.isArray(data)) {
      console.log('Unexpected response format');
      return [];
    }
    
    console.log(`Found ${data.length} results`);
    
    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || '',
      coverUrl: item.coverUrl,
      author: item.author || null,
      status: item.status || 'unknown',
      type: 'manga',
      _originalUrl: item.url,
    }));
  } catch (error) {
    console.error('Error searching Xbato manga:', error);
    return [];
  }
};

/**
 * Get popular/latest manga from Xbato
 */
export const getXbatoPopularManga = async () => {
  try {
    console.log('Fetching popular manga from Xbato');
    
    const data = await fetchXbatoApi('/api/popular');
    
    if (!Array.isArray(data)) {
      console.log('Unexpected response format');
      return [];
    }
    
    console.log(`Found ${data.length} popular manga`);
    
    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || '',
      coverUrl: item.coverUrl,
      author: item.author || null,
      status: item.status || 'unknown',
      type: 'manga',
      _originalUrl: item.url,
    }));
  } catch (error) {
    console.error('Error fetching popular Xbato manga:', error);
    return [];
  }
};

/**
 * Get manga details from Xbato
 */
export const getXbatoMangaDetails = async (mangaId) => {
  try {
    console.log('Fetching Xbato manga details for ID:', mangaId);
    
    const data = await fetchXbatoApi(`/api/manga/${mangaId}`);
    
    if (!data || !data.id) {
      console.log('No details found');
      return null;
    }
    
    return {
      id: data.id,
      title: data.title,
      description: data.description || '',
      coverUrl: data.coverUrl,
      author: data.author,
      artist: data.artist,
      status: data.status || 'unknown',
      type: 'manga',
      genres: data.genres || [],
      _originalUrl: data.url,
    };
  } catch (error) {
    console.error('Error fetching Xbato manga details:', error);
    return null;
  }
};

/**
 * Get chapters for a manga from Xbato
 */
export const getXbatoChapters = async (mangaId) => {
  try {
    console.log('Fetching Xbato chapters for manga ID:', mangaId);
    
    const data = await fetchXbatoApi(`/api/manga/${mangaId}/chapters`);
    
    if (!Array.isArray(data)) {
      console.log('Unexpected response format');
      return [];
    }
    
    console.log(`Found ${data.length} chapters`);
    
    return data.map((chapter, index) => ({
      id: chapter.id,
      name: chapter.name || `Chapter ${index + 1}`,
      chapter: chapter.chapter || index + 1,
      volume: chapter.volume || null,
      date: chapter.date,
      scanlationGroup: chapter.scanlationGroup,
      _originalUrl: chapter.url,
    }));
  } catch (error) {
    console.error('Error fetching Xbato chapters:', error);
    return [];
  }
};

/**
 * Get chapter pages/images from Xbato
 */
export const getXbatoChapterPages = async (chapterId) => {
  try {
    console.log('Fetching Xbato chapter pages for chapter ID:', chapterId);
    
    const data = await fetchXbatoApi(`/api/chapter/${chapterId}/images`);
    
    if (!Array.isArray(data)) {
      console.log('Unexpected response format');
      return [];
    }
    
    console.log(`Found ${data.length} pages`);
    
    return data.map((image, index) => ({
      url: image.url,
      page: image.page || index + 1,
    }));
  } catch (error) {
    console.error('Error fetching Xbato chapter pages:', error);
    return [];
  }
};

/**
 * Test connection to backend
 */
export const testXbatoConnection = async () => {
  try {
    const response = await fetch(API_BASE_URL);
    const data = await response.json();
    console.log('Backend connection test:', data);
    return data.status === 'online';
  } catch (error) {
    console.error('Backend connection failed:', error);
    return false;
  }
};
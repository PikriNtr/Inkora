/**
 * Service to fetch manga/manhwa data from multiple sources
 * Supports: MangaDex, Bato
 */

import * as BatoService from './batoService';
import { GET, parseJSON } from './networkUtils';

const MANGADEX_API_BASE = 'https://api.mangadex.org';

/**
 * Check if source is Bato related
 */
const isBatoSource = (source) => {
  if (!source || !source.baseUrl) return false;
  const url = source.baseUrl.toLowerCase();
  return url.includes('bato') || 
         url.includes('ruru.to') || 
         url.includes('xdxd.to') || 
         url.includes('batocc.com') ||
         url.includes('mto.to');
};

/**
 * Search for manga from any supported source
 */
export const searchManga = async (source, query) => {
  try {
    console.log('[MangaService] Searching manga with source:', source?.name);
    
    // Check if Bato source
    if (isBatoSource(source)) {
      console.log('[MangaService] Using Bato service for search');
      return await BatoService.searchBatoManga(query);
    }
    
    // Check if MangaDex source
    if (!source.baseUrl.includes('mangadex')) {
      console.log(`[MangaService] Source ${source.name} not supported yet`);
      return [];
    }

    const url = `${MANGADEX_API_BASE}/manga?title=${encodeURIComponent(query)}&limit=20&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&order[relevance]=desc`;
    
    const response = await GET(url, {}, { maxRetries: 2, checkCloudflare: false });
    const data = await parseJSON(response);
    
    return data.data.map(manga => ({
      id: manga.id,
      title: manga.attributes.title.en || 
             manga.attributes.title['ja-ro'] || 
             manga.attributes.title[Object.keys(manga.attributes.title)[0]],
      description: manga.attributes.description.en || 
                   manga.attributes.description[Object.keys(manga.attributes.description)[0]] || '',
      coverUrl: getCoverUrl(manga),
      author: getAuthor(manga.relationships),
      status: manga.attributes.status,
      contentRating: manga.attributes.contentRating,
    }));
  } catch (error) {
    console.error('[MangaService] Error searching manga:', error.message);
    return [];
  }
};

/**
 * Get popular manga from any supported source
 */
export const getPopularManga = async (source) => {
  try {
    console.log('[MangaService] Getting popular manga with source:', source?.name);
    
    // Check if Bato source
    if (isBatoSource(source)) {
      console.log('[MangaService] Using Bato service for popular manga');
      return await BatoService.getBatoPopularManga();
    }
    
    // Check if MangaDex source
    if (!source.baseUrl.includes('mangadex')) {
      console.log(`[MangaService] Source ${source.name} not supported yet`);
      return [];
    }

    const url = `${MANGADEX_API_BASE}/manga?limit=20&includes[]=cover_art&includes[]=author&includes[]=artist&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&order[followedCount]=desc`;
    
    const response = await GET(url, {}, { maxRetries: 2, checkCloudflare: false });
    const data = await parseJSON(response);
    
    return data.data.map(manga => ({
      id: manga.id,
      title: manga.attributes.title.en || 
             manga.attributes.title['ja-ro'] || 
             manga.attributes.title[Object.keys(manga.attributes.title)[0]],
      description: manga.attributes.description.en || 
                   manga.attributes.description[Object.keys(manga.attributes.description)[0]] || '',
      coverUrl: getCoverUrl(manga),
      author: getAuthor(manga.relationships),
      status: manga.attributes.status,
      contentRating: manga.attributes.contentRating,
    }));
  } catch (error) {
    console.error('[MangaService] Error fetching popular manga:', error.message);
    return [];
  }
};

/**
 * Get manga details from any supported source
 */
export const getMangaDetails = async (source, mangaId) => {
  try {
    console.log('[MangaService] Getting manga details with source:', source?.name);
    
    // Check if Bato source
    if (isBatoSource(source)) {
      console.log('[MangaService] Using Bato service for manga details');
      return await BatoService.getBatoMangaDetails(mangaId);
    }
    
    // Check if MangaDex source
    if (!source.baseUrl.includes('mangadex')) {
      console.log(`[MangaService] Source ${source.name} not supported yet`);
      return null;
    }

    const url = `${MANGADEX_API_BASE}/manga/${mangaId}?includes[]=cover_art&includes[]=author&includes[]=artist`;
    
    const response = await GET(url, {}, { maxRetries: 2, checkCloudflare: false });
    const data = await parseJSON(response);
    const manga = data.data;
    
    return {
      id: manga.id,
      title: manga.attributes.title.en || 
             manga.attributes.title['ja-ro'] || 
             manga.attributes.title[Object.keys(manga.attributes.title)[0]],
      description: manga.attributes.description.en || 
                   manga.attributes.description[Object.keys(manga.attributes.description)[0]] || '',
      coverUrl: getCoverUrl(manga),
      author: getAuthor(manga.relationships),
      artist: getArtist(manga.relationships),
      status: manga.attributes.status,
      contentRating: manga.attributes.contentRating,
      tags: manga.attributes.tags.map(tag => tag.attributes.name.en),
    };
  } catch (error) {
    console.error('[MangaService] Error fetching manga details:', error.message);
    return null;
  }
};

/**
 * Get chapters for a manga from any supported source
 */
export const getChapters = async (source, mangaId) => {
  try {
    console.log('[MangaService] Getting chapters with source:', source?.name);
    
    // Check if Bato source
    if (isBatoSource(source)) {
      console.log('[MangaService] Using Bato service for chapters');
      return await BatoService.getBatoChapters(mangaId);
    }
    
    // Check if MangaDex source
    if (!source.baseUrl.includes('mangadex')) {
      console.log(`[MangaService] Source ${source.name} not supported yet`);
      return [];
    }

    // Fetch chapters with pagination
    let allChapters = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore && offset < 500) { // Limit to 500 chapters max
      const url = `${MANGADEX_API_BASE}/manga/${mangaId}/feed?limit=${limit}&offset=${offset}&includes[]=scanlation_group&order[chapter]=desc&translatedLanguage[]=en`;
      
      const response = await GET(url, {}, { maxRetries: 2, checkCloudflare: false });
      const data = await parseJSON(response);
      
      const chapters = data.data.map(chapter => ({
        id: chapter.id,
        name: chapter.attributes.title 
          ? `Chapter ${chapter.attributes.chapter || '?'}: ${chapter.attributes.title}`
          : `Chapter ${chapter.attributes.chapter || '?'}`,
        chapter: chapter.attributes.chapter,
        volume: chapter.attributes.volume,
        date: new Date(chapter.attributes.publishAt).toLocaleDateString(),
        scanlationGroup: getScanlationGroup(chapter.relationships),
        pages: chapter.attributes.pages,
      }));
      
      allChapters = allChapters.concat(chapters);
      
      hasMore = data.data.length === limit;
      offset += limit;
    }
    
    return allChapters;
  } catch (error) {
    console.error('[MangaService] Error fetching chapters:', error.message);
    return [];
  }
};

/**
 * Get chapter pages/images from any supported source
 */
export const getChapterPages = async (source, chapterId) => {
  try {
    console.log('[MangaService] Getting chapter pages with source:', source?.name);
    
    // Check if Bato source
    if (isBatoSource(source)) {
      console.log('[MangaService] Using Bato service for chapter pages');
      return await BatoService.getBatoChapterPages(chapterId);
    }
    
    // Check if MangaDex source
    if (!source.baseUrl.includes('mangadex')) {
      console.log(`[MangaService] Source ${source.name} not supported yet`);
      return [];
    }

    // Get chapter data with baseUrl
    const url = `${MANGADEX_API_BASE}/at-home/server/${chapterId}`;
    
    const response = await GET(url, {}, { maxRetries: 2, checkCloudflare: false });
    const data = await parseJSON(response);
    const baseUrl = data.baseUrl;
    const chapterHash = data.chapter.hash;
    const pageFiles = data.chapter.data; // High quality images
    
    return pageFiles.map((filename, index) => ({
      url: `${baseUrl}/data/${chapterHash}/${filename}`,
      page: index + 1,
    }));
  } catch (error) {
    console.error('[MangaService] Error fetching chapter pages:', error.message);
    return [];
  }
};

/**
 * Helper function to get cover URL
 */
const getCoverUrl = (manga) => {
  const coverRelation = manga.relationships.find(rel => rel.type === 'cover_art');
  if (coverRelation && coverRelation.attributes) {
    const fileName = coverRelation.attributes.fileName;
    return `https://uploads.mangadex.org/covers/${manga.id}/${fileName}.512.jpg`;
  }
  return null;
};

/**
 * Helper function to get author name
 */
const getAuthor = (relationships) => {
  const authorRelation = relationships.find(rel => rel.type === 'author');
  if (authorRelation && authorRelation.attributes) {
    return authorRelation.attributes.name;
  }
  return null;
};

/**
 * Helper function to get artist name
 */
const getArtist = (relationships) => {
  const artistRelation = relationships.find(rel => rel.type === 'artist');
  if (artistRelation && artistRelation.attributes) {
    return artistRelation.attributes.name;
  }
  return null;
};

/**
 * Helper function to get scanlation group
 */
const getScanlationGroup = (relationships) => {
  const groupRelation = relationships.find(rel => rel.type === 'scanlation_group');
  if (groupRelation && groupRelation.attributes) {
    return groupRelation.attributes.name;
  }
  return null;
};
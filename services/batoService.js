/**
 * Service for Bato manga source with web scraping
 * Supports multiple Bato domains with Cloudflare bypass
 */

// Bato base URLs (they change domains frequently)
const BATO_DOMAINS = [

  'https://bato.to',
  'https://battwo.com',
  'https://mto.to',
];

let CURRENT_BATO_URL = BATO_DOMAINS[0];

/**
 * User agent to bypass basic bot detection (mimics latest Chrome on Android)
 */
const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36';

/**
 * Helper to extract text content from HTML
 */
const extractText = (html, selector) => {
  try {
    const regex = new RegExp(`${selector}[^>]*>([^<]+)<`, 'i');
    const match = html.match(regex);
    return match ? match[1].trim() : null;
  } catch (error) {
    return null;
  }
};

/**
 * Helper to extract attribute from HTML
 */
const extractAttr = (html, selector, attr) => {
  try {
    const regex = new RegExp(`${selector}[^>]*${attr}=["']([^"']+)["']`, 'i');
    const match = html.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
};

/**
 * Helper to extract all matches
 */
const extractAll = (html, pattern) => {
  try {
    const regex = new RegExp(pattern, 'gi');
    const matches = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
      matches.push(match);
    }
    return matches;
  } catch (error) {
    return [];
  }
};

/**
 * Cloudflare bypass fetch with retry mechanism
 * Implements timeout and retry logic similar to Mihon
 */
const cloudflareBypassFetch = async (url, options = {}) => {
  const maxRetries = 3;
  const timeoutMs = 30000; // 30 second timeout like Mihon
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1} to fetch: ${url}`);

      // Create AbortController for timeout (like Mihon's timeout handling)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const fetchOptions = {
        signal: controller.signal,
        method: options.method || 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...options.headers,
        },
        credentials: 'include', // Important for cookie handling
        redirect: 'follow',
        ...options,
      };

      const response = await fetch(url, fetchOptions);

      const serverHeader = response.headers.get('server') || '';
      console.log(`Response status: ${response.status}, Server: ${serverHeader}`);

      // Check for Cloudflare challenge (like Mihon does)
      if ((response.status === 403 || response.status === 503) && 
          (serverHeader.toLowerCase().includes('cloudflare') || serverHeader.toLowerCase().includes('cloudflare-nginx'))) {
        const text = await response.text();
        // Check for Cloudflare challenge markers
        if (text.includes('cloudflare') || 
            text.includes('cf-browser-verification') ||
            text.includes('window._cf_chl_opt') ||
            text.includes('challenge-platform')) {
          console.log('Cloudflare challenge detected, waiting before retry...');
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
          continue;
        }
      }

      // Clear timeout on success
      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      console.error(`Fetch attempt ${attempt + 1} failed:`, error.message);
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const backoffTime = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }

  const errorMessage = `All ${maxRetries} fetch attempts failed for ${url}`;
  console.error(errorMessage);
  throw lastError || new Error(errorMessage);
};

/**
 * Try multiple Bato domains
 */
const tryBatoDomains = async (path, options = {}) => {
  for (const domain of BATO_DOMAINS) {
    try {
      const url = `${domain}${path}`;
      console.log(`Trying domain: ${domain}`);
      const response = await cloudflareBypassFetch(url, options);
      
      if (response.ok) {
        console.log(`Success with domain: ${domain}`);
        CURRENT_BATO_URL = domain;
        return response;
      }
    } catch (error) {
      console.log(`Failed with domain ${domain}, trying next...`);
    }
  }
  
  throw new Error('All Bato domains failed');
};

/**
 * Parse manga card from HTML
 */
const parseMangaCard = (html) => {
  try {
    // Extract manga ID/URL from various possible formats
    const urlMatch = html.match(/href=["']\/series\/([^"'\/]+)[^"']*["']/i) ||
                    html.match(/href=["']([^"']*\/title\/[^"']+)["']/i) ||
                    html.match(/href=["']([^"']*\/series\/[^"']+)["']/i);
    
    let id = null;
    let url = null;
    
    if (urlMatch) {
      if (urlMatch[1].startsWith('/')) {
        url = urlMatch[1];
        id = url.split('/').filter(Boolean).pop();
      } else if (urlMatch[1].includes('/series/') || urlMatch[1].includes('/title/')) {
        url = urlMatch[1];
        id = url.split('/').filter(Boolean).pop();
      } else {
        id = urlMatch[1];
        url = `/series/${id}`;
      }
    }

    // Extract title from various sources
    const titleMatch = html.match(/class=["'][^"']*(?:title|name)[^"']*["'][^>]*>([^<]+)</i) ||
                      html.match(/alt=["']([^"']+)["']/i) ||
                      html.match(/title=["']([^"']+)["']/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown Title';

    // Extract cover image
    const coverMatch = html.match(/src=["']([^"']*(?:cover|thumb|image)[^"']*)["']/i) ||
                      html.match(/<img[^>]*data-src=["']([^"']+)["']/i) ||
                      html.match(/<img[^>]*src=["']([^"']+)["']/i);
    let coverUrl = coverMatch ? coverMatch[1] : null;
    
    // Make sure cover URL is absolute
    if (coverUrl && !coverUrl.startsWith('http')) {
      coverUrl = coverUrl.startsWith('/') ? `${CURRENT_BATO_URL}${coverUrl}` : `${CURRENT_BATO_URL}/${coverUrl}`;
    }

    // Extract chapter count
    const chaptersMatch = html.match(/(\d+)\s*(?:ch|chapters?)/i);
    const chapters = chaptersMatch ? parseInt(chaptersMatch[1]) : null;

    return {
      id,
      url: url ? (url.startsWith('http') ? url : `${CURRENT_BATO_URL}${url}`) : null,
      title,
      coverUrl,
      chapters,
    };
  } catch (error) {
    console.error('Error parsing manga card:', error);
    return null;
  }
};

/**
 * Search manga on Bato
 */
export const searchBatoManga = async (query) => {
  try {
    console.log('Searching Bato for:', query);

    const searchPath = `/search?word=${encodeURIComponent(query)}`;
    const response = await tryBatoDomains(searchPath);
    const html = await response.text();

    // Extract manga items from search results - multiple possible class names
    const mangaPatterns = [
      /<div[^>]*class=["'][^"']*(?:item-|manga-|series-)[^"']*["'][^>]*>[\s\S]*?(?=<div[^>]*class=["'][^"']*(?:item-|manga-|series-)|$)/gi,
      /<a[^>]*class=["'][^"']*(?:item|card)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
    ];

    let mangaCards = [];
    for (const pattern of mangaPatterns) {
      mangaCards = extractAll(html, pattern);
      if (mangaCards.length > 0) {
        console.log(`Found ${mangaCards.length} results with pattern`);
        break;
      }
    }

    const results = [];
    for (const cardMatch of mangaCards) {
      const card = cardMatch[0];
      const manga = parseMangaCard(card);
      
      if (manga && manga.id) {
        results.push({
          id: manga.id,
          title: manga.title,
          coverUrl: manga.coverUrl,
          description: '',
          author: null,
          status: 'unknown',
        });
      }
    }

    console.log(`Parsed ${results.length} valid results`);
    return results.slice(0, 20);
  } catch (error) {
    console.error('Error searching Bato manga:', error);
    return [];
  }
};

/**
 * Get popular manga from Bato
 */
export const getBatoPopularManga = async () => {
  try {
    console.log('Fetching popular manga from Bato');

    // Try multiple paths for popular manga
    const paths = [
      '/browse',
      '/browse?sort=views',
      '/browse?sort=popular',
      '/popular',
      '/',
    ];

    let html = '';
    for (const path of paths) {
      try {
        console.log(`Trying path: ${path}`);
        const response = await tryBatoDomains(path);
        html = await response.text();
        if (html.length > 1000) break; // Got valid content
      } catch (error) {
        console.log(`Path ${path} failed, trying next...`);
      }
    }

    if (!html) {
      console.log('Failed to get any content');
      return [];
    }

    // Extract manga items - try multiple patterns
    const mangaPatterns = [
      /<div[^>]*class=["'][^"']*(?:item-|manga-|series-)[^"']*["'][^>]*>[\s\S]*?(?=<div[^>]*class=["'][^"']*(?:item-|manga-|series-)|$)/gi,
      /<a[^>]*class=["'][^"']*(?:item|card)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
      /<article[^>]*>[\s\S]*?<\/article>/gi,
    ];

    let mangaCards = [];
    for (const pattern of mangaPatterns) {
      mangaCards = extractAll(html, pattern);
      if (mangaCards.length > 0) {
        console.log(`Found ${mangaCards.length} manga with pattern`);
        break;
      }
    }

    const results = [];
    for (const cardMatch of mangaCards) {
      const card = cardMatch[0];
      const manga = parseMangaCard(card);
      
      if (manga && manga.id) {
        results.push({
          id: manga.id,
          title: manga.title,
          coverUrl: manga.coverUrl,
          description: '',
          author: null,
          status: 'unknown',
        });
      }
    }

    console.log(`Parsed ${results.length} popular manga`);
    return results.slice(0, 20);
  } catch (error) {
    console.error('Error fetching popular Bato manga:', error);
    return [];
  }
};

/**
 * Get manga details from Bato
 */
export const getBatoMangaDetails = async (mangaId) => {
  try {
    console.log('Fetching Bato manga details for ID:', mangaId);

    const paths = [
      `/series/${mangaId}`,
      `/title/${mangaId}`,
      `/manga/${mangaId}`,
    ];

    let html = '';
    for (const path of paths) {
      try {
        const response = await tryBatoDomains(path);
        html = await response.text();
        if (html.length > 1000) break;
      } catch (error) {
        console.log(`Path ${path} failed, trying next...`);
      }
    }

    // Extract title
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                      html.match(/<h3[^>]*class=["'][^"']*title[^"']*["'][^>]*>([^<]+)</i) ||
                      html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim().replace(/\s*[-|]\s*Bato.*$/i, '') : 'Unknown Title';

    // Extract cover
    const coverMatch = html.match(/<img[^>]*class=["'][^"']*(?:cover|poster)[^"']*["'][^>]*src=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    let coverUrl = coverMatch ? coverMatch[1] : null;
    if (coverUrl && !coverUrl.startsWith('http')) {
      coverUrl = `${CURRENT_BATO_URL}${coverUrl}`;
    }

    // Extract description
    const descMatch = html.match(/<div[^>]*class=["'][^"']*(?:summary|description|synopsis)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i) ||
                     html.match(/<p[^>]*class=["'][^"']*(?:summary|description)[^"']*["'][^>]*>([\s\S]*?)<\/p>/i) ||
                     html.match(/<meta[^>]*(?:name|property)=["'](?:description|og:description)["'][^>]*content=["']([^"']+)["']/i);
    let description = '';
    if (descMatch) {
      description = descMatch[1].replace(/<[^>]+>/g, '').replace(/&[^;]+;/g, ' ').trim();
    }

    // Extract author/artist
    const authorMatch = html.match(/(?:Author|Writer)[^<]*<[^>]*>([^<]+)</i) ||
                       html.match(/class=["'][^"']*author[^"']*["'][^>]*>([^<]+)</i);
    const author = authorMatch ? authorMatch[1].trim() : null;

    const artistMatch = html.match(/(?:Artist|Illustrator)[^<]*<[^>]*>([^<]+)</i);
    const artist = artistMatch ? artistMatch[1].trim() : null;

    // Extract status
    const statusMatch = html.match(/(?:Status|Publication)[^<]*<[^>]*>([^<]+)</i) ||
                       html.match(/class=["'][^"']*status[^"']*["'][^>]*>([^<]+)</i);
    const status = statusMatch ? statusMatch[1].trim().toLowerCase() : 'unknown';

    // Extract genres/tags
    const genresPattern = /class=["'][^"']*(?:genre|tag)[^"']*["'][^>]*>([^<]+)</gi;
    const genreMatches = extractAll(html, genresPattern);
    const genres = genreMatches.map(m => m[1].trim());

    return {
      id: mangaId,
      title,
      description,
      coverUrl,
      author: author || artist,
      artist,
      status,
      genres,
    };
  } catch (error) {
    console.error('Error fetching Bato manga details:', error);
    return null;
  }
};

/**
 * Get chapters for a manga from Bato
 */
export const getBatoChapters = async (mangaId) => {
  try {
    console.log('Fetching Bato chapters for manga ID:', mangaId);

    const paths = [
      `/series/${mangaId}`,
      `/title/${mangaId}`,
      `/manga/${mangaId}`,
    ];

    let html = '';
    for (const path of paths) {
      try {
        const response = await tryBatoDomains(path);
        html = await response.text();
        if (html.length > 1000) break;
      } catch (error) {
        console.log(`Path ${path} failed, trying next...`);
      }
    }

    // Extract chapter list - try multiple patterns
    const chapterPatterns = [
      /<div[^>]*class=["'][^"']*(?:episode|chapter)[^"']*["'][^>]*>[\s\S]*?(?=<div[^>]*class=["'][^"']*(?:episode|chapter)|$)/gi,
      /<a[^>]*class=["'][^"']*chapter[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
      /<li[^>]*class=["'][^"']*chapter[^"']*["'][^>]*>[\s\S]*?<\/li>/gi,
    ];

    let chapterCards = [];
    for (const pattern of chapterPatterns) {
      chapterCards = extractAll(html, pattern);
      if (chapterCards.length > 0) {
        console.log(`Found ${chapterCards.length} chapters with pattern`);
        break;
      }
    }

    const chapters = [];
    for (const cardMatch of chapterCards) {
      const card = cardMatch[0];

      // Extract chapter URL and ID
      const urlMatch = card.match(/href=["']\/(?:chapter|read)\/([^"'\/]+)[^"']*["']/i) ||
                      card.match(/href=["']([^"']*\/(?:chapter|read)\/[^"']+)["']/i);
      
      let chapterId = null;
      if (urlMatch) {
        if (urlMatch[1].startsWith('/')) {
          chapterId = urlMatch[1].split('/').filter(Boolean).pop();
        } else if (urlMatch[1].includes('/chapter/') || urlMatch[1].includes('/read/')) {
          chapterId = urlMatch[1].split('/').filter(Boolean).pop();
        } else {
          chapterId = urlMatch[1];
        }
      }

      if (!chapterId) continue;

      // Extract chapter name/title
      const nameMatch = card.match(/class=["'][^"']*(?:title|name)[^"']*["'][^>]*>([^<]+)</i) ||
                       card.match(/>(?:Chapter|Ch\.?)\s*([\d.]+)[^<]*/i) ||
                       card.match(/Chapter\s+([\d.]+)/i);
      
      let name = 'Unknown Chapter';
      let chapterNum = null;
      
      if (nameMatch) {
        const matched = nameMatch[1].trim();
        // Check if it's just a number or includes full title
        if (/^[\d.]+$/.test(matched)) {
          chapterNum = matched;
          name = `Chapter ${matched}`;
        } else {
          name = matched;
          const numMatch = matched.match(/([\d.]+)/);
          chapterNum = numMatch ? numMatch[1] : null;
        }
      }

      // Extract date
      const dateMatch = card.match(/datetime=["']([^"']+)["']/i) ||
                       card.match(/class=["'][^"']*date[^"']*["'][^>]*>([^<]+)</i) ||
                       card.match(/(\d{4}-\d{2}-\d{2})/);
      let date = null;
      if (dateMatch) {
        try {
          date = new Date(dateMatch[1]).toLocaleDateString();
        } catch (e) {
          date = dateMatch[1];
        }
      }

      // Extract scanlation group
      const groupMatch = card.match(/class=["'][^"']*(?:group|team)[^"']*["'][^>]*>([^<]+)</i);
      const group = groupMatch ? groupMatch[1].trim() : null;

      chapters.push({
        id: chapterId,
        name,
        chapter: chapterNum,
        volume: null,
        date,
        scanlationGroup: group,
      });
    }

    // Sort chapters by number (descending - newest first)
    chapters.sort((a, b) => {
      const numA = parseFloat(a.chapter) || 0;
      const numB = parseFloat(b.chapter) || 0;
      return numB - numA;
    });

    console.log(`Parsed ${chapters.length} chapters`);
    return chapters;
  } catch (error) {
    console.error('Error fetching Bato chapters:', error);
    return [];
  }
};

/**
 * Get chapter pages/images from Bato
 */
export const getBatoChapterPages = async (chapterId) => {
  try {
    console.log('Fetching Bato chapter pages for chapter ID:', chapterId);

    const paths = [
      `/chapter/${chapterId}`,
      `/read/${chapterId}`,
    ];

    let html = '';
    for (const path of paths) {
      try {
        const response = await tryBatoDomains(path);
        html = await response.text();
        if (html.length > 1000) break;
      } catch (error) {
        console.log(`Path ${path} failed, trying next...`);
      }
    }

    // Method 1: Extract from JavaScript data
    const jsPatterns = [
      /const\s+images\s*=\s*(\[[\s\S]*?\]);/i,
      /var\s+images\s*=\s*(\[[\s\S]*?\]);/i,
      /images:\s*(\[[\s\S]*?\])/i,
      /pageList\s*=\s*(\[[\s\S]*?\])/i,
      /"images":\s*(\[[\s\S]*?\])/i,
    ];

    for (const pattern of jsPatterns) {
      const dataMatch = html.match(pattern);
      if (dataMatch) {
        try {
          let imagesJson = dataMatch[1];
          // Clean up the JSON
          imagesJson = imagesJson.replace(/,\s*\]/g, ']').replace(/,\s*}/g, '}');
          const images = JSON.parse(imagesJson);
          
          if (Array.isArray(images) && images.length > 0) {
            console.log(`Found ${images.length} pages from JavaScript data`);
            
            return images.map((item, index) => {
              const url = typeof item === 'string' ? item : (item.url || item.src || item);
              return {
                url: url.startsWith('http') ? url : `${CURRENT_BATO_URL}${url}`,
                page: index + 1,
              };
            });
          }
        } catch (parseError) {
          console.log('Failed to parse images from JavaScript, trying next pattern...');
        }
      }
    }

    // Method 2: Extract from img tags
    const imgPatterns = [
      /<img[^>]*class=["'][^"']*page[^"']*["'][^>]*src=["']([^"']+)["']/gi,
      /<img[^>]*id=["'][^"']*image[^"']*["'][^>]*src=["']([^"']+)["']/gi,
      /<img[^>]*data-src=["']([^"']+)["'][^>]*class=["'][^"']*page/gi,
    ];

    for (const pattern of imgPatterns) {
      const imgMatches = extractAll(html, pattern);
      if (imgMatches.length > 0) {
        console.log(`Found ${imgMatches.length} pages from HTML img tags`);
        
        return imgMatches.map((match, index) => ({
          url: match[1].startsWith('http') ? match[1] : `${CURRENT_BATO_URL}${match[1]}`,
          page: index + 1,
        }));
      }
    }

    // Method 3: Extract all img tags as last resort
    const allImgMatches = extractAll(html, /<img[^>]*src=["']([^"']+)["']/gi);
    const pageImages = allImgMatches.filter(match => {
      const url = match[1];
      // Filter for image URLs that look like manga pages
      return url.includes('/pages/') || 
             url.includes('/images/') || 
             url.match(/\d+\.(jpg|jpeg|png|webp)/i);
    });

    if (pageImages.length > 0) {
      console.log(`Found ${pageImages.length} pages from all img tags`);
      
      return pageImages.map((match, index) => ({
        url: match[1].startsWith('http') ? match[1] : `${CURRENT_BATO_URL}${match[1]}`,
        page: index + 1,
      }));
    }

    console.log('No pages found');
    return [];
  } catch (error) {
    console.error('Error fetching Bato chapter pages:', error);
    return [];
  }
};

/**
 * Get latest updates from Bato
 */
export const getBatoLatestUpdates = async () => {
  try {
    console.log('Fetching latest updates from Bato');

    const paths = [
      '/browse?sort=update',
      '/latest',
      '/recent',
    ];

    let html = '';
    for (const path of paths) {
      try {
        const response = await tryBatoDomains(path);
        html = await response.text();
        if (html.length > 1000) break;
      } catch (error) {
        console.log(`Path ${path} failed, trying next...`);
      }
    }

    const mangaPatterns = [
      /<div[^>]*class=["'][^"']*(?:item-|manga-|series-)[^"']*["'][^>]*>[\s\S]*?(?=<div[^>]*class=["'][^"']*(?:item-|manga-|series-)|$)/gi,
      /<a[^>]*class=["'][^"']*(?:item|card)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,
    ];

    let mangaCards = [];
    for (const pattern of mangaPatterns) {
      mangaCards = extractAll(html, pattern);
      if (mangaCards.length > 0) break;
    }

    const results = [];
    for (const cardMatch of mangaCards) {
      const card = cardMatch[0];
      const manga = parseMangaCard(card);
      
      if (manga && manga.id) {
        results.push({
          id: manga.id,
          title: manga.title,
          coverUrl: manga.coverUrl,
          description: '',
          author: null,
          status: 'unknown',
        });
      }
    }

    return results.slice(0, 20);
  } catch (error) {
    console.error('Error fetching latest updates:', error);
    return [];
  }
};

/**
 * Test connection to Bato
 */
export const testBatoConnection = async () => {
  try {
    const response = await tryBatoDomains('/');
    return response.ok;
  } catch (error) {
    console.error('Failed to connect to Bato:', error);
    return false;
  }
};
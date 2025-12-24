/**
 * Network utilities module inspired by Mihon's NetworkHelper
 * Provides centralized network configuration, Cloudflare bypass, and error handling
 */

/**
 * Modern User-Agent matching Mihon's WebView UA generation
 * Mimics Chrome on Android for better compatibility
 */
export const DEFAULT_USER_AGENT = 
  'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36';

/**
 * Request timeout constants (matches Mihon's OkHttp timeouts)
 */
export const TIMEOUTS = {
  CONNECT: 30000,    // 30 seconds
  READ: 30000,       // 30 seconds
  CALL: 120000,      // 2 minutes
};

/**
 * Default headers for all requests (inspired by Mihon's header builder)
 */
export const getDefaultHeaders = () => ({
  'User-Agent': DEFAULT_USER_AGENT,
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
});

/**
 * Check if response is from Cloudflare challenge
 * Based on Mihon's CloudflareInterceptor.shouldIntercept()
 */
export const isCloudflareChallenge = (response, responseText = '') => {
  const status = response.status;
  const serverHeader = (response.headers.get('server') || '').toLowerCase();
  
  // Check for Cloudflare error codes and server header
  if ((status === 403 || status === 503) && 
      (serverHeader.includes('cloudflare') || serverHeader.includes('cloudflare-nginx'))) {
    
    // Check for Cloudflare challenge markers
    return responseText.includes('cloudflare') ||
           responseText.includes('cf-browser-verification') ||
           responseText.includes('window._cf_chl_opt') ||
           responseText.includes('challenge-platform') ||
           responseText.includes('cf_clearance');
  }
  
  return false;
};

/**
 * Enhanced fetch with timeout support using AbortController
 * Matches Mihon's timeout handling
 */
export const fetchWithTimeout = async (url, options = {}, timeoutMs = TIMEOUTS.CALL) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
};

/**
 * Fetch with retry mechanism and exponential backoff
 * Inspired by Mihon's retry interceptors and RateLimitInterceptor
 */
export const fetchWithRetry = async (url, options = {}, config = {}) => {
  const {
    maxRetries = 3,
    timeoutMs = TIMEOUTS.CALL,
    checkCloudflare = true,
    onRetry = null,
  } = config;
  
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0 && onRetry) {
        onRetry(attempt, maxRetries);
      }
      
      console.log(`[NetworkUtils] Attempt ${attempt + 1}/${maxRetries} for: ${url}`);
      
      const response = await fetchWithTimeout(url, options, timeoutMs);
      
      const serverHeader = response.headers.get('server') || '';
      console.log(`[NetworkUtils] Response: ${response.status} from ${serverHeader}`);
      
      // Check for Cloudflare challenge
      if (checkCloudflare && (response.status === 403 || response.status === 503)) {
        const text = await response.text();
        
        if (isCloudflareChallenge(response, text)) {
          console.log('[NetworkUtils] Cloudflare challenge detected, retrying...');
          
          if (attempt < maxRetries - 1) {
            // Exponential backoff: 2s, 4s, 8s
            const backoffTime = Math.pow(2, attempt + 1) * 1000;
            console.log(`[NetworkUtils] Waiting ${backoffTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
            continue;
          }
          
          throw new Error('Cloudflare challenge could not be bypassed');
        }
        
        // If it's a 403/503 but not Cloudflare, create a new response with the text
        return new Response(text, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        });
      }
      
      return response;
      
    } catch (error) {
      console.error(`[NetworkUtils] Attempt ${attempt + 1} failed:`, error.message);
      lastError = error;
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const backoffTime = Math.pow(2, attempt) * 1000;
        console.log(`[NetworkUtils] Retrying in ${backoffTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
  
  const errorMessage = `All ${maxRetries} attempts failed for ${url}`;
  console.error(`[NetworkUtils] ${errorMessage}`);
  throw lastError || new Error(errorMessage);
};

/**
 * Make a GET request with all enhancements
 * Similar to Mihon's GET() request builder
 */
export const GET = async (url, customHeaders = {}, config = {}) => {
  const headers = {
    ...getDefaultHeaders(),
    ...customHeaders,
  };
  
  const options = {
    method: 'GET',
    headers,
    credentials: 'include', // Important for cookie handling
    redirect: 'follow',
  };
  
  return fetchWithRetry(url, options, config);
};

/**
 * Make a POST request with all enhancements
 */
export const POST = async (url, body, customHeaders = {}, config = {}) => {
  const headers = {
    ...getDefaultHeaders(),
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  
  const options = {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    credentials: 'include',
    redirect: 'follow',
  };
  
  return fetchWithRetry(url, options, config);
};

/**
 * Parse JSON response with error handling
 * Similar to Mihon's Response.parseAs<T>()
 */
export const parseJSON = async (response) => {
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
  }
  
  const text = await response.text();
  
  if (!text || text.trim().length === 0) {
    return null;
  }
  
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('[NetworkUtils] JSON parse error:', error.message);
    console.error('[NetworkUtils] Response text:', text.substring(0, 200));
    throw new Error(`Failed to parse JSON: ${error.message}`);
  }
};

/**
 * Rate limiter class inspired by Mihon's RateLimitInterceptor
 */
export class RateLimiter {
  constructor(permits, periodMs) {
    this.permits = permits;
    this.periodMs = periodMs;
    this.requestQueue = [];
  }
  
  async acquire() {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requestQueue = this.requestQueue.filter(
      timestamp => now - timestamp < this.periodMs
    );
    
    // If we've hit the limit, wait
    if (this.requestQueue.length >= this.permits) {
      const oldestRequest = this.requestQueue[0];
      const waitTime = this.periodMs - (now - oldestRequest);
      
      if (waitTime > 0) {
        console.log(`[RateLimiter] Rate limit reached, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.acquire(); // Try again
      }
    }
    
    // Add current request
    this.requestQueue.push(now);
  }
}

/**
 * Create a rate-limited fetch function
 * Usage: const limitedFetch = createRateLimitedFetch(5, 1000); // 5 requests per second
 */
export const createRateLimitedFetch = (permits, periodMs) => {
  const limiter = new RateLimiter(permits, periodMs);
  
  return async (url, options = {}, config = {}) => {
    await limiter.acquire();
    return fetchWithRetry(url, options, config);
  };
};

/**
 * Helper to extract domain from URL
 */
export const getDomain = (url) => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
};

/**
 * Check if URL is valid
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Ensure URL is absolute
 */
export const ensureAbsoluteUrl = (url, baseUrl) => {
  if (!url) return null;
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  try {
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    }
    
    return new URL(url, baseUrl).href;
  } catch (error) {
    console.error('[NetworkUtils] Invalid URL:', url, 'Base:', baseUrl);
    return null;
  }
};

/**
 * Network error types for better error handling
 */
export class NetworkError extends Error {
  constructor(message, statusCode = null, cause = null) {
    super(message);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

export class CloudflareError extends NetworkError {
  constructor(message = 'Cloudflare challenge could not be bypassed') {
    super(message, 403);
    this.name = 'CloudflareError';
  }
}

export class TimeoutError extends NetworkError {
  constructor(message = 'Request timeout') {
    super(message, 408);
    this.name = 'TimeoutError';
  }
}

/**
 * Aggregate NetworkUtils object for convenient imports
 */
export const NetworkUtils = {
  DEFAULT_USER_AGENT,
  TIMEOUTS,
  getDefaultHeaders,
  isCloudflareChallenge,
  fetchWithTimeout,
  fetchWithRetry,
  GET,
  POST,
  parseJSON,
  RateLimiter,
  createRateLimitedFetch,
  getDomain,
  isValidUrl,
  ensureAbsoluteUrl,
  NetworkError,
  CloudflareError,
  TimeoutError,
};

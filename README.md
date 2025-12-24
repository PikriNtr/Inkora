# Inkora

A mobile manga and manhwa reading app built with Expo, inspired by Tachiyomi/Mihon. Browse, search, and read manga from multiple sources.

## Features

- Multiple manga sources (Bato, Xbato, MangaDex)
- Advanced search and filtering
- Full-screen reader with progress tracking
- Library management with categories
- Reading history and progress saving
- Smart caching for better performance
- Cloudflare detection and bypass
- Multi-language support

## Prerequisites

- Node.js v14+
- npm or yarn
- Expo CLI
- Expo Go app (for mobile testing)

## Installation

```bash
# Clone or download the project
cd inkora

# Install dependencies
npm install
```

## Quick Start

```bash
# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on Web
npm run web
```

Scan the QR code with Expo Go app to test on your mobile device.

## Project Structure

```
inkora/
├── screens/          # App screens
├── services/         # Core services and business logic
├── constants/        # App constants
├── backend/          # Optional backend server
└── App.js            # Main app component
```

## Key Services

- **networkUtils**: Network layer with Cloudflare detection
- **sourceManager**: Manages manga sources
- **cacheManager**: Multi-layer caching system
- **storageService**: Library, history, and preferences
- **filterSystem**: Advanced filtering
- **imageLoader**: Image loading with preloading
- **extensionService**: Extension management

## Usage Example

```javascript
import { SourceManager, addToLibrary } from './services';

// Search manga
const source = SourceManager.getSource('bato');
const results = await source.searchManga('one piece');

// Add to library
await addToLibrary(results[0]);
```

## Documentation

- [Guides.md](./Guides.md) - Comprehensive Fully Documentation

## Architecture

The app uses a clean layered architecture:

```
UI Layer (Screens)
    ↓
Service Layer (Network, Cache, Storage)
    ↓
Data Layer (Sources, APIs)
```

Services are initialized on app startup and available throughout the app via imports.

## Requirements

- @react-native-async-storage/async-storage
- expo-file-system
- @react-navigation packages
- React Native & Expo

## Development

### Adding a New Source

1. Create a service file in `services/`
2. Implement the source interface (searchManga, getMangaDetails, getChapters, etc.)
3. Register in sourceManager.js

### Adding Custom Filters

Define filters in filterSystem.js and apply them during searches.

## Testing

Manual checklist:
- App initializes without errors
- Search functionality works
- Library operations work (add, remove, update)
- Reading progress saves correctly
- Cache stores and retrieves data
- Multiple sources accessible

## Configuration

Edit timeout values in `services/networkUtils.js`:
```javascript
export const TIMEOUTS = {
  connect: 30000,  // 30 seconds
  read: 30000,
  call: 120000,    // 2 minutes
};
```

Edit cache settings in `services/cacheManager.js`:
```javascript
const DEFAULT_MAX_SIZE = 100;    // Memory cache entries
const DEFAULT_TTL = 3600;        // 1 hour
```

## Performance

- LRU memory cache with automatic cleanup
- Multi-layer caching (memory + disk)
- Exponential backoff retry for network requests
- Image preloading with quality presets
- Rate limiting per host

## Troubleshooting

**App won't start**: Check console for initialization errors. Ensure all dependencies are installed.

**Images not loading**: Verify network connectivity. Check source URLs. Try clearing cache.

**Cache issues**: Clear app cache and retry. Check FileSystem permissions.

See console logs prefixed with `[App]`, `[Services]`, etc. for debugging.

## Acknowledgments

- Inspired by [Tachiyomi](https://github.com/tachiyomiorg/tachiyomi) and [Mihon](https://github.com/mihonapp/mihon)
- Built with React Native and Expo

## Next Steps

- Update existing screens to use new services
- Add settings screen for preferences
- Implement download manager
- Add extension marketplace
- Implement tracking integration (MAL, AniList)

---

For detailed documentation, see [Guides.md](./Guides.md).

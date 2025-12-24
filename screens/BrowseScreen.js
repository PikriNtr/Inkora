import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { searchManga, getPopularManga } from '../services/mangaService';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function BrowseScreen({ route, navigation }) {
  const { source } = route.params || {};
  const [mangaList, setMangaList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (source) {
      loadPopularManga();
    }
  }, [source]);

  const loadPopularManga = async () => {
    if (!source) return;
    
    setLoading(true);
    try {
      const data = await getPopularManga(source);
      setMangaList(data);
    } catch (error) {
      console.error('Error loading popular manga:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!source || !searchQuery.trim()) {
      loadPopularManga();
      return;
    }

    setLoading(true);
    try {
      const data = await searchManga(source, searchQuery);
      setMangaList(data);
    } catch (error) {
      console.error('Error searching manga:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMangaItem = ({ item }) => (
    <TouchableOpacity
      style={styles.mangaItem}
      onPress={() => navigation.navigate('MangaDetails', { manga: item, source })}
    >
      <View style={styles.mangaThumbnail}>
        {item.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.thumbnailPlaceholder}>📚</Text>
        )}
      </View>
      <View style={styles.mangaInfo}>
        <Text style={styles.mangaTitle} numberOfLines={2}>
          {item.title || 'Manga Title'}
        </Text>
        {item.author && (
          <Text style={styles.mangaAuthor} numberOfLines={1}>
            {item.author}
          </Text>
        )}
        {item.description && (
          <Text style={styles.mangaDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{source?.name || 'Browse'}</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search manga..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          placeholderTextColor={colors.textTertiary}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={mangaList}
          renderItem={renderMangaItem}
          keyExtractor={(item, index) => `${item.id || index}-${index}`}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No results found'
                  : 'No manga available. Try searching or select a different source.'}
              </Text>
              {!source?.baseUrl?.includes('mangadex') && (
                <Text style={styles.emptySubtext}>
                  Note: Only MangaDex is currently supported.
                </Text>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    fontFamily: 'Poppins-Bold',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    marginRight: spacing.sm,
    fontFamily: 'Poppins-Regular',
  },
  searchButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  listContent: {
    padding: spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  mangaItem: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mangaThumbnail: {
    width: '100%',
    aspectRatio: 0.7,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    fontSize: 48,
  },
  mangaInfo: {
    padding: 12,
  },
  mangaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  mangaAuthor: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    fontFamily: 'Poppins-Regular',
  },
  mangaDescription: {
    fontSize: 11,
    color: colors.textTertiary,
    lineHeight: 16,
    fontFamily: 'Poppins-Regular',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontFamily: 'Poppins-Regular',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    fontFamily: 'Poppins-Regular',
  },
});

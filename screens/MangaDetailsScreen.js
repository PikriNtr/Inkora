import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { getMangaDetails, getChapters } from '../services/mangaService';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function MangaDetailsScreen({ route, navigation }) {
  const { manga, source } = route.params || {};
  const [details, setDetails] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    loadMangaDetails();
  }, [manga, source]);

  const loadMangaDetails = async () => {
    if (!manga || !source) return;

    setLoading(true);
    try {
      const mangaDetails = await getMangaDetails(source, manga.id);
      const chaptersList = await getChapters(source, manga.id);
      setDetails(mangaDetails || manga);
      setChapters(chaptersList);
    } catch (error) {
      console.error('Error loading manga details:', error);
      setDetails(manga);
    } finally {
      setLoading(false);
    }
  };

  const handleChapterPress = (chapter) => {
    navigation.navigate('Reader', { chapter, source, manga: details || manga });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.thumbnailContainer}>
          <View style={styles.thumbnail}>
            {details?.coverUrl || manga?.coverUrl ? (
              <Image
                source={{ uri: details?.coverUrl || manga?.coverUrl }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.thumbnailPlaceholder}>📚</Text>
            )}
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title}>{details?.title || manga?.title || 'Manga Title'}</Text>
          
          {(details?.author || manga?.author) && (
            <Text style={styles.author}>By {details?.author || manga?.author}</Text>
          )}

          {(details?.status || manga?.status) && (
            <View style={styles.statusContainer}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  {(details?.status || manga?.status).toUpperCase()}
                </Text>
              </View>
            </View>
          )}

          {(details?.description || manga?.description) && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>
                {details?.description || manga?.description}
              </Text>
            </View>
          )}

          <View style={styles.chaptersHeader}>
            <Text style={styles.chaptersTitle}>Chapters</Text>
            <Text style={styles.chaptersCount}>
              {chapters.length} chapter{chapters.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {chapters.length > 0 ? (
            <View style={styles.chaptersList}>
              {chapters.map((chapter, index) => (
                <TouchableOpacity
                  key={chapter.id || index}
                  style={styles.chapterItem}
                  onPress={() => handleChapterPress(chapter)}
                >
                  <View style={styles.chapterInfo}>
                    <Text style={styles.chapterName}>
                      {chapter.name || `Chapter ${index + 1}`}
                    </Text>
                    {chapter.scanlationGroup && (
                      <Text style={styles.scanlationGroup}>
                        {chapter.scanlationGroup}
                      </Text>
                    )}
                  </View>
                  {chapter.date && (
                    <Text style={styles.chapterDate}>{chapter.date}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyChapters}>
              <Text style={styles.emptyText}>
                No chapters available for this manga.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 4,
  },
  thumbnailContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thumbnail: {
    width: 200,
    aspectRatio: 0.7,
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    fontSize: 64,
  },
  infoContainer: {
    padding: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
    fontFamily: 'Poppins-Bold',
  },
  author: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontFamily: 'Poppins-Regular',
  },
  statusContainer: {
    marginBottom: spacing.md,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.background,
    fontFamily: 'Poppins-Bold',
  },
  descriptionContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    fontFamily: 'Poppins-Regular',
  },
  chaptersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  chaptersTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    fontFamily: 'Poppins-Bold',
  },
  chaptersCount: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
  chaptersList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chapterItem: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chapterInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  chapterName: {
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Poppins-Regular',
    marginBottom: 2,
  },
  scanlationGroup: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins-Regular',
  },
  chapterDate: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: 'Poppins-Regular',
  },
  emptyChapters: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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
});

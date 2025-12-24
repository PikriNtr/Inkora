import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Settings as SettingsIcon, BookOpen } from 'lucide-react-native';
import { getChapterPages } from '../services/mangaService';
import { getReadingPreferences, setReadingPreferences } from '../services/storageService';
import { colors, spacing, borderRadius } from '../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ReaderScreen({ route, navigation }) {
  const { chapter, source, manga } = route.params || {};
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [readingMode, setReadingMode] = useState('paged'); // 'paged', 'webtoon', 'continuous'
  const [showSettings, setShowSettings] = useState(false);
  
  const scrollViewRef = useRef(null);
  const hideControlsTimeout = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadChapterPages();
    loadPreferences();
  }, [chapter, source]);

  useEffect(() => {
    // Auto-hide controls after 3 seconds
    if (showControls && readingMode !== 'webtoon') {
      clearTimeout(hideControlsTimeout.current);
      hideControlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(hideControlsTimeout.current);
  }, [showControls, readingMode]);

  const loadPreferences = async () => {
    const prefs = await getReadingPreferences();
    setReadingMode(prefs.mode || 'paged');
  };

  const loadChapterPages = async () => {
    if (!chapter || !source) return;

    setLoading(true);
    try {
      const pagesData = await getChapterPages(source, chapter.id);
      setPages(pagesData);
    } catch (error) {
      console.error('Error loading chapter pages:', error);
      setPages([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleControls = () => {
    setShowControls(!showControls);
  };

  const handlePageTap = () => {
    toggleControls();
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      
      if (readingMode === 'paged' && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: newPage * SCREEN_WIDTH,
          animated: true,
        });
      }
    }
  };

  const goToNextPage = () => {
    if (currentPage < pages.length - 1) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      
      if (readingMode === 'paged' && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({
          x: newPage * SCREEN_WIDTH,
          animated: true,
        });
      }
    }
  };

  const handleReadingModeChange = async (mode) => {
    setReadingMode(mode);
    const prefs = await getReadingPreferences();
    await setReadingPreferences({ ...prefs, mode });
    setShowSettings(false);
    setCurrentPage(0);
  };

  const handleScroll = (event) => {
    if (readingMode === 'paged') {
      const offsetX = event.nativeEvent.contentOffset.x;
      const page = Math.round(offsetX / SCREEN_WIDTH);
      setCurrentPage(page);
    } else if (readingMode === 'webtoon' || readingMode === 'continuous') {
      const offsetY = event.nativeEvent.contentOffset.y;
      const page = Math.floor(offsetY / SCREEN_HEIGHT);
      setCurrentPage(Math.min(page, pages.length - 1));
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading pages...</Text>
        </View>
      </View>
    );
  }

  if (pages.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No pages available</Text>
          <TouchableOpacity
            style={styles.backButtonEmpty}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonEmptyText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render different reading modes
  const renderPagedMode = () => (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      style={styles.scrollView}
    >
      {pages.map((page, index) => (
        <TouchableWithoutFeedback key={index} onPress={handlePageTap}>
          <View style={styles.pageContainer}>
            <Image
              source={{ uri: page.url }}
              style={styles.pageImage}
              resizeMode="contain"
            />
          </View>
        </TouchableWithoutFeedback>
      ))}
    </ScrollView>
  );

  const renderWebtoonMode = () => (
    <ScrollView
      ref={scrollViewRef}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      style={styles.scrollView}
    >
      {pages.map((page, index) => (
        <TouchableWithoutFeedback key={index} onPress={handlePageTap}>
          <View style={styles.webtoonPageContainer}>
            <Image
              source={{ uri: page.url }}
              style={styles.webtoonPageImage}
              resizeMode="contain"
            />
          </View>
        </TouchableWithoutFeedback>
      ))}
    </ScrollView>
  );

  const renderContinuousMode = () => (
    <ScrollView
      ref={scrollViewRef}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      style={styles.scrollView}
    >
      {pages.map((page, index) => (
        <TouchableWithoutFeedback key={index} onPress={handlePageTap}>
          <View style={styles.continuousPageContainer}>
            <Image
              source={{ uri: page.url }}
              style={styles.continuousPageImage}
              resizeMode="contain"
            />
          </View>
        </TouchableWithoutFeedback>
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {showControls && (
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {chapter?.name || 'Chapter'}
          </Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSettings(true)}
          >
            <SettingsIcon size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      )}

      {readingMode === 'paged' && renderPagedMode()}
      {readingMode === 'webtoon' && renderWebtoonMode()}
      {readingMode === 'continuous' && renderContinuousMode()}

      {showControls && readingMode === 'paged' && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
          <TouchableOpacity
            style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
            onPress={goToPreviousPage}
            disabled={currentPage === 0}
          >
            <Text style={styles.navButtonText}>← Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pageIndicator}>
            {currentPage + 1} / {pages.length}
          </Text>
          <TouchableOpacity
            style={[
              styles.navButton,
              currentPage === pages.length - 1 && styles.navButtonDisabled,
            ]}
            onPress={goToNextPage}
            disabled={currentPage === pages.length - 1}
          >
            <Text style={styles.navButtonText}>Next →</Text>
          </TouchableOpacity>
        </View>
      )}

      {showControls && (readingMode === 'webtoon' || readingMode === 'continuous') && (
        <View style={[styles.floatingPageIndicator, { bottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.floatingPageText}>
            {currentPage + 1} / {pages.length}
          </Text>
        </View>
      )}

      {/* Reading Mode Settings Modal */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowSettings(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <BookOpen size={24} color={colors.primary} />
                  <Text style={styles.modalTitle}>Reading Mode</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    readingMode === 'paged' && styles.modeOptionActive,
                  ]}
                  onPress={() => handleReadingModeChange('paged')}
                >
                  <View>
                    <Text style={[
                      styles.modeOptionTitle,
                      readingMode === 'paged' && styles.modeOptionTitleActive,
                    ]}>
                      Paged (Left to Right)
                    </Text>
                    <Text style={styles.modeOptionDescription}>
                      Swipe left/right to change pages
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    readingMode === 'webtoon' && styles.modeOptionActive,
                  ]}
                  onPress={() => handleReadingModeChange('webtoon')}
                >
                  <View>
                    <Text style={[
                      styles.modeOptionTitle,
                      readingMode === 'webtoon' && styles.modeOptionTitleActive,
                    ]}>
                      Webtoon
                    </Text>
                    <Text style={styles.modeOptionDescription}>
                      Scroll vertically, optimized for webtoons
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    readingMode === 'continuous' && styles.modeOptionActive,
                  ]}
                  onPress={() => handleReadingModeChange('continuous')}
                >
                  <View>
                    <Text style={[
                      styles.modeOptionTitle,
                      readingMode === 'continuous' && styles.modeOptionTitleActive,
                    ]}>
                      Continuous Vertical
                    </Text>
                    <Text style={styles.modeOptionDescription}>
                      Scroll vertically through all pages
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowSettings(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: spacing.md,
    textAlign: 'center',
    fontFamily: 'Poppins-SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  pageImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  webtoonPageContainer: {
    width: SCREEN_WIDTH,
    minHeight: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  webtoonPageImage: {
    width: SCREEN_WIDTH,
    height: undefined,
    aspectRatio: 0.7,
  },
  continuousPageContainer: {
    width: SCREEN_WIDTH,
    backgroundColor: colors.background,
    marginBottom: 2,
  },
  continuousPageImage: {
    width: SCREEN_WIDTH,
    height: undefined,
    aspectRatio: 0.7,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    backgroundColor: 'rgba(18, 18, 18, 0.95)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  navButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
    opacity: 0.5,
  },
  navButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  pageIndicator: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
  },
  floatingPageIndicator: {
    position: 'absolute',
    right: spacing.lg,
    backgroundColor: 'rgba(18, 18, 18, 0.8)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  floatingPageText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.text,
    fontFamily: 'Poppins-Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.lg,
    fontFamily: 'Poppins-Regular',
  },
  backButtonEmpty: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary,
  },
  backButtonEmptyText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginLeft: spacing.sm,
    fontFamily: 'Poppins-Bold',
  },
  modeOption: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceElevated,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  modeOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'Poppins-SemiBold',
  },
  modeOptionTitleActive: {
    color: colors.primary,
  },
  modeOptionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
  closeButton: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins-SemiBold',
  },
});

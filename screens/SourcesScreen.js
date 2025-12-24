import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe, Pin } from 'lucide-react-native';
import { fetchExtensions, groupSourcesByName, filterExtensions } from '../services/extensionService';
import { getPinnedSources, togglePinSource } from '../services/storageService';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function SourcesScreen({ navigation }) {
  const [allExtensions, setAllExtensions] = useState([]);
  const [groupedSources, setGroupedSources] = useState([]);
  const [filteredSources, setFilteredSources] = useState([]);
  const [pinnedSourceIds, setPinnedSourceIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideNSFW, setHideNSFW] = useState(false);

  useEffect(() => {
    loadExtensions();
    loadPinnedSources();
  }, []);

  useEffect(() => {
    let filtered = [...groupedSources];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(source =>
        source.name.toLowerCase().includes(query) ||
        source.baseUrl.toLowerCase().includes(query)
      );
    }

    if (hideNSFW) {
      filtered = filtered.filter(source => !source.nsfw);
    }

    // Sort: pinned first, then alphabetically
    filtered.sort((a, b) => {
      const aId = a.sources[0]?.id || a.id;
      const bId = b.sources[0]?.id || b.id;
      const aPinned = pinnedSourceIds.includes(aId);
      const bPinned = pinnedSourceIds.includes(bId);
      
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.name.localeCompare(b.name);
    });

    setFilteredSources(filtered);
  }, [groupedSources, searchQuery, hideNSFW, pinnedSourceIds]);

  const loadExtensions = async () => {
    setLoading(true);
    try {
      const data = await fetchExtensions();
      setAllExtensions(data);
      const grouped = groupSourcesByName(data);
      setGroupedSources(grouped);
      setFilteredSources(grouped);
    } catch (error) {
      console.error('Error loading extensions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPinnedSources = async () => {
    const pinned = await getPinnedSources();
    setPinnedSourceIds(pinned);
  };

  const handlePinToggle = async (sourceGroup) => {
    const sourceId = sourceGroup.sources[0]?.id || sourceGroup.id;
    const updatedPinned = await togglePinSource(sourceId);
    setPinnedSourceIds(updatedPinned);
  };

  const handleSourcePress = (sourceGroup) => {
    // If source has multiple languages, show language selection
    if (sourceGroup.languages.length > 1) {
      navigation.navigate('SourceLanguage', { sourceGroup });
    } else {
      // Single language, go directly to browse
      const source = sourceGroup.sources[0];
      navigation.navigate('Browse', { source });
    }
  };

  const renderSourceItem = ({ item }) => {
    const sourceId = item.sources[0]?.id || item.id;
    const isPinned = pinnedSourceIds.includes(sourceId);
    
    return (
      <View style={styles.sourceItemContainer}>
        <TouchableOpacity
          style={styles.sourceItem}
          onPress={() => handleSourcePress(item)}
        >
          <View style={styles.sourceHeader}>
            <View style={styles.sourceHeaderLeft}>
              {isPinned && (
                <Pin size={16} color={colors.primary} fill={colors.primary} style={styles.pinIcon} />
              )}
              <Text style={styles.sourceName}>{item.name}</Text>
            </View>
            {item.nsfw && (
              <View style={styles.nsfwBadge}>
                <Text style={styles.nsfwText}>18+</Text>
              </View>
            )}
          </View>
          <Text style={styles.sourceUrl} numberOfLines={1}>
            {item.baseUrl}
          </Text>
          <View style={styles.languageContainer}>
            <Globe size={14} color={colors.textSecondary} />
            <Text style={styles.sourceLang}>
              {item.languages.length} language{item.languages.length !== 1 ? 's' : ''} available
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.pinButton}
          onPress={() => handlePinToggle(item)}
        >
          <Pin 
            size={20} 
            color={isPinned ? colors.primary : colors.textTertiary}
            fill={isPinned ? colors.primary : 'none'}
          />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading sources...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sources</Text>
        <Text style={styles.subtitle}>
          {filteredSources.length} source{filteredSources.length !== 1 ? 's' : ''} available
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search sources..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, hideNSFW && styles.filterChipActive]}
          onPress={() => setHideNSFW(!hideNSFW)}
        >
          <Text
            style={[
              styles.filterChipText,
              hideNSFW && styles.filterChipTextActive,
            ]}
          >
            Hide NSFW
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredSources}
        renderItem={renderSourceItem}
        keyExtractor={(item, index) => `${item.name}-${index}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sources found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.sm,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surfaceElevated,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'Poppins-Medium',
  },
  filterChipTextActive: {
    color: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  sourceItemContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sourceItem: {
    flex: 1,
    padding: spacing.md,
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sourceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinIcon: {
    marginRight: 8,
  },
  sourceName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    fontFamily: 'Poppins-SemiBold',
  },
  nsfwBadge: {
    backgroundColor: colors.nsfw,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  nsfwText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  sourceUrl: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
    fontFamily: 'Poppins-Regular',
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sourceLang: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 6,
    fontFamily: 'Poppins-Regular',
  },
  pinButton: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
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
    fontFamily: 'Poppins-Regular',
  },
});

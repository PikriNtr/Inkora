import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { SafeAreaView as SafeArea } from 'react-native-safe-area-context';
import { Globe, Check, ArrowLeft } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../constants/theme';
import { getSourceByNameAndLang } from '../services/extensionService';

export default function SourceLanguageScreen({ route, navigation }) {
  const { sourceGroup } = route.params || {};
  const [selectedLang, setSelectedLang] = useState(sourceGroup?.languages[0] || 'all');

  const handleSelectLanguage = (lang) => {
    setSelectedLang(lang);
  };

  const handleConfirm = () => {
    if (!sourceGroup) return;
    
    const selectedSource = getSourceByNameAndLang([sourceGroup], sourceGroup.name, selectedLang);
    if (selectedSource) {
      navigation.navigate('Browse', { source: selectedSource });
    }
  };

  const renderLanguageItem = ({ item }) => {
    const isSelected = selectedLang === item;
    return (
      <TouchableOpacity
        style={[
          styles.languageItem,
          isSelected && styles.languageItemSelected,
        ]}
        onPress={() => handleSelectLanguage(item)}
      >
        <View style={styles.languageLeft}>
          <Globe size={20} color={isSelected ? colors.primary : colors.textSecondary} />
          <Text
            style={[
              styles.languageText,
              isSelected && styles.languageTextSelected,
            ]}
          >
            {item.toUpperCase()}
          </Text>
        </View>
        {isSelected && (
          <Check size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  if (!sourceGroup) {
    return (
      <SafeArea style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Source not found</Text>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{sourceGroup.name}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Select Language</Text>
        <Text style={styles.sectionSubtitle}>
          Choose your preferred language for this source
        </Text>

        <FlatList
          data={sourceGroup.languages}
          renderItem={renderLanguageItem}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
        />

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeArea>
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
  content: {
    flex: 1,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
    fontFamily: 'Poppins-Bold',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    fontFamily: 'Poppins-Regular',
  },
  listContent: {
    paddingBottom: spacing.md,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  languageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    marginLeft: spacing.md,
    fontFamily: 'Poppins-Medium',
  },
  languageTextSelected: {
    color: colors.text,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background,
    fontFamily: 'Poppins-SemiBold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
});

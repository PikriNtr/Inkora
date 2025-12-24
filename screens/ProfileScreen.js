import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, BookOpen, Clock, Star, History } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../constants/theme';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <User size={40} color={colors.primary} />
          </View>
          <Text style={styles.username}>Guest User</Text>
          <Text style={styles.userEmail}>guest@inkora.app</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <BookOpen size={24} color={colors.primary} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Reading</Text>
          </View>
          <View style={styles.statCard}>
            <Clock size={24} color={colors.primary} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>History</Text>
          </View>
          <View style={styles.statCard}>
            <Star size={24} color={colors.primary} />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}>
            <History size={20} color={colors.primary} />
            <Text style={styles.menuText}>Reading History</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Star size={20} color={colors.primary} />
            <Text style={styles.menuText}>Favorites</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <BookOpen size={20} color={colors.primary} />
            <Text style={styles.menuText}>My Library</Text>
          </TouchableOpacity>
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
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
    fontFamily: 'Poppins-Bold',
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Poppins-Regular',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.sm,
    fontFamily: 'Poppins-Bold',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontFamily: 'Poppins-Regular',
  },
  section: {
    padding: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginLeft: spacing.md,
    flex: 1,
    fontFamily: 'Poppins-Medium',
  },
});


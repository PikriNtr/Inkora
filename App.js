import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { Home, BookOpen, Library, Settings, User } from 'lucide-react-native';
import { colors } from './constants/theme';

// Services - Mihon-inspired architecture
import { initializeServices, getServiceStatus } from './services';

// Screens
import HomeScreen from './screens/HomeScreen';
import SourcesScreen from './screens/SourcesScreen';
import BrowseScreen from './screens/BrowseScreen';
import LibraryScreen from './screens/LibraryScreen';
import MangaDetailsScreen from './screens/MangaDetailsScreen';
import ReaderScreen from './screens/ReaderScreen';
import SettingsScreen from './screens/SettingsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SourceLanguageScreen from './screens/SourceLanguageScreen';

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="HomeList" component={HomeScreen} />
    </Stack.Navigator>
  );
}

function SourcesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SourcesList" component={SourcesScreen} />
      <Stack.Screen name="SourceLanguage" component={SourceLanguageScreen} />
      <Stack.Screen name="Browse" component={BrowseScreen} />
      <Stack.Screen name="MangaDetails" component={MangaDetailsScreen} />
      <Stack.Screen 
        name="Reader" 
        component={ReaderScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

function LibraryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="LibraryList" component={LibraryScreen} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="SettingsList" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="ProfileList" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

// Helper function to get the current route name
function getActiveRouteName(state) {
  if (!state || !state.routes || state.routes.length === 0) {
    return null;
  }

  const route = state.routes[state.index];

  if (route.state) {
    return getActiveRouteName(route.state);
  }

  return route.name;
}

function TabNavigator() {
  const insets = useSafeAreaInsets();
  const [currentRoute, setCurrentRoute] = React.useState('');
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          fontFamily: 'Poppins-Medium',
        },
      }}
      screenListeners={{
        state: (e) => {
          const routeName = getActiveRouteName(e.data.state);
          setCurrentRoute(routeName);
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Home size={size || 24} color={color} />
          ),
          tabBarStyle: currentRoute === 'Reader' ? { display: 'none' } : {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 12,
            height: 70 + Math.max(insets.bottom - 8, 0),
          },
        }}
      />
      <Tab.Screen
        name="Sources"
        component={SourcesStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size || 24} color={color} />
          ),
          tabBarStyle: currentRoute === 'Reader' ? { display: 'none' } : {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 12,
            height: 70 + Math.max(insets.bottom - 8, 0),
          },
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Library size={size || 24} color={color} />
          ),
          tabBarStyle: currentRoute === 'Reader' ? { display: 'none' } : {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 12,
            height: 70 + Math.max(insets.bottom - 8, 0),
          },
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Settings size={size || 24} color={color} />
          ),
          tabBarStyle: currentRoute === 'Reader' ? { display: 'none' } : {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 12,
            height: 70 + Math.max(insets.bottom - 8, 0),
          },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color, size }) => (
            <User size={size || 24} color={color} />
          ),
          tabBarStyle: currentRoute === 'Reader' ? { display: 'none' } : {
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 12),
            paddingTop: 12,
            height: 70 + Math.max(insets.bottom - 8, 0),
          },
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-Medium': Poppins_500Medium,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  const [servicesReady, setServicesReady] = useState(false);
  const [initError, setInitError] = useState(null);

  // Initialize services on mount
  useEffect(() => {
    async function initializeApp() {
      try {
        console.log('[App] 🚀 Initializing Inkora...');
        
        // Initialize all Mihon-inspired services
        const success = await initializeServices();
        
        if (!success) {
          throw new Error('Service initialization failed');
        }

        // Log service status for debugging
        if (__DEV__) {
          const status = await getServiceStatus();
          console.log('[App] ✅ Service Status:', JSON.stringify(status, null, 2));
        }
        
        setServicesReady(true);
        console.log('[App] ✅ Inkora ready!');
      } catch (error) {
        console.error('[App] ❌ Initialization error:', error);
        setInitError(error.message);
      }
    }

    initializeApp();
  }, []);

  // Hide splash screen when everything is ready
  useEffect(() => {
    if ((fontsLoaded || fontError) && (servicesReady || initError)) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, servicesReady, initError]);

  // Show error screen if initialization failed
  if (initError) {
    return (
      <SafeAreaProvider>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: colors.background,
          padding: 24,
        }}>
          <Text style={{ 
            color: '#FF3B30', 
            fontSize: 18, 
            fontWeight: 'bold',
            marginBottom: 12,
          }}>
            Failed to Initialize
          </Text>
          <Text style={{ 
            color: colors.textSecondary, 
            textAlign: 'center',
            lineHeight: 20,
          }}>
            {initError}
          </Text>
          <Text style={{ 
            color: colors.textTertiary, 
            fontSize: 12,
            marginTop: 16,
          }}>
            Please restart the app
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // Show loading screen while initializing
  if (!fontsLoaded || !servicesReady) {
    return (
      <SafeAreaProvider>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: colors.background,
        }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ 
            marginTop: 16, 
            color: colors.textSecondary,
            fontSize: 14,
          }}>
            {!fontsLoaded ? 'Loading fonts...' : 'Initializing services...'}
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <TabNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

# React Native Mobile App Setup Guide

## Project Structure
```
mobile/
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── prompts/
│   │   ├── leaderboard/
│   │   └── profile/
│   ├── screens/
│   │   ├── auth/
│   │   ├── home/
│   │   ├── prompts/
│   │   ├── leaderboard/
│   │   └── profile/
│   ├── navigation/
│   ├── services/
│   │   ├── api/
│   │   ├── auth/
│   │   └── notifications/
│   ├── store/
│   │   ├── slices/
│   │   └── index.js
│   ├── utils/
│   └── constants/
├── android/
├── ios/
└── package.json
```

## Dependencies

### Core Dependencies
```json
{
  "dependencies": {
    "react-native": "^0.73.0",
    "react": "^18.2.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "@react-navigation/stack": "^6.3.20",
    "@react-navigation/drawer": "^6.6.6",
    "react-native-screens": "^3.27.0",
    "react-native-safe-area-context": "^4.8.2",
    "react-native-gesture-handler": "^2.14.0",
    "react-native-reanimated": "^3.6.1"
  }
}
```

### State Management & API
```json
{
  "dependencies": {
    "@reduxjs/toolkit": "^2.0.1",
    "react-redux": "^9.0.4",
    "@apollo/client": "^3.8.8",
    "graphql": "^16.8.1",
    "react-native-mmkv": "^2.11.0"
  }
}
```

### UI & Styling
```json
{
  "dependencies": {
    "react-native-vector-icons": "^10.0.3",
    "react-native-linear-gradient": "^2.8.3",
    "react-native-svg": "^14.1.0",
    "react-native-paper": "^5.11.6",
    "react-native-elements": "^3.4.3",
    "lottie-react-native": "^6.4.1"
  }
}
```

### Authentication & Security
```json
{
  "dependencies": {
    "@react-native-async-storage/async-storage": "^1.21.0",
    "react-native-keychain": "^8.1.3",
    "react-native-biometrics": "^3.0.1",
    "@react-native-firebase/auth": "^18.6.2"
  }
}
```

### Push Notifications
```json
{
  "dependencies": {
    "@react-native-firebase/app": "^18.6.2",
    "@react-native-firebase/messaging": "^18.6.2",
    "react-native-push-notification": "^8.1.1",
    "@react-native-community/push-notification-ios": "^1.11.0"
  }
}
```

## Key Components

### 1. GraphQL Client Setup
```javascript
// src/services/api/apolloClient.js
import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';
import AsyncStorage from '@react-native-async-storage/async-storage';

const httpLink = createHttpLink({
  uri: 'https://your-hasura-endpoint.com/v1/graphql',
});

const wsLink = new GraphQLWsLink(createClient({
  url: 'wss://your-hasura-endpoint.com/v1/graphql',
  connectionParams: async () => {
    const token = await AsyncStorage.getItem('authToken');
    return {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    };
  },
}));

const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem('authToken');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink),
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
  },
});
```

### 2. Navigation Structure
```javascript
// src/navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialIcons';

import HomeScreen from '../screens/home/HomeScreen';
import PromptsScreen from '../screens/prompts/PromptsScreen';
import LeaderboardScreen from '../screens/leaderboard/LeaderboardScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AuthNavigator from './AuthNavigator';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const MainTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        switch (route.name) {
          case 'Home':
            iconName = 'home';
            break;
          case 'Prompts':
            iconName = 'edit';
            break;
          case 'Leaderboard':
            iconName = 'leaderboard';
            break;
          case 'Profile':
            iconName = 'person';
            break;
        }
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#6366f1',
      tabBarInactiveTintColor: 'gray',
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Prompts" component={PromptsScreen} />
    <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

export const AppNavigator = ({ isAuthenticated }) => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  </NavigationContainer>
);
```

### 3. Redux Store Setup
```javascript
// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import promptsSlice from './slices/promptsSlice';
import leaderboardSlice from './slices/leaderboardSlice';
import userSlice from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    prompts: promptsSlice,
    leaderboard: leaderboardSlice,
    user: userSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 4. Authentication Slice
```javascript
// src/store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../../services/auth/authService';

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(email, password);
      await AsyncStorage.setItem('authToken', response.token);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);
      return response.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async ({ email, password, username, fullName }, { rejectWithValue }) => {
    try {
      const response = await authService.register(email, password, username, fullName);
      await AsyncStorage.setItem('authToken', response.token);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);
      return response.user;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      AsyncStorage.multiRemove(['authToken', 'refreshToken']);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
```

### 5. Push Notification Setup
```javascript
// src/services/notifications/pushNotificationService.js
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';

class PushNotificationService {
  constructor() {
    this.configure();
    this.createChannels();
  }

  configure() {
    PushNotification.configure({
      onRegister: (token) => {
        console.log('TOKEN:', token);
        this.saveFCMToken(token.token);
      },
      onNotification: (notification) => {
        console.log('NOTIFICATION:', notification);
        this.handleNotification(notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true,
    });
  }

  createChannels() {
    PushNotification.createChannel(
      {
        channelId: 'badge-earned',
        channelName: 'Badge Earned',
        channelDescription: 'Notifications for earned badges',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Badge channel created: ${created}`)
    );

    PushNotification.createChannel(
      {
        channelId: 'leaderboard-update',
        channelName: 'Leaderboard Update',
        channelDescription: 'Notifications for leaderboard changes',
        soundName: 'default',
        importance: 3,
        vibrate: true,
      },
      (created) => console.log(`Leaderboard channel created: ${created}`)
    );
  }

  async requestPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      return true;
    }
    return false;
  }

  async getFCMToken() {
    try {
      const token = await messaging().getToken();
      await this.saveFCMToken(token);
      return token;
    } catch (error) {
      console.log('Error getting FCM token:', error);
      return null;
    }
  }

  async saveFCMToken(token) {
    try {
      await AsyncStorage.setItem('fcmToken', token);
      // Send token to backend
      // await api.updateUserFCMToken(token);
    } catch (error) {
      console.log('Error saving FCM token:', error);
    }
  }

  handleNotification(notification) {
    const { data, userInteraction } = notification;
    
    if (userInteraction) {
      // Handle notification tap
      switch (data?.type) {
        case 'badge_earned':
          // Navigate to profile/badges screen
          break;
        case 'leaderboard_update':
          // Navigate to leaderboard screen
          break;
        case 'prompt_featured':
          // Navigate to specific prompt
          break;
      }
    }
  }

  showLocalNotification(title, message, data = {}) {
    PushNotification.localNotification({
      title,
      message,
      data,
      channelId: data.channelId || 'default',
    });
  }
}

export const pushNotificationService = new PushNotificationService();
```

### 6. Prompt Submission Component
```javascript
// src/components/prompts/PromptSubmissionForm.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { Picker } from '@react-native-picker/picker';
import { SUBMIT_PROMPT, GET_CATEGORIES } from '../../services/api/queries';

const PromptSubmissionForm = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const { data: categoriesData } = useQuery(GET_CATEGORIES);
  const [submitPrompt, { loading }] = useMutation(SUBMIT_PROMPT);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim() || !categoryId) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const result = await submitPrompt({
        variables: {
          title: title.trim(),
          content: content.trim(),
          categoryId,
          subCategoryId: subCategoryId || null,
          tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
          isPublic,
        },
      });

      Alert.alert('Success', 'Prompt submitted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const selectedCategory = categoriesData?.categories?.find(
    cat => cat.id === categoryId
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter prompt title"
          maxLength={200}
        />

        <Text style={styles.label}>Content *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={content}
          onChangeText={setContent}
          placeholder="Enter your prompt content"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Category *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={categoryId}
            onValueChange={setCategoryId}
            style={styles.picker}
          >
            <Picker.Item label="Select a category" value="" />
            {categoriesData?.categories?.map(category => (
              <Picker.Item
                key={category.id}
                label={category.name}
                value={category.id}
              />
            ))}
          </Picker>
        </View>

        {selectedCategory?.subCategories?.length > 0 && (
          <>
            <Text style={styles.label}>Sub-category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={subCategoryId}
                onValueChange={setSubCategoryId}
                style={styles.picker}
              >
                <Picker.Item label="Select a sub-category" value="" />
                {selectedCategory.subCategories.map(subCategory => (
                  <Picker.Item
                    key={subCategory.id}
                    label={subCategory.name}
                    value={subCategory.id}
                  />
                ))}
              </Picker>
            </View>
          </>
        )}

        <Text style={styles.label}>Tags</Text>
        <TextInput
          style={styles.input}
          value={tags}
          onChangeText={setTags}
          placeholder="Enter tags separated by commas"
        />

        <View style={styles.switchContainer}>
          <Text style={styles.label}>Make Public</Text>
          <TouchableOpacity
            style={[styles.switch, isPublic && styles.switchActive]}
            onPress={() => setIsPublic(!isPublic)}
          >
            <View style={[styles.switchThumb, isPublic && styles.switchThumbActive]} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Submitting...' : 'Submit Prompt'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 120,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  picker: {
    height: 50,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    padding: 2,
  },
  switchActive: {
    backgroundColor: '#6366f1',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  submitButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PromptSubmissionForm;
```

## Platform-Specific Configurations

### iOS Configuration (ios/Podfile)
```ruby
platform :ios, '12.4'
require_relative '../node_modules/react-native/scripts/react_native_pods'
require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules'

target 'PromptRepo' do
  config = use_native_modules!
  
  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => true
  )
  
  # Firebase
  pod 'Firebase', :modular_headers => true
  pod 'FirebaseCoreInternal', :modular_headers => true
  pod 'GoogleUtilities', :modular_headers => true
  
  # Permissions
  permissions_path = '../node_modules/react-native-permissions/ios'
  pod 'Permission-Notifications', :path => "#{permissions_path}/Notifications"
  
  target 'PromptRepoTests' do
    inherit! :complete
  end
  
  post_install do |installer|
    react_native_post_install(installer)
  end
end
```

### Android Configuration (android/app/build.gradle)
```gradle
android {
    compileSdkVersion rootProject.ext.compileSdkVersion
    
    defaultConfig {
        applicationId "com.promptrepo.app"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
        multiDexEnabled true
    }
    
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            signingConfig signingConfigs.release
        }
    }
}

dependencies {
    implementation fileTree(dir: "libs", include: ["*.jar"])
    implementation "com.facebook.react:react-native:+"
    
    // Firebase
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-messaging'
    
    // Vector Icons
    implementation project(':react-native-vector-icons')
    
    if (enableHermes) {
        def hermesPath = "../../node_modules/hermes-engine/android/"
        debugImplementation files(hermesPath + "hermes-debug.aar")
        releaseImplementation files(hermesPath + "hermes-release.aar")
    } else {
        implementation jscFlavor
    }
}

apply plugin: 'com.google.gms.google-services'
```

This React Native setup provides a solid foundation for building cross-platform mobile applications with real-time GraphQL integration, push notifications, and a comprehensive state management system.
import React from 'react';
import {StatusBar} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {initDatabase} from './src/db/database';
import HomeScreen from './src/screens/HomeScreen';
import SessionListScreen from './src/screens/SessionListScreen';
import SessionDetailScreen from './src/screens/SessionDetailScreen';

export type RootStackParamList = {
  Home: undefined;
  SessionList: undefined;
  SessionDetail: {sessionId: string};
};

initDatabase();

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f0f" />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {backgroundColor: '#0f0f0f'},
            headerTintColor: '#fff',
            headerTitleStyle: {fontWeight: '700'},
          }}>
          <Stack.Screen name="Home" component={HomeScreen} options={{title: 'Network Debug'}} />
          <Stack.Screen name="SessionList" component={SessionListScreen} options={{title: 'Sessions'}} />
          <Stack.Screen
            name="SessionDetail"
            component={SessionDetailScreen}
            options={{title: 'Session Detail'}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

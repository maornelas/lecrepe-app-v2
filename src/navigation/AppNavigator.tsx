import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import HomeV2Screen from '../screens/HomeV2Screen';
import HistoricScreen from '../screens/HistoricScreen';
import MenuScreen from '../screens/MenuScreen';
import UsersScreen from '../screens/UsersScreen';
import OrdenesScreen from '../screens/OrdenesScreen';
import ProductosScreen from '../screens/ProductosScreen';
import VentasScreen from '../screens/VentasScreen';
import MesasScreen from '../screens/MesasScreen';
import KitchenScreen from '../screens/KitchenScreen';
import ConfigScreen from '../screens/ConfigScreen';
import ReportesScreen from '../screens/ReportesScreen';
import { StorageService } from '../services/storageService';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  HomeV2: undefined;
  Historic: undefined;
  Menu: undefined;
  Users: undefined;
  Ordenes: undefined;
  Productos: undefined;
  Ventas: undefined;
  Mesas: undefined;
  Kitchen: undefined;
  Config: undefined;
  Reportes: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const userLogin = await StorageService.getItem('userLogin');
      const idStore = await StorageService.getItem('idStore');
      
      if (userLogin && idStore) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = () => {
    console.log('✅ Login success callback called');
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E8A334" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={isAuthenticated ? 'Home' : 'Login'}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Login">
          {(props) => (
            <LoginScreen
              {...props}
              onLoginSuccess={handleLoginSuccess}
            />
          )}
        </Stack.Screen>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="HomeV2" component={HomeV2Screen} />
        <Stack.Screen name="Historic" component={HistoricScreen} />
        <Stack.Screen name="Menu" component={MenuScreen} />
        <Stack.Screen name="Users" component={UsersScreen} />
        <Stack.Screen name="Ordenes" component={OrdenesScreen} />
        <Stack.Screen name="Productos" component={ProductosScreen} />
        <Stack.Screen name="Ventas" component={VentasScreen} />
        <Stack.Screen name="Mesas" component={MesasScreen} />
        <Stack.Screen name="Kitchen" component={KitchenScreen} />
        <Stack.Screen name="Config" component={ConfigScreen} />
        <Stack.Screen name="Reportes" component={ReportesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});

export default AppNavigator;


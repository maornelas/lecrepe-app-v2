/**
 * Main App entry point with navigation
 * This uses AppNavigator to handle all screens
 */
import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { BluetoothProvider } from './src/contexts/BluetoothContext';

const App: React.FC = () => {
  return (
    <BluetoothProvider>
      <AppNavigator />
    </BluetoothProvider>
  );
};

export default App;

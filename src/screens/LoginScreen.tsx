import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import OTPInput from '../components/OTPInput';
import { UserService } from '../services/userService';
import { StoreService } from '../services/storeService';
import { StorageService } from '../services/storageService';

interface LoginScreenProps {
  navigation?: any;
  onLoginSuccess?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation, onLoginSuccess }) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<number>(1); // Default store ID

  useEffect(() => {
    loadStoreData();
  }, []);

  const loadStoreData = async () => {
    try {
      console.log('🏪 Loading store data...');
      // Load default store (id = 1)
      const response = await StoreService.getStoreById(1);
      console.log('🏪 Store response:', response);
      
      if (response.data) {
        const storeIdValue = response.data.id_store || response.data.id;
        console.log('🏪 Setting store ID:', storeIdValue);
        setStoreId(storeIdValue);
        // Save idStore to AsyncStorage
        await StorageService.setItem('idStore', storeIdValue.toString());
      } else {
        console.warn('⚠️ No store data in response');
      }
    } catch (error) {
      console.error('❌ Error loading store data:', error);
      // Keep default storeId = 1 if loading fails
    }
  };

  const handleOTPChange = (value: string) => {
    setOtp(value);
  };

  const handleOTPComplete = (value: string) => {
    setOtp(value);
    // Auto-submit when OTP is complete
    handleSubmit(value);
  };

  const handleSubmit = async (otpValue?: string) => {
    const finalOtp = otpValue || otp;
    
    console.log('🔘 Submit button pressed:', { finalOtp, storeId, otpLength: finalOtp.length });
    
    if (finalOtp.length < 4) {
      Alert.alert('Error', 'Por favor ingresa un NIP de 4 dígitos');
      return;
    }

    if (!storeId) {
      Alert.alert('Error', 'No se pudo cargar la información de la tienda. Por favor intenta de nuevo.');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 Starting login process...');
      const userResponse = await UserService.loginUser(finalOtp, storeId);
      
      console.log('📦 User response received:', userResponse);
      
      // Check if response has data (could be direct data or wrapped)
      const userData = userResponse.data || userResponse;
      
      if (userData && (userData._id || userData.nip || userData.name)) {
        console.log('✅ Login successful, saving user data...');
        
        // Save user data to AsyncStorage
        await StorageService.setItem('userLogin', JSON.stringify(userData));
        
        // Ensure idStore is saved
        if (userData.id_store) {
          await StorageService.setItem('idStore', userData.id_store.toString());
        } else {
          await StorageService.setItem('idStore', storeId.toString());
        }

        console.log('✅ User data saved, navigating...');

        // Call success callback first to update auth state
        if (onLoginSuccess) {
          onLoginSuccess();
        }
        
        // Then navigate (navigation should be available from AppNavigator)
        if (navigation) {
          console.log('🧭 Navigating to Home...');
          // Use setTimeout to ensure state update completes
          setTimeout(() => {
            navigation.replace('Home');
          }, 100);
        } else {
          console.warn('⚠️ No navigation object available');
        }
      } else {
        console.warn('⚠️ Invalid response format:', userResponse);
        Alert.alert('Error', 'NIP incorrecto o respuesta inválida del servidor');
      }
    } catch (error: any) {
      console.error('❌ Login error caught:', error);
      const errorMessage = error?.message || 'Ocurrió un error al iniciar sesión';
      console.error('Error details:', {
        message: errorMessage,
        stack: error?.stack,
        response: error?.response,
      });
      
      // Show more specific error message
      if (errorMessage.includes('404')) {
        Alert.alert('Error', 'Usuario no encontrado. Verifica tu NIP.');
      } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
        Alert.alert('Error', 'NIP incorrecto o no autorizado.');
      } else if (errorMessage.includes('Network')) {
        Alert.alert('Error de conexión', 'No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      } else {
        Alert.alert('Error', `Error al iniciar sesión: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
      console.log('🏁 Login process finished');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header with logo */}
          <View style={styles.header}>
            <Text style={styles.logoText}>Le Crépe</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.welcomeText}>Bienvenido</Text>
            <Text style={styles.subtitle}>Ingresa tu NIP para continuar</Text>

            {/* OTP Input */}
            <OTPInput
              length={4}
              onChange={handleOTPChange}
              onComplete={handleOTPComplete}
              autoFocus={true}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, (loading || otp.length < 4) && styles.submitButtonDisabled]}
              onPress={() => handleSubmit()}
              disabled={loading || otp.length < 4}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Ingresar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Section with Background Image */}
          <View style={styles.footerBackground}>
            <View style={styles.footerOverlay}>
              <Text style={styles.footerTitle}>Dulces o Saladas ...</Text>
              <Text style={styles.footerSubtitle}>
                Siempre <Text style={styles.footerHighlight}>Deliciosas</Text>
              </Text>
              
              <View style={styles.footerCopyright}>
                <Text style={styles.copyrightText}>
                  ® Derechos Reservados - Le Crépe 2025
                </Text>
                <Text style={styles.versionText}>
                  Versión 0.11 Changes to responsive design
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  submitButton: {
    backgroundColor: '#E8A334',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerBackground: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#8B4513', // Brown background as fallback
    opacity: 0.9,
  },
  footerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  footerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  footerSubtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  footerHighlight: {
    color: '#E8A334',
  },
  footerCopyright: {
    position: 'absolute',
    bottom: 16,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 4,
  },
  versionText: {
    fontSize: 9,
    color: '#fff',
    opacity: 0.8,
  },
});

export default LoginScreen;


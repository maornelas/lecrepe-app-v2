import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { StorageService } from '../services/storageService';
import { backend } from '../config/constants';
import { User } from '../services/userService';

interface HomeScreenProps {
  navigation?: any;
}

interface Section {
  id: string;
  title: string;
  icon: string;
  color: string;
  route?: string;
  onClick?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [userData, setUserData] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const userLoginStr = await StorageService.getItem('userLogin');
      if (userLoginStr) {
        const user = JSON.parse(userLoginStr);
        setUserData(user);
        setUserRole(user.rol || '');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clear();
            if (navigation) {
              navigation.replace('Login');
            }
          },
        },
      ]
    );
    setMenuVisible(false);
  };

  const getFilteredSections = (sections: Section[], role: string): Section[] => {
    const normalizedRole = role?.toLowerCase() || '';

    if (normalizedRole === backend.rol.admin) {
      return sections;
    } else if (normalizedRole === backend.rol.waitress) {
      return sections.filter(
        (section) => section.id === 'ordenes' || section.id === 'mesas'
      );
    } else if (normalizedRole === backend.rol.chef) {
      return sections.filter((section) => section.id === 'cocina');
    }
    return [];
  };

  const allMainSections: Section[] = [
    {
      id: 'ordenes',
      title: 'PARA LLEVAR',
      icon: '📋',
      color: '#FF9800',
      route: 'Ordenes',
    },
    {
      id: 'mesas',
      title: 'MESAS',
      icon: '🪑',
      color: '#FF9800',
      route: 'Mesas',
    },
    {
      id: 'productos',
      title: 'PRODUCTOS',
      icon: '🍕',
      color: '#FF9800',
      route: 'Productos',
    },
    {
      id: 'cocina',
      title: 'COCINA',
      icon: '👨‍🍳',
      color: '#FF9800',
      route: 'Kitchen',
    },
    {
      id: 'ventas',
      title: 'VENTAS',
      icon: '📊',
      color: '#FF9800',
      route: 'Ventas',
    },
  ];

  const allBottomSections: Section[] = [
    {
      id: 'config',
      title: 'CONFIG',
      icon: '⚙️',
      color: '#FF9800',
      route: 'Config',
    },
    {
      id: 'usuarios',
      title: 'USUARIOS',
      icon: '👥',
      color: '#FF9800',
      route: 'Users',
    },
    {
      id: 'reportes',
      title: 'REPORTES',
      icon: '📈',
      color: '#FF9800',
      route: 'Reportes',
    },
  ];

  const mainSections = getFilteredSections(allMainSections, userRole);
  const normalizedRole = userRole?.toLowerCase() || '';
  const bottomSections =
    normalizedRole === backend.rol.admin ? allBottomSections : [];

  const handleSectionPress = (section: Section) => {
    if (section.route && navigation) {
      navigation.navigate(section.route as any);
    } else if (section.onClick) {
      section.onClick();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {userData?.fullname || userData?.name || 'Usuario'}
            </Text>
            <Text style={styles.userRole}>{userRole || 'Sin rol asignado'}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={styles.avatarText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {mainSections.length > 0 ? (
          <View style={styles.grid}>
            {mainSections.map((section) => (
              <TouchableOpacity
                key={section.id}
                style={styles.card}
                onPress={() => handleSectionPress(section)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardIcon}>{section.icon}</Text>
                <Text style={styles.cardTitle}>{section.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>
              No tienes acceso a ninguna sección
            </Text>
            <Text style={styles.emptyText}>
              Tu rol actual ({userRole || 'Sin rol'}) no tiene permisos para
              acceder a ninguna sección del sistema. Contacta al administrador
              para obtener los permisos necesarios.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Section */}
      {bottomSections.length > 0 && (
        <View style={styles.bottomSection}>
          {bottomSections.map((section) => (
            <TouchableOpacity
              key={section.id}
              style={styles.bottomButton}
              onPress={() => handleSectionPress(section)}
              activeOpacity={0.7}
            >
              <View style={[styles.bottomIconContainer, { backgroundColor: section.color }]}>
                <Text style={styles.bottomIcon}>{section.icon}</Text>
              </View>
              <Text style={styles.bottomLabel}>{section.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* User Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        presentationStyle="overFullScreen"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert('Perfil', 'Funcionalidad de perfil - por implementar');
              }}
            >
              <Text style={styles.menuItemText}>Perfil</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={handleLogout}
            >
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                Cerrar sesión
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuItemText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  userInfo: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#2c2c2c',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  cardIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    maxWidth: 300,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 2,
    borderTopColor: '#e0e0e0',
  },
  bottomButton: {
    alignItems: 'center',
    flex: 1,
  },
  bottomIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bottomIcon: {
    fontSize: 24,
  },
  bottomLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxWidth: 300,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuItemDanger: {
    borderBottomWidth: 0,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  menuItemTextDanger: {
    color: '#f44336',
  },
});

export default HomeScreen;


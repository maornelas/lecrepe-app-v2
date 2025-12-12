import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { MemberService, Member } from '../services/memberService';
import { StorageService } from '../services/storageService';

interface UsersScreenProps {
  navigation?: any;
}

const UsersScreen: React.FC<UsersScreenProps> = ({ navigation }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const idStore = await StorageService.getItem('idStore');
      if (!idStore) {
        Alert.alert('Error', 'No se encontró el ID de la tienda');
        return;
      }

      const response = await MemberService.getAllMembers(parseInt(idStore));
      if (response.data) {
        setMembers(response.data);
      }
    } catch (error: any) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleClickNewUser = () => {
    setSelectedUser(null);
    setOpenDetail(true);
  };

  const handleClickUser = (user: Member) => {
    setSelectedUser(user);
    setOpenDetail(true);
  };

  const handleCloseModal = () => {
    setOpenDetail(false);
    setSelectedUser(null);
  };

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    return timeString;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Cargando usuarios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backButtonText}>← REGRESAR</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.title}>USUARIOS</Text>
          <TouchableOpacity
            style={styles.newUserButton}
            onPress={handleClickNewUser}
          >
            <Text style={styles.newUserButtonText}>NUEVO USUARIO</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Users Grid */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.usersGrid}>
          {members.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay usuarios registrados</Text>
            </View>
          ) : (
            members.map((member, index) => (
              <TouchableOpacity
                key={member._id || member.id || index}
                style={[
                  styles.userCard,
                  member.rol === 'administrador' && styles.adminCard,
                ]}
                onPress={() => handleClickUser(member)}
              >
                <View style={styles.userCardContent}>
                  {member.url_photo ? (
                    <Image
                      source={{ uri: member.url_photo }}
                      style={styles.userAvatar}
                    />
                  ) : (
                    <View style={styles.userAvatarPlaceholder}>
                      <Text style={styles.userAvatarText}>
                        {getInitials(member.fullname)}
                      </Text>
                    </View>
                  )}
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{member.fullname}</Text>
                    <Text style={styles.userRole}>
                      {member.rol ? member.rol.toUpperCase() : 'USUARIO'}
                    </Text>
                    {member.phone && (
                      <Text style={styles.userPhone}>Tel: {member.phone}</Text>
                    )}
                    {member.creation_date && (
                      <Text style={styles.userTime}>
                        Hora: {formatTime(member.creation_date)}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal for User Detail - Simplified */}
      <Modal
        visible={openDetail}
        transparent={true}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            </Text>
            <Text style={styles.modalText}>
              Funcionalidad de edición/creación de usuario - por implementar
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCloseModal}
            >
              <Text style={styles.modalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 2,
    alignItems: 'flex-end',
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  newUserButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newUserButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  usersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  userCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  adminCard: {
    borderColor: '#FF9800',
    borderWidth: 2,
  },
  userCardContent: {
    padding: 16,
    alignItems: 'center',
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  userAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  userRole: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  userTime: {
    fontSize: 12,
    color: '#999',
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
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UsersScreen;






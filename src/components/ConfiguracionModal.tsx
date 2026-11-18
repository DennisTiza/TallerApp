import { WorkshopTheme } from '@/constants/theme';
import {
  clientesRepo,
  mecanicosRepo,
  ordenesRepo,
  Taller,
  tallerRepo,
  vehiculosRepo,
} from '@/database';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface ConfiguracionModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function ConfiguracionModal({
  visible,
  onClose,
  onSaved,
}: ConfiguracionModalProps) {
  const [, setTaller] = useState<Taller | null>(null);
  const [nombreTaller, setNombreTaller] = useState('');
  const [nit, setNit] = useState('');
  const [telefonoTaller, setTelefonoTaller] = useState('');
  const [correoTaller, setCorreoTaller] = useState('');
  const [direccionTaller, setDireccionTaller] = useState('');
  const [cuentaGoogle, setCuentaGoogle] = useState('');

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardandoGoogle, setGuardandoGoogle] = useState(false);
  const [respaldando, setRespaldando] = useState(false);

  const cargarConfiguracion = async () => {
    setCargando(true);
    try {
      const [tallerData, googleAccount] = await Promise.all([
        tallerRepo.get(),
        AsyncStorage.getItem('@tallerapp:google_account'),
      ]);

      if (tallerData) {
        setTaller(tallerData);
        setNombreTaller(tallerData.nombre || '');
        setNit(tallerData.nit || '');
        setTelefonoTaller(tallerData.telefono || '');
        setCorreoTaller(tallerData.correo || '');
        setDireccionTaller(tallerData.direccion || '');
      }

      setCuentaGoogle(googleAccount || '');
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los datos de configuración.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargarConfiguracion();
    }
  }, [visible]);

  const handleGuardarGoogle = async () => {
    setGuardandoGoogle(true);
    try {
      if (cuentaGoogle.trim()) {
        await AsyncStorage.setItem('@tallerapp:google_account', cuentaGoogle.trim());
        Alert.alert('Éxito', 'Cuenta de Google guardada.');
      } else {
        await AsyncStorage.removeItem('@tallerapp:google_account');
        Alert.alert('Actualizado', 'Se desvinculó la cuenta de Google.');
      }
      if (onSaved) onSaved();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la cuenta de Google.');
    } finally {
      setGuardandoGoogle(false);
    }
  };

  const handleGuardarTaller = async () => {
    if (!nombreTaller.trim()) {
      Alert.alert('Campo requerido', 'El nombre del taller es obligatorio.');
      return;
    }

    setGuardando(true);
    try {
      await tallerRepo.upsert({
        nombre: nombreTaller.trim(),
        nit: nit.trim() || null,
        telefono: telefonoTaller.trim() || null,
        correo: correoTaller.trim() || null,
        direccion: direccionTaller.trim() || null,
      });

      if (cuentaGoogle.trim()) {
        await AsyncStorage.setItem('@tallerapp:google_account', cuentaGoogle.trim());
      }

      Alert.alert('Éxito', 'Configuración guardada correctamente.');
      if (onSaved) onSaved();
      onClose();
    } catch {
      Alert.alert('Error', 'No se pudieron guardar los cambios del taller.');
    } finally {
      setGuardando(false);
    }
  };

  const handleRespaldarAhora = async () => {
    setRespaldando(true);
    try {
      const [tallerData, mecanicosData, clientesData, vehiculosData, ordenesData] = await Promise.all([
        tallerRepo.get(),
        mecanicosRepo.getActivos(),
        clientesRepo.getAll(),
        vehiculosRepo.getAll(),
        ordenesRepo.getAll(),
      ]);

      const backup = {
        app: 'Box H&T',
        version: '1.0',
        cuenta_google: cuentaGoogle.trim() || null,
        exportado_en: new Date().toISOString(),
        taller: tallerData,
        mecanicos: mecanicosData,
        clientes: clientesData,
        vehiculos: vehiculosData,
        ordenes: ordenesData,
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `boxhyt_respaldo_${dateStr}.json`;
      const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      const fileUri = `${baseDir}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup, null, 2), {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Guardar copia de seguridad en Google Drive o Dispositivo',
          UTI: 'public.json',
        });
      } else {
        Alert.alert(
          'Respaldo Creado',
          `Se generó el archivo de respaldo con ${vehiculosData.length} vehículos y ${ordenesData.length} órdenes.`
        );
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo generar la copia de seguridad.');
    } finally {
      setRespaldando(false);
    }
  };

  const handleRecuperarDatos = () => {
    Alert.alert(
      'Recuperación de Respaldo',
      'Tus datos actuales están almacenados y protegidos localmente en este dispositivo. Para restaurar desde una copia guardada en Google Drive, puedes consultar tu archivo JSON exportado.',
      [{ text: 'Entendido' }]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="settings-sharp" size={20} color={WorkshopTheme.primary} />
              </View>
              <View>
                <Text style={styles.title}>Configuración</Text>
                <Text style={styles.subtitle}>Taller, Google y Respaldo</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={WorkshopTheme.secondary} />
            </TouchableOpacity>
          </View>

          {cargando ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={WorkshopTheme.primary} />
            </View>
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* SECCIÓN 1: CUENTA DE GOOGLE & RESPALDO */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.googleIconBox}>
                    <Ionicons name="cloud-upload" size={20} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Copia de Seguridad y Google Drive</Text>
                    <Text style={styles.sectionSubtitle}>
                      {cuentaGoogle ? `Asociada a: ${cuentaGoogle}` : 'Exporta tu copia y guárdala en Drive'}
                    </Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Cuenta de Google (Gmail)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="ejemplo@gmail.com"
                    placeholderTextColor={WorkshopTheme.secondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={cuentaGoogle}
                    onChangeText={setCuentaGoogle}
                  />
                </View>

                {/* Botones de Respaldo y Recuperación */}
                <View style={styles.googleActionsRow}>
                  <TouchableOpacity
                    style={styles.googleSaveBtn}
                    onPress={handleGuardarGoogle}
                    disabled={guardandoGoogle}>
                    {guardandoGoogle ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={15} color="#fff" />
                        <Text style={styles.googleSaveBtnText}>Guardar</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.backupBtn}
                    onPress={handleRespaldarAhora}
                    disabled={respaldando}>
                    {respaldando ? (
                      <ActivityIndicator size="small" color="#2563eb" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={15} color="#2563eb" />
                        <Text style={styles.backupBtnText}>Guardar en Drive</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.restoreBtn}
                    onPress={handleRecuperarDatos}>
                    <Ionicons name="information-circle-outline" size={15} color="#059669" />
                    <Text style={styles.restoreBtnText}>Info Copia</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* SECCIÓN 2: DATOS DEL TALLER */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.tallerIconBox}>
                    <Ionicons name="business" size={20} color={WorkshopTheme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Datos del Taller</Text>
                    <Text style={styles.sectionSubtitle}>
                      Información de contacto y encabezado
                    </Text>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nombre del Taller</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre comercial"
                    placeholderTextColor={WorkshopTheme.secondary}
                    value={nombreTaller}
                    onChangeText={setNombreTaller}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>NIT / RUC</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Identificación fiscal"
                      placeholderTextColor={WorkshopTheme.secondary}
                      value={nit}
                      onChangeText={setNit}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Teléfono</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Teléfono taller"
                      placeholderTextColor={WorkshopTheme.secondary}
                      keyboardType="phone-pad"
                      value={telefonoTaller}
                      onChangeText={setTelefonoTaller}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Correo Electrónico</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="contacto@taller.com"
                    placeholderTextColor={WorkshopTheme.secondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={correoTaller}
                    onChangeText={setCorreoTaller}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Dirección</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Dirección física"
                    placeholderTextColor={WorkshopTheme.secondary}
                    value={direccionTaller}
                    onChangeText={setDireccionTaller}
                  />
                </View>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={guardando}>
              <Text style={styles.cancelBtnText}>Cerrar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleGuardarTaller}
              disabled={guardando}>
              {guardando ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="save" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Guardar Todo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: WorkshopTheme.secondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  googleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tallerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: WorkshopTheme.secondary,
    marginTop: 1,
  },
  googleActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  googleSaveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 10,
  },
  googleSaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  backupBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 10,
    borderRadius: 10,
  },
  backupBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  restoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingVertical: 10,
    borderRadius: 10,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: WorkshopTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

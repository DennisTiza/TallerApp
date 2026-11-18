import { WorkshopTheme } from '@/constants/theme';
import { mecanicosRepo, Taller, tallerRepo } from '@/database';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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

const { width: SLIDE_WIDTH } = Dimensions.get('window');

interface OnboardingModalProps {
  visible: boolean;
  onComplete: (taller: Taller) => void;
}

export function OnboardingModal({ visible, onComplete }: OnboardingModalProps) {
  const [paso, setPaso] = useState(0); // 0 = bienvenida, 1 = empresa, 2 = mecánico, 3 = google
  const [slideAnim] = useState(() => new Animated.Value(0));

  // Datos del Taller
  const [nombreTaller, setNombreTaller] = useState('');
  const [nit, setNit] = useState('');
  const [telefonoTaller, setTelefonoTaller] = useState('');
  const [correoTaller, setCorreoTaller] = useState('');
  const [direccionTaller, setDireccionTaller] = useState('');

  // Datos del Primer Mecánico
  const [nombreMecanico, setNombreMecanico] = useState('');
  const [telefonoMecanico, setTelefonoMecanico] = useState('');
  const [especialidadMecanico, setEspecialidadMecanico] = useState('Mecánica General');

  // Cuenta de Google
  const [cuentaGoogle, setCuentaGoogle] = useState('');

  const [guardando, setGuardando] = useState(false);

  const irAlPaso = (nuevoPaso: number) => {
    const dir = nuevoPaso > paso ? -1 : 1;
    slideAnim.setValue(dir * SLIDE_WIDTH);
    setPaso(nuevoPaso);
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 80,
      friction: 12,
      useNativeDriver: true,
    }).start();
  };

  const handleContinuarBienvenida = () => {
    irAlPaso(1);
  };

  const handleContinuarEmpresa = () => {
    if (!nombreTaller.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre de tu taller o empresa.');
      return;
    }
    irAlPaso(2);
  };

  const handleContinuarMecanico = () => {
    if (!nombreMecanico.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa tu nombre de usuario o encargado.');
      return;
    }
    irAlPaso(3);
  };

  const handleVolver = () => {
    if (paso > 0) {
      irAlPaso(paso - 1);
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const tallerGuardado = await tallerRepo.upsert({
        nombre: nombreTaller.trim(),
        nit: nit.trim() || null,
        telefono: telefonoTaller.trim() || null,
        correo: correoTaller.trim() || null,
        direccion: direccionTaller.trim() || null,
      });

      await mecanicosRepo.create({
        taller_id: tallerGuardado.id,
        nombre: nombreMecanico.trim(),
        telefono: telefonoMecanico.trim() || null,
        especialidad: especialidadMecanico.trim() || 'Mecánica General',
        activo: 1,
      });

      if (cuentaGoogle.trim()) {
        await AsyncStorage.setItem('@tallerapp:google_account', cuentaGoogle.trim());
      }

      onComplete(tallerGuardado);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar la configuración inicial.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.root}>
        {/* Indicadores de paso */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                paso === i ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        <Animated.View
          style={[
            styles.slideContainer,
            { transform: [{ translateX: slideAnim }] },
          ]}>

          {/* ───────────── PASO 0: BIENVENIDA ───────────── */}
          {paso === 0 && (
            <View style={styles.slide}>
              <View style={styles.welcomeIconOuter}>
                <View style={styles.welcomeIconInner}>
                  <Ionicons name="construct" size={42} color={WorkshopTheme.onPrimary} />
                </View>
              </View>

              <View style={styles.welcomeTexts}>
                <Text style={styles.welcomeTitle}>Hola, bienvenido</Text>
                <Text style={styles.welcomeSubtitle}>
                  Soy <Text style={styles.bold}>boxStudio</Text>, tu asistente inteligente para la gestión integral de tu taller mecánico.
                </Text>
                <Text style={styles.welcomeBody}>
                  En los próximos pasos configuraremos la información de tu empresa, tus datos de usuario y tus preferencias para que puedas comenzar a operar de inmediato.
                </Text>
              </View>

              <View style={styles.featureList}>
                <FeatureRow icon="shield-checkmark" text="Datos protegidos localmente" />
                <FeatureRow icon="cloud-outline" text="Copia de seguridad y respaldo" />
                <FeatureRow icon="flash" text="Rápido y 100% sin conexión a internet" />
              </View>

              <TouchableOpacity
                style={styles.welcomeButton}
                onPress={handleContinuarBienvenida}
                activeOpacity={0.88}>
                <Text style={styles.primaryButtonText}>Comenzar</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ───────────── PASO 1: DATOS DEL TALLER ───────────── */}
          {paso === 1 && (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView
                contentContainerStyle={styles.formScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">

                <View style={styles.formHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>PASO 1 DE 3</Text>
                  </View>
                  <Text style={styles.formTitle}>Datos de tu Empresa</Text>
                  <Text style={styles.formSubtitle}>
                    Ingresa la información principal de tu taller o negocio.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Nombre del Taller <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Taller Mecánico Box H&T"
                    placeholderTextColor={WorkshopTheme.secondary}
                    value={nombreTaller}
                    onChangeText={setNombreTaller}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>NIT / RUC / ID</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="900.123.456-7"
                      placeholderTextColor={WorkshopTheme.secondary}
                      value={nit}
                      onChangeText={setNit}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Teléfono</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+57 300 000 0000"
                      placeholderTextColor={WorkshopTheme.secondary}
                      keyboardType="phone-pad"
                      value={telefonoTaller}
                      onChangeText={setTelefonoTaller}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Correo Electrónico</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="contacto@mitaller.com"
                    placeholderTextColor={WorkshopTheme.secondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={correoTaller}
                    onChangeText={setCorreoTaller}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Dirección</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Calle 10 # 20 - 30"
                    placeholderTextColor={WorkshopTheme.secondary}
                    value={direccionTaller}
                    onChangeText={setDireccionTaller}
                  />
                </View>

                <View style={styles.navRow}>
                  <TouchableOpacity
                    onPress={handleVolver}
                    style={styles.backButton}
                    activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={18} color={WorkshopTheme.secondary} />
                    <Text style={styles.backButtonText}>Volver</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleContinuarEmpresa}
                    activeOpacity={0.88}>
                    <Text style={styles.primaryButtonText}>Continuar</Text>
                    <Ionicons name="arrow-forward" size={18} color={WorkshopTheme.onPrimary} />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* ───────────── PASO 2: PRIMER MECÁNICO ───────────── */}
          {paso === 2 && (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView
                contentContainerStyle={styles.formScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">

                <View style={styles.formHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>PASO 2 DE 3</Text>
                  </View>
                  <Text style={styles.formTitle}>Tu Perfil de Usuario</Text>
                  <Text style={styles.formSubtitle}>
                    Ingresa tus datos como administrador o encargado del taller.
                  </Text>
                </View>

                <View style={styles.mechanicIllustration}>
                  <View style={styles.mechanicIconCircle}>
                    <MaterialIcons name="person" size={36} color={WorkshopTheme.primary} />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Tu Nombre Completo <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ej. Ing. Erick TR"
                    placeholderTextColor={WorkshopTheme.secondary}
                    value={nombreMecanico}
                    onChangeText={setNombreMecanico}
                  />
                </View>

                <View style={styles.rowInputs}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Teléfono</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+57 310 000 0000"
                      placeholderTextColor={WorkshopTheme.secondary}
                      keyboardType="phone-pad"
                      value={telefonoMecanico}
                      onChangeText={setTelefonoMecanico}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Cargo / Rol</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Administrador"
                      placeholderTextColor={WorkshopTheme.secondary}
                      value={especialidadMecanico}
                      onChangeText={setEspecialidadMecanico}
                    />
                  </View>
                </View>

                <View style={styles.infoBanner}>
                  <Ionicons name="information-circle" size={16} color={WorkshopTheme.tertiary} />
                  <Text style={styles.infoBannerText}>
                    Tu nombre se mostrará en el encabezado de la app y figurará en las operaciones del taller.
                  </Text>
                </View>

                <View style={styles.navRow}>
                  <TouchableOpacity
                    onPress={handleVolver}
                    style={styles.backButton}
                    activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={18} color={WorkshopTheme.secondary} />
                    <Text style={styles.backButtonText}>Volver</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleContinuarMecanico}
                    activeOpacity={0.88}>
                    <Text style={styles.primaryButtonText}>Continuar</Text>
                    <Ionicons name="arrow-forward" size={18} color={WorkshopTheme.onPrimary} />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* ───────────── PASO 3: CUENTA DE GOOGLE & RESPALDO ───────────── */}
          {paso === 3 && (
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView
                contentContainerStyle={styles.formScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled">

                <View style={styles.formHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>PASO 3 DE 3</Text>
                  </View>
                  <Text style={styles.formTitle}>Cuenta de Google y Respaldo</Text>
                  <Text style={styles.formSubtitle}>
                    Vincula una cuenta de Google para respaldar tus clientes, órdenes y vehículos de forma segura.
                  </Text>
                </View>

                <View style={styles.googleIllustration}>
                  <View style={styles.googleIconCircle}>
                    <Ionicons name="cloud-upload" size={36} color="#2563eb" />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Cuenta de Google (Gmail)
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="taller.mecanico@gmail.com"
                    placeholderTextColor={WorkshopTheme.secondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={cuentaGoogle}
                    onChangeText={setCuentaGoogle}
                  />
                  <Text style={styles.fieldHint}>
                    Opcional. Te permitirá restaurar y sincronizar tus datos en la nube.
                  </Text>
                </View>

                <View style={styles.googleCard}>
                  <View style={styles.googleCardRow}>
                    <Ionicons name="shield-checkmark" size={20} color="#16a34a" />
                    <Text style={styles.googleCardTitle}>Copia de seguridad y recuperación</Text>
                  </View>
                  <Text style={styles.googleCardDesc}>
                    Con tu cuenta de Google configurada, tendrás una copia de tus registros protegida ante pérdida, cambio o reinicio de tu dispositivo.
                  </Text>
                </View>

                <View style={styles.navRow}>
                  <TouchableOpacity
                    onPress={handleVolver}
                    style={styles.backButton}
                    activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={18} color={WorkshopTheme.secondary} />
                    <Text style={styles.backButtonText}>Volver</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.primaryButton, guardando && styles.buttonDisabled]}
                    onPress={handleGuardar}
                    disabled={guardando}
                    activeOpacity={0.88}>
                    {guardando ? (
                      <ActivityIndicator color={WorkshopTheme.onPrimary} />
                    ) : (
                      <>
                        <Text style={styles.primaryButtonText}>¡Comenzar!</Text>
                        <Ionicons name="checkmark-circle" size={18} color={WorkshopTheme.onPrimary} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
}

function FeatureRow({ icon, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }) {
  return (
    <View style={featureStyles.row}>
      <View style={featureStyles.iconBox}>
        <Ionicons name={icon} size={16} color={WorkshopTheme.tertiary} />
      </View>
      <Text style={featureStyles.text}>{text}</Text>
    </View>
  );
}

const featureStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    color: WorkshopTheme.onSurface,
    fontWeight: '500',
  },
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: WorkshopTheme.surface,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: WorkshopTheme.primary,
  },
  dotInactive: {
    width: 8,
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
  },
  slideContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  slide: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
    paddingBottom: 36,
  },
  // ── Bienvenida ──
  welcomeIconOuter: {
    alignItems: 'center',
    marginBottom: 4,
  },
  welcomeIconInner: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: WorkshopTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: WorkshopTheme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  welcomeTexts: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: WorkshopTheme.onSurface,
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: WorkshopTheme.onSurface,
    lineHeight: 24,
    marginBottom: 12,
  },
  welcomeBody: {
    fontSize: 14,
    color: WorkshopTheme.secondary,
    lineHeight: 21,
  },
  bold: {
    fontWeight: '700',
    color: WorkshopTheme.primary,
  },
  featureList: {
    marginBottom: 28,
  },
  // ── Formulario común ──
  formScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  formHeader: {
    marginBottom: 20,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: '#475569',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: WorkshopTheme.onSurface,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 13,
    color: WorkshopTheme.secondary,
    lineHeight: 18,
  },
  mechanicIllustration: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mechanicIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIllustration: {
    alignItems: 'center',
    marginBottom: 16,
  },
  googleIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  googleCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  googleCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  googleCardDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
  },
  fieldHint: {
    fontSize: 11,
    color: WorkshopTheme.secondary,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  required: {
    color: '#dc2626',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f1f5f9',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: WorkshopTheme.primary,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: WorkshopTheme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  welcomeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: WorkshopTheme.primary,
    paddingVertical: 13,
    paddingHorizontal: 36,
    borderRadius: 14,
    minWidth: 180,
    maxWidth: 240,
    shadowColor: WorkshopTheme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

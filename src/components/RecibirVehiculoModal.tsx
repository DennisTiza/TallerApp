import { WorkshopTheme } from '@/constants/theme';
import {
  Cliente,
  clientesRepo,
  Mecanico,
  ordenesRepo,
  vehiculosRepo,
} from '@/database';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
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

interface RecibirVehiculoModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mecanicos: Mecanico[];
  clientes?: Cliente[];
}

export function RecibirVehiculoModal({
  visible,
  onClose,
  onSuccess,
  mecanicos,
  clientes = [],
}: RecibirVehiculoModalProps) {
  // Datos del Vehículo
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [color, setColor] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [chasis, setChasis] = useState('');
  const [vehiculoDetectado, setVehiculoDetectado] = useState(false);

  // Propietario / Cliente
  const [listaClientes, setListaClientes] = useState<Cliente[]>(clientes);
  const [modoCliente, setModoCliente] = useState<'existente' | 'nuevo'>('nuevo');
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');

  // Servicio Inicial
  const [tipoMotivo, setTipoMotivo] = useState('Mantenimiento');
  const [descripcionServicio, setDescripcionServicio] = useState('');
  const [mecanicoSeleccionado, setMecanicoSeleccionado] = useState<string>(
    mecanicos[0]?.id || ''
  );
  const [guardando, setGuardando] = useState(false);

  // Cargar lista actualizada de clientes al abrir el modal
  useEffect(() => {
    if (visible) {
      clientesRepo.getAll().then((cls) => {
        setListaClientes(cls);
        if (cls.length > 0 && !clienteSeleccionado) {
          setModoCliente('existente');
        }
      });
    }
  }, [visible, clienteSeleccionado]);


  const resetForm = () => {
    setPlaca('');
    setMarca('');
    setModelo('');
    setAnio('');
    setColor('');
    setKilometraje('');
    setChasis('');
    setVehiculoDetectado(false);
    setClienteSeleccionado(null);
    setNombreCliente('');
    setTelefonoCliente('');
    setBusquedaCliente('');
    setTipoMotivo('Mantenimiento');
    setDescripcionServicio('');
  };

  // Autodetectar si la placa ya existe en la base de datos
  const handlePlacaBlur = async () => {
    const clean = placa.trim().toUpperCase();
    if (clean.length >= 3) {
      try {
        const existente = await vehiculosRepo.getByPlaca(clean);
        if (existente) {
          setVehiculoDetectado(true);
          if (existente.marca) setMarca(existente.marca);
          if (existente.modelo) setModelo(existente.modelo);
          if (existente.anio) setAnio(existente.anio.toString());
          if (existente.color) setColor(existente.color);
          if (existente.kilometraje) setKilometraje(existente.kilometraje.toString());
          if (existente.vin_chasis) setChasis(existente.vin_chasis);

          // Si el vehículo ya tiene propietario asignado, seleccionarlo
          if (existente.cliente_id) {
            const prop = listaClientes.find((c) => c.id === existente.cliente_id) ||
              await clientesRepo.getById(existente.cliente_id);
            if (prop) {
              setClienteSeleccionado(prop);
              setModoCliente('existente');
            }
          }
        } else {
          setVehiculoDetectado(false);
        }
      } catch (err) {
        console.error('Error al consultar placa:', err);
      }
    }
  };

  // Clientes filtrados para la selección
  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.trim().toLowerCase();
    if (!q) return listaClientes.slice(0, 5);
    return listaClientes.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.telefono && c.telefono.includes(q))
    ).slice(0, 6);
  }, [listaClientes, busquedaCliente]);

  const handleSeleccionarCliente = (c: Cliente) => {
    setClienteSeleccionado(c);
    setNombreCliente(c.nombre);
    setTelefonoCliente(c.telefono || '');
    setBusquedaCliente('');
  };

  const handleGuardar = async () => {
    const cleanPlaca = placa.trim().toUpperCase();
    if (!cleanPlaca) {
      Alert.alert('Placa requerida', 'Por favor ingresa la placa del vehículo.');
      return;
    }

    if (modoCliente === 'nuevo' && !nombreCliente.trim()) {
      Alert.alert('Cliente requerido', 'Por favor ingresa el nombre del propietario o cliente.');
      return;
    }

    if (modoCliente === 'existente' && !clienteSeleccionado) {
      Alert.alert('Cliente requerido', 'Por favor selecciona un cliente registrado o cambia a "Nuevo Cliente".');
      return;
    }

    setGuardando(true);
    try {
      // 1. Obtener o crear el cliente
      let clienteId = clienteSeleccionado?.id;
      if (!clienteId) {
        const nuevoCliente = await clientesRepo.create({
          nombre: nombreCliente.trim(),
          telefono: telefonoCliente.trim() || null,
          correo: null,
          direccion: null,
          notas: null,
        });
        clienteId = nuevoCliente.id;
      }

      // 2. Comprobar si el vehículo ya existe o crearlo
      const vehiculoExistente = await vehiculosRepo.getByPlaca(cleanPlaca);
      let vehiculoId = vehiculoExistente?.id;

      const parsedKm = kilometraje ? parseInt(kilometraje, 10) : 0;
      const parsedAnio = anio ? parseInt(anio, 10) : null;

      if (vehiculoExistente) {
        await vehiculosRepo.update(vehiculoExistente.id, {
          cliente_id: clienteId,
          marca: marca.trim() || vehiculoExistente.marca,
          modelo: modelo.trim() || vehiculoExistente.modelo,
          anio: parsedAnio ?? vehiculoExistente.anio,
          color: color.trim() || vehiculoExistente.color,
          kilometraje: parsedKm > 0 ? parsedKm : vehiculoExistente.kilometraje,
          vin_chasis: chasis.trim().toUpperCase() || vehiculoExistente.vin_chasis,
          estado: 'en_taller',
        });
        vehiculoId = vehiculoExistente.id;
      } else {
        const nuevoVehiculo = await vehiculosRepo.create({
          cliente_id: clienteId,
          placa: cleanPlaca,
          marca: marca.trim() || null,
          modelo: modelo.trim() || null,
          anio: parsedAnio,
          color: color.trim() || null,
          kilometraje: parsedKm,
          vin_chasis: chasis.trim().toUpperCase() || null,
          estado: 'en_taller',
        });
        vehiculoId = nuevoVehiculo.id;
      }

      // 3. Crear orden de servicio con el tipo de motivo seleccionado
      await ordenesRepo.create({
        vehiculo_id: vehiculoId,
        mecanico_id: mecanicoSeleccionado || mecanicos[0]?.id || null,
        tipo: tipoMotivo,
        estado: 'recibido',
        descripcion: descripcionServicio.trim() || `${tipoMotivo} general`,
        fecha_servicio: new Date().toISOString().split('T')[0],
        kilometraje: parsedKm,
        presupuesto: 0,
        costo_total: 0,
      });

      resetForm();
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo recibir el vehículo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalSheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetSubtitle}>NUEVO INGRESO</Text>
              <Text style={styles.sheetTitle}>Recibir Vehículo</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={WorkshopTheme.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.sheetBody}>
            {/* ───── SECCIÓN 1: DATOS DEL VEHÍCULO ───── */}
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="directions-car" size={18} color={WorkshopTheme.primary} />
              <Text style={styles.groupHeading}>Datos del Vehículo</Text>
            </View>

            {/* Placa y Kilometraje */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1.2 }]}>
                <Text style={styles.label}>
                  Placa <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.monoInput]}
                  placeholder="ABC123"
                  placeholderTextColor={WorkshopTheme.secondary}
                  autoCapitalize="characters"
                  value={placa}
                  onChangeText={(text) => {
                    setPlaca(text);
                    if (vehiculoDetectado) setVehiculoDetectado(false);
                  }}
                  onBlur={handlePlacaBlur}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Kilometraje</Text>
                <TextInput
                  style={styles.input}
                  placeholder="85000"
                  placeholderTextColor={WorkshopTheme.secondary}
                  keyboardType="numeric"
                  value={kilometraje}
                  onChangeText={setKilometraje}
                />
              </View>
            </View>

            {vehiculoDetectado && (
              <View style={styles.detectedBanner}>
                <Ionicons name="checkmark-circle" size={16} color={WorkshopTheme.tertiary} />
                <Text style={styles.detectedBannerText}>
                  Vehículo encontrado en el taller. Datos cargados automáticamente.
                </Text>
              </View>
            )}

            {/* Marca y Modelo */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Marca</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Renault"
                  placeholderTextColor={WorkshopTheme.secondary}
                  value={marca}
                  onChangeText={setMarca}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Modelo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Clio"
                  placeholderTextColor={WorkshopTheme.secondary}
                  value={modelo}
                  onChangeText={setModelo}
                />
              </View>
            </View>

            {/* Año y Color */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Año</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2018"
                  placeholderTextColor={WorkshopTheme.secondary}
                  keyboardType="numeric"
                  value={anio}
                  onChangeText={setAnio}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Color</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Gris Eclipse"
                  placeholderTextColor={WorkshopTheme.secondary}
                  value={color}
                  onChangeText={setColor}
                />
              </View>
            </View>

            {/* Chasis / VIN */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chasis / VIN (Número de serie)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. VF1BB0A0F26189234"
                placeholderTextColor={WorkshopTheme.secondary}
                autoCapitalize="characters"
                value={chasis}
                onChangeText={setChasis}
              />
            </View>

            {/* ───── SECCIÓN 2: DATOS DEL PROPIETARIO ───── */}
            <View style={styles.sectionDivider} />
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="person" size={18} color={WorkshopTheme.primary} />
              <Text style={styles.groupHeading}>Propietario / Cliente</Text>
            </View>

            {/* Selector de Modo: Existente vs Nuevo */}
            <View style={styles.clientModeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  modoCliente === 'existente' && styles.modeButtonActive,
                ]}
                onPress={() => setModoCliente('existente')}>
                <Text
                  style={[
                    styles.modeButtonText,
                    modoCliente === 'existente' && styles.modeButtonTextActive,
                  ]}>
                  Cliente Registrado ({listaClientes.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  modoCliente === 'nuevo' && styles.modeButtonActive,
                ]}
                onPress={() => {
                  setModoCliente('nuevo');
                  setClienteSeleccionado(null);
                }}>
                <Text
                  style={[
                    styles.modeButtonText,
                    modoCliente === 'nuevo' && styles.modeButtonTextActive,
                  ]}>
                  + Nuevo Cliente
                </Text>
              </TouchableOpacity>
            </View>

            {/* MODO A: Cliente Registrado */}
            {modoCliente === 'existente' && (
              <View style={styles.existingClientBox}>
                {clienteSeleccionado ? (
                  <View style={styles.selectedClientCard}>
                    <View style={styles.selectedClientLeft}>
                      <View style={styles.selectedClientAvatar}>
                        <Text style={styles.selectedClientAvatarText}>
                          {clienteSeleccionado.nombre.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.selectedClientInfo}>
                        <Text style={styles.selectedClientName} numberOfLines={1}>
                          {clienteSeleccionado.nombre}
                        </Text>
                        <Text style={styles.selectedClientPhone}>
                          {clienteSeleccionado.telefono || 'Sin teléfono'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setClienteSeleccionado(null)}
                      style={styles.changeClientBtn}>
                      <Text style={styles.changeClientBtnText}>Cambiar</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.clientSearchContainer}>
                    <View style={styles.clientSearchInputRow}>
                      <Ionicons name="search" size={16} color={WorkshopTheme.secondary} />
                      <TextInput
                        style={styles.clientSearchInput}
                        placeholder="Buscar por nombre o teléfono..."
                        placeholderTextColor={WorkshopTheme.secondary}
                        value={busquedaCliente}
                        onChangeText={setBusquedaCliente}
                      />
                    </View>

                    {clientesFiltrados.length === 0 ? (
                      <View style={styles.noClientsFound}>
                        <Text style={styles.noClientsText}>
                          No hay clientes registrados que coincidan.
                        </Text>
                        <TouchableOpacity
                          onPress={() => setModoCliente('nuevo')}
                          style={styles.switchToNewBtn}>
                          <Text style={styles.switchToNewBtnText}>Crear nuevo cliente</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.clientsSuggestionsList}>
                        {clientesFiltrados.map((c) => (
                          <TouchableOpacity
                            key={c.id}
                            style={styles.clientSuggestionItem}
                            onPress={() => handleSeleccionarCliente(c)}>
                            <View style={styles.clientSuggestionLeft}>
                              <Text style={styles.clientSuggestionName}>{c.nombre}</Text>
                              <Text style={styles.clientSuggestionPhone}>
                                {c.telefono || 'Sin teléfono'}
                              </Text>
                            </View>
                            <Ionicons
                              name="checkmark-circle-outline"
                              size={20}
                              color={WorkshopTheme.primary}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* MODO B: Nuevo Cliente */}
            {modoCliente === 'nuevo' && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Nombre del Cliente <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={nombreCliente}
                    onChangeText={setNombreCliente}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Teléfono / WhatsApp</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+57 300 000 0000"
                    placeholderTextColor={WorkshopTheme.secondary}
                    keyboardType="phone-pad"
                    value={telefonoCliente}
                    onChangeText={setTelefonoCliente}
                  />
                </View>
              </View>
            )}

            {/* ───── SECCIÓN 3: MOTIVO DE INGRESO Y SERVICIO ───── */}
            <View style={styles.sectionDivider} />
            <View style={styles.sectionHeaderRow}>
              <MaterialIcons name="build" size={18} color={WorkshopTheme.primary} />
              <Text style={styles.groupHeading}>Motivo de Ingreso / Servicio</Text>
            </View>

            {/* Tipo de Motivo de Ingreso */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de Motivo *</Text>
              <View style={styles.tipoMotivoGrid}>
                {[
                  { key: 'Mantenimiento', label: 'Mantenimiento', icon: 'oil-barrel' as const, color: '#0f766e', bg: '#ccfbf1' },
                  { key: 'Revisión', label: 'Revisión', icon: 'fact-check' as const, color: '#b45309', bg: '#fef3c7' },
                  { key: 'Garantía', label: 'Garantía', icon: 'verified-user' as const, color: '#2563eb', bg: '#dbeafe' },
                  { key: 'Reparación', label: 'Reparación', icon: 'build' as const, color: '#dc2626', bg: '#fee2e2' },
                ].map((t) => {
                  const isSelected = tipoMotivo === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.tipoMotivoChip,
                        isSelected && { borderColor: t.color, backgroundColor: t.bg },
                      ]}
                      onPress={() => setTipoMotivo(t.key)}>
                      <MaterialIcons
                        name={t.icon}
                        size={16}
                        color={isSelected ? t.color : WorkshopTheme.secondary}
                      />
                      <Text
                        style={[
                          styles.tipoMotivoChipText,
                          isSelected && { color: t.color, fontWeight: '700' },
                        ]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Descripción Detallada */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descripción del Trabajo / Síntomas</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Detalla las fallas reportadas, cambio de piezas o diagnóstico..."
                placeholderTextColor={WorkshopTheme.secondary}
                multiline
                numberOfLines={3}
                value={descripcionServicio}
                onChangeText={setDescripcionServicio}
              />
            </View>

            {/* Asignación de mecánico */}
            {mecanicos.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mecánico o Encargado Asignado</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mechanicsList}>
                  {mecanicos.map((m) => {
                    const isSelected = (mecanicoSeleccionado || mecanicos[0]?.id) === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => setMecanicoSeleccionado(m.id)}
                        style={[
                          styles.mechanicChip,
                          isSelected && styles.mechanicChipSelected,
                        ]}>
                        <MaterialIcons
                          name="person"
                          size={16}
                          color={isSelected ? WorkshopTheme.onPrimary : WorkshopTheme.secondary}
                        />
                        <Text
                          style={[
                            styles.mechanicChipText,
                            isSelected && styles.mechanicChipTextSelected,
                          ]}>
                          {m.nombre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Botón Guardar */}
            <TouchableOpacity
              style={[styles.submitButton, guardando && styles.buttonDisabled]}
              onPress={handleGuardar}
              disabled={guardando}
              activeOpacity={0.88}>
              {guardando ? (
                <ActivityIndicator color={WorkshopTheme.onPrimary} />
              ) : (
                <>
                  <Ionicons name="checkmark-sharp" size={20} color={WorkshopTheme.onPrimary} />
                  <Text style={styles.submitButtonText}>Confirmar Recepción</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 28, 45, 0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: WorkshopTheme.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: WorkshopTheme.surfaceContainerHigh,
  },
  sheetSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: WorkshopTheme.primary,
    letterSpacing: 1,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: WorkshopTheme.onSurface,
    letterSpacing: -0.4,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
    marginVertical: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  groupHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: WorkshopTheme.onSurface,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: WorkshopTheme.onSurface,
    marginBottom: 6,
  },
  required: {
    color: WorkshopTheme.primary,
  },
  input: {
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: WorkshopTheme.onSurface,
    borderWidth: 1,
    borderColor: WorkshopTheme.surfaceContainerHigh,
  },
  monoInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    letterSpacing: 1,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  detectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: WorkshopTheme.surfaceContainer,
    borderRadius: 10,
    padding: 10,
    marginTop: -4,
    marginBottom: 6,
  },
  detectedBannerText: {
    flex: 1,
    fontSize: 12,
    color: WorkshopTheme.tertiary,
    fontWeight: '600',
  },
  // ── Selector de Modo Cliente ──
  clientModeSelector: {
    flexDirection: 'row',
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
    borderRadius: 12,
    padding: 3,
    marginBottom: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: WorkshopTheme.secondary,
  },
  modeButtonTextActive: {
    color: WorkshopTheme.onSurface,
    fontWeight: '700',
  },
  // ── Tarjeta Cliente Seleccionado ──
  existingClientBox: {
    marginBottom: 4,
  },
  selectedClientCard: {
    backgroundColor: WorkshopTheme.surfaceContainerLow,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: WorkshopTheme.surfaceContainerHigh,
  },
  selectedClientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  selectedClientAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: WorkshopTheme.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedClientAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: WorkshopTheme.onSecondaryFixed,
  },
  selectedClientInfo: {
    flex: 1,
    minWidth: 0,
  },
  selectedClientName: {
    fontSize: 14,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
  },
  selectedClientPhone: {
    fontSize: 12,
    color: WorkshopTheme.secondary,
  },
  changeClientBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
  },
  changeClientBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WorkshopTheme.primary,
  },
  // ── Búsqueda de Clientes ──
  clientSearchContainer: {
    gap: 8,
  },
  clientSearchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: WorkshopTheme.surfaceContainerHigh,
  },
  clientSearchInput: {
    flex: 1,
    fontSize: 13,
    color: WorkshopTheme.onSurface,
  },
  clientsSuggestionsList: {
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: WorkshopTheme.surfaceContainerHigh,
    overflow: 'hidden',
  },
  clientSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WorkshopTheme.cardBorder,
  },
  clientSuggestionLeft: {
    flex: 1,
    minWidth: 0,
  },
  clientSuggestionName: {
    fontSize: 13,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
  },
  clientSuggestionPhone: {
    fontSize: 11,
    color: WorkshopTheme.secondary,
  },
  noClientsFound: {
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  noClientsText: {
    fontSize: 12,
    color: WorkshopTheme.secondary,
  },
  switchToNewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: WorkshopTheme.primaryFixed,
  },
  switchToNewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: WorkshopTheme.primary,
  },
  // ── Mecánicos ──
  mechanicsList: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  mechanicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
    marginRight: 8,
  },
  mechanicChipSelected: {
    backgroundColor: WorkshopTheme.primary,
  },
  mechanicChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: WorkshopTheme.secondary,
  },
  mechanicChipTextSelected: {
    color: WorkshopTheme.onPrimary,
  },
  tipoMotivoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  tipoMotivoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    minWidth: '47%',
    justifyContent: 'center',
  },
  tipoMotivoChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: WorkshopTheme.primary,
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 10,
    shadowColor: WorkshopTheme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  submitButtonText: {
    color: WorkshopTheme.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

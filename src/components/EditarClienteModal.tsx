import { WorkshopTheme } from '@/constants/theme';
import { Cliente, Vehiculo, clientesRepo, vehiculosRepo } from '@/database';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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

interface EditarClienteModalProps {
  visible: boolean;
  cliente: Cliente | null;
  vehiculos?: Vehiculo[];
  onClose: () => void;
  onSuccess: () => void;
  onDeleted?: () => void;
}

export function EditarClienteModal({
  visible,
  cliente,
  vehiculos = [],
  onClose,
  onSuccess,
  onDeleted,
}: EditarClienteModalProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notas, setNotas] = useState('');
  const [vehiculosAsignados, setVehiculosAsignados] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [showAllVehiculos, setShowAllVehiculos] = useState(false);

  useEffect(() => {
    if (cliente && visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNombre(cliente.nombre || '');
      setTelefono(cliente.telefono || '');
      setCorreo(cliente.correo || '');
      setDireccion(cliente.direccion || '');
      setNotas(cliente.notas || '');

      const iniciales = vehiculos
        .filter((v) => v.cliente_id === cliente.id)
        .map((v) => v.id);
      setVehiculosAsignados(iniciales);
    }
  }, [cliente, visible, vehiculos]);

  const toggleVehiculo = (vehiculoId: string) => {
    setVehiculosAsignados((prev) =>
      prev.includes(vehiculoId)
        ? prev.filter((id) => id !== vehiculoId)
        : [...prev, vehiculoId]
    );
  };

  const handleGuardar = async () => {
    if (!cliente) return;
    if (!nombre.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa el nombre del cliente.');
      return;
    }

    setGuardando(true);
    try {
      await clientesRepo.update(cliente.id, {
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        correo: correo.trim() || null,
        direccion: direccion.trim() || null,
        notas: notas.trim() || null,
      });

      // Actualizar relaciones de vehículos
      for (const v of vehiculos) {
        const shouldBeAssigned = vehiculosAsignados.includes(v.id);
        const isCurrentlyAssigned = v.cliente_id === cliente.id;

        if (shouldBeAssigned && !isCurrentlyAssigned) {
          await vehiculosRepo.update(v.id, { cliente_id: cliente.id });
        } else if (!shouldBeAssigned && isCurrentlyAssigned) {
          await vehiculosRepo.update(v.id, { cliente_id: null });
        }
      }

      Alert.alert('Éxito', 'Cliente y vehículos actualizados correctamente.');
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = () => {
    if (!cliente) return;
    Alert.alert(
      '¿Eliminar cliente?',
      `¿Estás seguro de que deseas eliminar a "${cliente.nombre}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setGuardando(true);
              await clientesRepo.delete(cliente.id);
              Alert.alert('Eliminado', 'El cliente ha sido eliminado.');
              onClose();
              if (onDeleted) {
                onDeleted();
              } else {
                onSuccess();
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar el cliente.');
            } finally {
              setGuardando(false);
            }
          },
        },
      ]
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
                <MaterialIcons name="person" size={20} color={WorkshopTheme.onTertiary} />
              </View>
              <View>
                <Text style={styles.title}>Editar Cliente</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {cliente?.nombre || ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color={WorkshopTheme.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Nombre Completo */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre Completo *</Text>
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Ej. Juan Pérez"
                placeholderTextColor={WorkshopTheme.secondary}
              />
            </View>

            {/* Teléfono */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Teléfono / Celular</Text>
              <TextInput
                style={styles.input}
                value={telefono}
                onChangeText={setTelefono}
                keyboardType="phone-pad"
                placeholder="Ej. 300 123 4567"
                placeholderTextColor={WorkshopTheme.secondary}
              />
            </View>

            {/* ── SECCIÓN ASIGNACIÓN DE VEHÍCULOS ── */}
            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={styles.vehiculosHeaderRow}
                onPress={() => setShowAllVehiculos((v) => !v)}
                activeOpacity={0.7}>
                <View style={styles.vehiculosHeaderLeft}>
                  <MaterialIcons name="directions-car" size={15} color={WorkshopTheme.primary} />
                  <Text style={styles.label}>Vehículos Asignados</Text>
                  <View style={styles.vehiculosCountPill}>
                    <Text style={styles.vehiculosCountText}>{vehiculosAsignados.length}</Text>
                  </View>
                </View>
                <MaterialIcons
                  name={showAllVehiculos ? 'expand-less' : 'expand-more'}
                  size={20}
                  color={WorkshopTheme.secondary}
                />
              </TouchableOpacity>

              {showAllVehiculos && (
                <View style={styles.vehiculosGrid}>
                  {vehiculos.length === 0 ? (
                    <Text style={styles.emptyVehiculosText}>No hay vehículos registrados en el taller.</Text>
                  ) : (
                    vehiculos.map((v) => {
                      const isAssigned = vehiculosAsignados.includes(v.id);
                      const isUnassigned = !v.cliente_id;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          style={[
                            styles.vehiculoCardSelect,
                            isAssigned && styles.vehiculoCardSelected,
                          ]}
                          onPress={() => toggleVehiculo(v.id)}>
                          <MaterialIcons
                            name={isAssigned ? 'check-circle' : 'directions-car'}
                            size={18}
                            color={isAssigned ? WorkshopTheme.primary : WorkshopTheme.secondary}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.vehiculoCardPlaca,
                                isAssigned && styles.vehiculoCardPlacaSelected,
                              ]}>
                              {v.placa}
                            </Text>
                            <Text style={styles.vehiculoCardDesc} numberOfLines={1}>
                              {[v.marca, v.modelo].filter(Boolean).join(' ') || 'Vehículo'}
                              {isUnassigned && !isAssigned ? ' · (Sin asignar)' : ''}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.vehiculoCardAction,
                              isAssigned && styles.vehiculoCardActionSelected,
                            ]}>
                            {isAssigned ? 'Asignado' : '+ Asignar'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              )}

              {!showAllVehiculos && vehiculosAsignados.length > 0 && (
                <View style={styles.vehiculosResumen}>
                  {vehiculos
                    .filter((v) => vehiculosAsignados.includes(v.id))
                    .slice(0, 3)
                    .map((v) => (
                      <View key={v.id} style={styles.vehiculoResumenChip}>
                        <MaterialIcons name="directions-car" size={12} color={WorkshopTheme.primary} />
                        <Text style={styles.vehiculoResumenText}>{v.placa}</Text>
                      </View>
                    ))}
                  {vehiculosAsignados.length > 3 && (
                    <View style={styles.vehiculoResumenChip}>
                      <Text style={styles.vehiculoResumenText}>+{vehiculosAsignados.length - 3} más</Text>
                    </View>
                  )}
                </View>
              )}
              {!showAllVehiculos && vehiculosAsignados.length === 0 && (
                <Text style={styles.emptyVehiculosText}>Toca para asignar vehículos a este cliente.</Text>
              )}
            </View>

            {/* Correo */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo Electrónico (opcional)</Text>
              <TextInput
                style={styles.input}
                value={correo}
                onChangeText={setCorreo}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="ejemplo@correo.com"
                placeholderTextColor={WorkshopTheme.secondary}
              />
            </View>

            {/* Dirección */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dirección / Ciudad (opcional)</Text>
              <TextInput
                style={styles.input}
                value={direccion}
                onChangeText={setDireccion}
                placeholder="Ej. Calle 45 # 12-34"
                placeholderTextColor={WorkshopTheme.secondary}
              />
            </View>

            {/* Notas */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notas u Observaciones (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notas}
                onChangeText={setNotas}
                multiline
                numberOfLines={3}
                placeholder="Detalles adicionales sobre el cliente..."
                placeholderTextColor={WorkshopTheme.secondary}
              />
            </View>

            {/* Botón Eliminar Cliente */}
            <View style={styles.dangerZone}>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleEliminar}
                disabled={guardando}>
                <MaterialIcons name="delete-forever" size={20} color="#dc2626" />
                <Text style={styles.deleteBtnText}>Eliminar este cliente</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Footer de acción */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={guardando}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleGuardar}
              disabled={guardando}>
              {guardando ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="save" size={18} color="#fff" />
                  <Text style={styles.saveBtnText}>Guardar Cambios</Text>
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
    backgroundColor: WorkshopTheme.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
  },
  subtitle: {
    fontSize: 13,
    color: WorkshopTheme.secondary,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
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
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  vehiculosHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  vehiculosHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vehiculosCountPill: {
    backgroundColor: WorkshopTheme.primaryContainer,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  vehiculosCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: WorkshopTheme.primary,
  },
  vehiculosResumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  vehiculoResumenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: WorkshopTheme.cardBorder,
  },
  vehiculoResumenText: {
    fontSize: 12,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyVehiculosText: {
    fontSize: 13,
    color: WorkshopTheme.secondary,
    fontStyle: 'italic',
  },
  vehiculosGrid: {
    gap: 8,
  },
  vehiculoCardSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  vehiculoCardSelected: {
    borderColor: WorkshopTheme.primary,
    backgroundColor: WorkshopTheme.primaryContainer,
  },
  vehiculoCardPlaca: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
  },
  vehiculoCardPlacaSelected: {
    color: WorkshopTheme.primary,
  },
  vehiculoCardDesc: {
    fontSize: 12,
    color: WorkshopTheme.secondary,
  },
  vehiculoCardAction: {
    fontSize: 12,
    fontWeight: '700',
    color: WorkshopTheme.secondary,
  },
  vehiculoCardActionSelected: {
    color: WorkshopTheme.primary,
  },
  dangerZone: {
    marginTop: 8,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: WorkshopTheme.primary,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

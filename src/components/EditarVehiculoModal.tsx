import { WorkshopTheme } from '@/constants/theme';
import { Cliente, EstadoVehiculo, clientesRepo, vehiculosRepo } from '@/database';
import { VehiculoConPropietario } from '@/types/workshop';
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

interface EditarVehiculoModalProps {
  visible: boolean;
  vehiculo: VehiculoConPropietario | null;
  clientes?: Cliente[];
  onClose: () => void;
  onSuccess: () => void;
  onDeleted?: () => void;
}

export function EditarVehiculoModal({
  visible,
  vehiculo,
  clientes = [],
  onClose,
  onSuccess,
  onDeleted,
}: EditarVehiculoModalProps) {
  const [placa, setPlaca] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [anio, setAnio] = useState('');
  const [color, setColor] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [chasis, setChasis] = useState('');
  const [estado, setEstado] = useState<EstadoVehiculo>('en_taller');
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [listaClientes, setListaClientes] = useState<Cliente[]>(clientes);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible) {
      if (clientes.length > 0) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setListaClientes(clientes);
      } else {
        clientesRepo.getAll().then(setListaClientes);
      }
    }
  }, [visible, clientes]);

  useEffect(() => {
    if (vehiculo && visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlaca(vehiculo.placa || '');
      setMarca(vehiculo.marca || '');
      setModelo(vehiculo.modelo || '');
      setAnio(vehiculo.anio ? vehiculo.anio.toString() : '');
      setColor(vehiculo.color || '');
      setKilometraje(vehiculo.kilometraje ? vehiculo.kilometraje.toString() : '');
      setChasis(vehiculo.vin_chasis || '');
      setEstado(vehiculo.estado || 'en_taller');
      setClienteId(vehiculo.cliente_id || null);
    }
  }, [vehiculo, visible]);

  const handleGuardar = async () => {
    if (!vehiculo) return;
    const cleanPlaca = placa.trim().toUpperCase();
    if (!cleanPlaca) {
      Alert.alert('Placa requerida', 'Por favor ingresa la placa del vehículo.');
      return;
    }

    setGuardando(true);
    try {
      await vehiculosRepo.update(vehiculo.id, {
        placa: cleanPlaca,
        marca: marca.trim() || null,
        modelo: modelo.trim() || null,
        anio: anio ? parseInt(anio, 10) : null,
        color: color.trim() || null,
        kilometraje: kilometraje ? parseInt(kilometraje, 10) : 0,
        vin_chasis: chasis.trim().toUpperCase() || null,
        estado,
        cliente_id: clienteId || null,
      });

      Alert.alert('Éxito', 'Vehículo actualizado correctamente.');
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el vehículo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = () => {
    if (!vehiculo) return;
    Alert.alert(
      '¿Eliminar vehículo?',
      `¿Estás seguro de que deseas eliminar el vehículo con placa ${vehiculo.placa}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setGuardando(true);
              await vehiculosRepo.delete(vehiculo.id);
              Alert.alert('Eliminado', 'El vehículo ha sido eliminado.');
              onClose();
              if (onDeleted) {
                onDeleted();
              } else {
                onSuccess();
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar el vehículo.');
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
                <MaterialIcons name="directions-car" size={20} color={WorkshopTheme.onTertiary} />
              </View>
              <View>
                <Text style={styles.title}>Editar Vehículo</Text>
                <Text style={styles.subtitle}>{vehiculo?.placa || ''}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={22} color={WorkshopTheme.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Placa y Kilometraje */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Placa *</Text>
                <TextInput
                  style={[styles.input, styles.plateInput]}
                  value={placa}
                  onChangeText={(t) => setPlaca(t.toUpperCase())}
                  autoCapitalize="characters"
                  maxLength={7}
                  placeholder="ABC-123"
                  placeholderTextColor={WorkshopTheme.secondary}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Kilometraje (km)</Text>
                <TextInput
                  style={styles.input}
                  value={kilometraje}
                  onChangeText={setKilometraje}
                  keyboardType="numeric"
                  placeholder="85000"
                  placeholderTextColor={WorkshopTheme.secondary}
                />
              </View>
            </View>

            {/* Marca y Modelo */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Marca</Text>
                <TextInput
                  style={styles.input}
                  value={marca}
                  onChangeText={setMarca}
                  placeholder="Ej. Renault"
                  placeholderTextColor={WorkshopTheme.secondary}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Modelo</Text>
                <TextInput
                  style={styles.input}
                  value={modelo}
                  onChangeText={setModelo}
                  placeholder="Ej. Clio"
                  placeholderTextColor={WorkshopTheme.secondary}
                />
              </View>
            </View>

            {/* Año y Color */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Año</Text>
                <TextInput
                  style={styles.input}
                  value={anio}
                  onChangeText={setAnio}
                  keyboardType="numeric"
                  placeholder="2018"
                  placeholderTextColor={WorkshopTheme.secondary}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Color</Text>
                <TextInput
                  style={styles.input}
                  value={color}
                  onChangeText={setColor}
                  placeholder="Gris Eclipse"
                  placeholderTextColor={WorkshopTheme.secondary}
                />
              </View>
            </View>

            {/* Chasis / VIN */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chasis / VIN (Número de serie)</Text>
              <TextInput
                style={styles.input}
                value={chasis}
                onChangeText={(t) => setChasis(t.toUpperCase())}
                autoCapitalize="characters"
                placeholder="Ej. VF1BB0A0F26189234"
                placeholderTextColor={WorkshopTheme.secondary}
              />
            </View>

            {/* Estado del Vehículo */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Estado en el Taller</Text>
              <View style={styles.estadoRow}>
                <TouchableOpacity
                  style={[
                    styles.estadoBtn,
                    estado === 'en_taller' && styles.estadoBtnActiveTaller,
                  ]}
                  onPress={() => setEstado('en_taller')}>
                  <MaterialIcons
                    name="garage"
                    size={18}
                    color={estado === 'en_taller' ? WorkshopTheme.primary : WorkshopTheme.secondary}
                  />
                  <Text
                    style={[
                      styles.estadoBtnText,
                      estado === 'en_taller' && styles.estadoBtnTextActive,
                    ]}>
                    En Taller
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.estadoBtn,
                    estado === 'entregado' && styles.estadoBtnActiveEntregado,
                  ]}
                  onPress={() => setEstado('entregado')}>
                  <MaterialIcons
                    name="check-circle"
                    size={18}
                    color={estado === 'entregado' ? '#137333' : WorkshopTheme.secondary}
                  />
                  <Text
                    style={[
                      styles.estadoBtnText,
                      estado === 'entregado' && { color: '#137333', fontWeight: '700' },
                    ]}>
                    Entregado
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Propietario / Cliente asignado */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Propietario / Cliente</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.clientesScroll}>
                <TouchableOpacity
                  style={[
                    styles.clienteChip,
                    clienteId === null && styles.clienteChipActive,
                  ]}
                  onPress={() => setClienteId(null)}>
                  <Text
                    style={[
                      styles.clienteChipText,
                      clienteId === null && styles.clienteChipTextActive,
                    ]}>
                    Sin asignar
                  </Text>
                </TouchableOpacity>
                {listaClientes.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.clienteChip,
                      clienteId === c.id && styles.clienteChipActive,
                    ]}
                    onPress={() => setClienteId(c.id)}>
                    <Text
                      style={[
                        styles.clienteChipText,
                        clienteId === c.id && styles.clienteChipTextActive,
                      ]}>
                      {c.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Botón Eliminar Vehículo */}
            <View style={styles.dangerZone}>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleEliminar}
                disabled={guardando}>
                <MaterialIcons name="delete-forever" size={20} color="#dc2626" />
                <Text style={styles.deleteBtnText}>Eliminar este vehículo</Text>
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
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
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
  row: {
    flexDirection: 'row',
    gap: 12,
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
  plateInput: {
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1.5,
    color: WorkshopTheme.primary,
  },
  estadoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  estadoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  estadoBtnActiveTaller: {
    borderColor: WorkshopTheme.primary,
    backgroundColor: WorkshopTheme.primaryContainer,
  },
  estadoBtnActiveEntregado: {
    borderColor: '#137333',
    backgroundColor: '#e6f4ea',
  },
  estadoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: WorkshopTheme.secondary,
  },
  estadoBtnTextActive: {
    color: WorkshopTheme.primary,
    fontWeight: '700',
  },
  clientesScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  clienteChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  clienteChipActive: {
    borderColor: WorkshopTheme.primary,
    backgroundColor: WorkshopTheme.primary,
  },
  clienteChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  clienteChipTextActive: {
    color: '#fff',
  },
  dangerZone: {
    marginTop: 10,
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

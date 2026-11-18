import { WorkshopTheme } from '@/constants/theme';
import { EstadoOrden, Mecanico, OrdenServicio, ordenesRepo } from '@/database';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export interface VehiculoInfo {
  placa?: string | null;
  marca?: string | null;
  modelo?: string | null;
  propietarioNombre?: string | null;
  propietarioTelefono?: string | null;
  kilometraje?: number | null;
}

interface EditarOrdenModalProps {
  visible: boolean;
  orden: OrdenServicio | null;
  mecanicos?: Mecanico[];
  vehiculoInfo?: VehiculoInfo | null;
  tallerNombre?: string;
  onClose: () => void;
  onSuccess: () => void;
  onDeleted?: () => void;
}

const ESTADOS_ORDEN: { key: EstadoOrden; label: string; color: string; bg: string }[] = [
  { key: 'recibido', label: 'Recibido', color: '#b06000', bg: '#fef7e0' },
  { key: 'en_proceso', label: 'En Proceso', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'listo', label: 'Listo', color: '#137333', bg: '#e6f4ea' },
];

const TIPOS_SERVICIO = [
  { key: 'Mantenimiento', label: 'Mantenimiento', icon: '🔧' },
  { key: 'Revisión', label: 'Revisión', icon: '🔍' },
  { key: 'Garantía', label: 'Garantía', icon: '🛡️' },
  { key: 'Reparación', label: 'Reparación', icon: '⚙️' },
];

export function EditarOrdenModal({
  visible,
  orden,
  mecanicos = [],
  vehiculoInfo = null,
  tallerNombre,
  onClose,
  onSuccess,
  onDeleted,
}: EditarOrdenModalProps) {
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState<EstadoOrden>('recibido');
  const [descripcion, setDescripcion] = useState('');
  const [descripcionHecha, setDescripcionHecha] = useState('');
  const [repuestos, setRepuestos] = useState('');
  const [costoTotal, setCostoTotal] = useState('');
  const [presupuesto, setPresupuesto] = useState('');
  const [kilometraje, setKilometraje] = useState('');
  const [mecanicoId, setMecanicoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  useEffect(() => {
    if (orden && visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTipo(orden.tipo || 'Mantenimiento');
      setEstado(orden.estado || 'recibido');
      setDescripcion(orden.descripcion || '');
      setDescripcionHecha(orden.trabajo_realizado || '');
      setRepuestos(orden.repuestos || '');
      setCostoTotal(orden.costo_total ? orden.costo_total.toString() : '0');
      setPresupuesto(orden.presupuesto ? orden.presupuesto.toString() : '0');
      setKilometraje(
        orden.kilometraje
          ? orden.kilometraje.toString()
          : vehiculoInfo?.kilometraje
          ? vehiculoInfo.kilometraje.toString()
          : ''
      );
      setMecanicoId(orden.mecanico_id || null);
      setMostrarPreview(false);
    }
  }, [orden, visible, vehiculoInfo]);

  const generarMensaje = () => {
    const nombre = vehiculoInfo?.propietarioNombre || 'Estimado(a) Cliente';
    const auto = [vehiculoInfo?.marca, vehiculoInfo?.modelo].filter(Boolean).join(' ') || 'su vehículo';
    const placa = vehiculoInfo?.placa ? ` (${vehiculoInfo.placa.toUpperCase()})` : '';
    const km = kilometraje
      ? `${parseInt(kilometraje, 10).toLocaleString('es-CO')} km`
      : vehiculoInfo?.kilometraje
      ? `${vehiculoInfo.kilometraje.toLocaleString('es-CO')} km`
      : 'N/D';
    const tipoServicio = tipo || 'Mantenimiento';
    const detalleTrabajo = descripcionHecha.trim() || descripcion.trim() || 'Servicio realizado con éxito';
    const repuestosTexto = repuestos.trim() || 'No se registraron repuestos';

    const hoy = new Date();
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const fechaStr = `${hoy.getDate()} de ${meses[hoy.getMonth()]} de ${hoy.getFullYear()}`;
    const nombreTallerStr = tallerNombre?.trim() || 'nuestro taller';

    return `Hola ${nombre} 👋\n\nTe compartimos el resumen del trabajo realizado en tu ${auto}${placa}:\n\n📅 Fecha: ${fechaStr}\n🔧 ${tipoServicio}: ${detalleTrabajo}\n🧰 Repuestos: ${repuestosTexto}\n📈 Kilometraje: ${km}\n\n¡Gracias por confiar en ${nombreTallerStr}!`;
  };

  const handleEnviarWhatsApp = () => {
    const telefono = vehiculoInfo?.propietarioTelefono?.replace(/[^0-9]/g, '');
    if (!telefono) {
      Alert.alert(
        'Teléfono no disponible',
        'El cliente no tiene un número telefónico registrado para enviar el mensaje de WhatsApp.'
      );
      return;
    }
    const mensaje = generarMensaje();
    const url = `whatsapp://send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`);
        }
      })
      .catch(() => {
        Linking.openURL(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`);
      });
  };

  const handleGuardar = async () => {
    if (!orden) return;

    setGuardando(true);
    try {
      await ordenesRepo.update(orden.id, {
        tipo: tipo.trim() || 'Servicio General',
        estado,
        descripcion: descripcion.trim() || null,
        trabajo_realizado: descripcionHecha.trim() || null,
        repuestos: repuestos.trim() || null,
        costo_total: parseFloat(costoTotal) || 0,
        presupuesto: parseFloat(presupuesto) || 0,
        kilometraje: kilometraje ? parseInt(kilometraje, 10) : null,
        mecanico_id: mecanicoId,
      });

      Alert.alert('Éxito', 'Orden de servicio actualizada correctamente.');
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la orden.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = () => {
    if (!orden) return;
    Alert.alert(
      '¿Eliminar orden de servicio?',
      '¿Estás seguro de que deseas eliminar este registro de servicio? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setGuardando(true);
              await ordenesRepo.delete(orden.id);
              Alert.alert('Eliminado', 'La orden de servicio ha sido eliminada.');
              onClose();
              if (onDeleted) {
                onDeleted();
              } else {
                onSuccess();
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo eliminar la orden.');
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
                <MaterialIcons name="build" size={20} color="#fff" />
              </View>
              <View>
                <Text style={styles.title}>Editar Servicio</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {vehiculoInfo?.placa ? `${vehiculoInfo.placa} • ` : ''}
                  {orden?.tipo || 'Orden de Servicio'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={WorkshopTheme.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Estado de la orden */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Estado del Trabajo</Text>
              <View style={styles.estadosGrid}>
                {ESTADOS_ORDEN.map((est) => {
                  const isActive = estado === est.key;
                  return (
                    <TouchableOpacity
                      key={est.key}
                      style={[
                        styles.estadoChip,
                        isActive && { backgroundColor: est.bg, borderColor: est.color },
                      ]}
                      onPress={() => setEstado(est.key)}>
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: isActive ? est.color : WorkshopTheme.outline },
                        ]}
                      />
                      <Text
                        style={[
                          styles.estadoChipText,
                          isActive && { color: est.color, fontWeight: '700' },
                        ]}>
                        {est.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* SECCIÓN WHATSAPP CUANDO ESTÁ LISTO */}
            {estado === 'listo' && (
              <View style={styles.whatsappCard}>
                <View style={styles.whatsappHeader}>
                  <View style={styles.whatsappIconCircle}>
                    <MaterialIcons name="chat" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.whatsappTitle}>Notificar al Cliente por WhatsApp</Text>
                    <Text style={styles.whatsappSubtitle}>
                      {vehiculoInfo?.propietarioNombre
                        ? `Cliente: ${vehiculoInfo.propietarioNombre} (${vehiculoInfo.propietarioTelefono || 'Sin teléfono'})`
                        : 'El vehículo está listo para entregar'}
                    </Text>
                  </View>
                </View>

                {/* Campos para el mensaje */}
                <View style={styles.whatsappFields}>
                  <Text style={styles.miniLabel}>Descripción del Trabajo Realizado</Text>
                  <TextInput
                    style={styles.miniInput}
                    value={descripcionHecha}
                    onChangeText={setDescripcionHecha}
                    placeholder="Ej: Cambio de aceite y filtros, ajuste de frenos..."
                    placeholderTextColor={WorkshopTheme.secondary}
                  />

                  <Text style={styles.miniLabel}>Repuestos Utilizados</Text>
                  <TextInput
                    style={styles.miniInput}
                    value={repuestos}
                    onChangeText={setRepuestos}
                    placeholder="Ej: Filtro de aceite, pastillas de freno..."
                    placeholderTextColor={WorkshopTheme.secondary}
                  />
                </View>

                {/* Botón toggle preview */}
                <TouchableOpacity
                  style={styles.previewToggleBtn}
                  onPress={() => setMostrarPreview(!mostrarPreview)}>
                  <MaterialIcons
                    name={mostrarPreview ? 'visibility-off' : 'visibility'}
                    size={16}
                    color="#059669"
                  />
                  <Text style={styles.previewToggleText}>
                    {mostrarPreview ? 'Ocultar vista previa' : 'Ver vista previa del mensaje'}
                  </Text>
                </TouchableOpacity>

                {/* Vista previa de burbuja WhatsApp */}
                {mostrarPreview && (
                  <View style={styles.previewContainer}>
                    <View style={styles.chatBubble}>
                      <Text style={styles.previewText}>{generarMensaje()}</Text>
                    </View>
                  </View>
                )}

                {/* Botón Enviar WhatsApp */}
                <TouchableOpacity
                  style={[
                    styles.whatsappSendBtn,
                    !vehiculoInfo?.propietarioTelefono && styles.whatsappSendBtnDisabled,
                  ]}
                  onPress={handleEnviarWhatsApp}>
                  <MaterialIcons name="send" size={18} color="#fff" />
                  <Text style={styles.whatsappSendBtnText}>Enviar Resumen por WhatsApp</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Tipo de servicio */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tipo de Servicio</Text>
              <View style={styles.tiposGrid}>
                {TIPOS_SERVICIO.map((t) => {
                  const isActive = tipo === t.key;
                  return (
                    <TouchableOpacity
                      key={t.key}
                      style={[styles.tipoChip, isActive && styles.tipoChipActive]}
                      onPress={() => setTipo(t.key)}>
                      <Text style={styles.tipoChipEmoji}>{t.icon}</Text>
                      <Text style={[styles.tipoChipText, isActive && styles.tipoChipTextActive]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Descripción del trabajo */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Diagnóstico Inicial / Síntoma</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                numberOfLines={3}
                placeholder="Detalla el diagnóstico o motivo de ingreso..."
                placeholderTextColor={WorkshopTheme.secondary}
              />
            </View>

            {/* Costo Total y Kilometraje */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Costo Total ($)</Text>
                <TextInput
                  style={styles.input}
                  value={costoTotal}
                  onChangeText={setCostoTotal}
                  keyboardType="numeric"
                  placeholder="0"
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

            {/* Mecánico asignado */}
            {mecanicos.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mecánico Asignado</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.mecanicosScroll}>
                  <TouchableOpacity
                    style={[
                      styles.mecChip,
                      mecanicoId === null && styles.mecChipActive,
                    ]}
                    onPress={() => setMecanicoId(null)}>
                    <Text
                      style={[
                        styles.mecChipText,
                        mecanicoId === null && styles.mecChipTextActive,
                      ]}>
                      Sin asignar
                    </Text>
                  </TouchableOpacity>
                  {mecanicos.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.mecChip,
                        mecanicoId === m.id && styles.mecChipActive,
                      ]}
                      onPress={() => setMecanicoId(m.id)}>
                      <Text
                        style={[
                          styles.mecChipText,
                          mecanicoId === m.id && styles.mecChipTextActive,
                        ]}>
                        {m.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Botón Eliminar Orden */}
            <View style={styles.dangerZone}>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleEliminar}
                disabled={guardando}>
                <MaterialIcons name="delete-forever" size={20} color="#dc2626" />
                <Text style={styles.deleteBtnText}>Eliminar esta orden de servicio</Text>
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
    marginTop: 2,
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
    paddingVertical: 11,
    fontSize: 14,
    color: '#0f172a',
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  estadosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  estadoChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  estadoChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: WorkshopTheme.secondary,
  },
  tiposGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  tipoChipActive: {
    borderColor: WorkshopTheme.primary,
    backgroundColor: WorkshopTheme.primary,
  },
  tipoChipEmoji: {
    fontSize: 13,
  },
  tipoChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  tipoChipTextActive: {
    color: '#fff',
  },
  mecanicosScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  mecChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  mecChipActive: {
    borderColor: WorkshopTheme.primary,
    backgroundColor: '#fef2f2',
  },
  mecChipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  mecChipTextActive: {
    color: WorkshopTheme.primary,
    fontWeight: '700',
  },
  // WhatsApp Section
  whatsappCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#86efac',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  whatsappHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  whatsappIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
  },
  whatsappSubtitle: {
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },
  whatsappFields: {
    gap: 6,
    marginBottom: 10,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  miniInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 13,
    color: '#14532d',
  },
  previewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    marginBottom: 10,
  },
  previewToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  previewContainer: {
    backgroundColor: '#e2f7cb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#b4e79f',
  },
  chatBubble: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  previewText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#1e293b',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  whatsappSendBtn: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  whatsappSendBtnDisabled: {
    opacity: 0.6,
  },
  whatsappSendBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  dangerZone: {
    marginTop: 10,
    marginBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
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

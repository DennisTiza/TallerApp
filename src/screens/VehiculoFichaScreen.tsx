import { EditarOrdenModal } from '@/components/EditarOrdenModal';
import { EditarVehiculoModal } from '@/components/EditarVehiculoModal';
import { WorkshopTheme } from '@/constants/theme';
import { Cliente, Mecanico, OrdenServicio, vehiculosRepo } from '@/database';
import { VehiculoConPropietario } from '@/types/workshop';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface VehiculoFichaScreenProps {
  vehiculo: VehiculoConPropietario;
  ordenes: OrdenServicio[];
  mecanicos: Mecanico[];
  clientes?: Cliente[];
  tallerNombre?: string;
  onBack: () => void;
  onNuevoServicioPress: () => void;
  onRefresh: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '');
  } catch {
    return dateStr;
  }
}

function formatKm(km: number | null) {
  if (!km) return '—';
  return `${km.toLocaleString('es-CO')} km`;
}

function formatPrice(amount: number) {
  return `$ ${amount.toLocaleString('es-CO')}`;
}

// ── Config de estado de orden ─────────────────────────────────────────────────
const ORDEN_ESTADO_CONFIG = {
  recibido: {
    label: 'RECIBIDO',
    dot: '#B06000',
    bg: '#FEF7E0',
    text: '#B06000',
    pulse: false,
  },
  en_proceso: {
    label: 'EN PROCESO',
    dot: '#7c3aed',
    bg: '#ede9fe',
    text: '#3730a3',
    pulse: true,
  },
  listo: {
    label: 'LISTO',
    dot: '#137333',
    bg: '#E6F4EA',
    text: '#137333',
    pulse: true,
  },
  entregado: {
    label: 'ENTREGADO',
    dot: WorkshopTheme.tertiary,
    bg: WorkshopTheme.tertiaryFixed,
    text: WorkshopTheme.onTertiaryFixed,
    pulse: false,
  },
} as const;

// ── Punto pulsante ────────────────────────────────────────────────────────────
function PulseDot({ color, pulse }: { color: string; pulse: boolean }) {
  const [opacity] = useState(() => new Animated.Value(1));
  React.useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, opacity]);

  return (
    <Animated.View
      style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: pulse ? opacity : 1 }}
    />
  );
}

// ── Chip de tipo de servicio ──────────────────────────────────────────────────
function getTipoLabel(tipo: string | null): string {
  if (!tipo) return 'SERVICIO';
  const t = tipo.toUpperCase();
  if (t.includes('MANTEN')) return 'MANTENIMIENTO';
  if (t.includes('DIAGN')) return 'DIAGNÓSTICO';
  if (t.includes('REVIS')) return 'REVISIÓN';
  if (t.includes('REPARAC')) return 'REPARACIÓN';
  return t.slice(0, 16);
}

// ── Tarjeta de orden de trabajo ───────────────────────────────────────────────
function OrdenCard({
  orden,
  mecanicoNombre,
  onPress,
  onWhatsAppPress,
}: {
  orden: OrdenServicio;
  mecanicoNombre: string | null;
  onPress?: () => void;
  onWhatsAppPress?: () => void;
}) {
  const cfg = ORDEN_ESTADO_CONFIG[orden.estado] ?? ORDEN_ESTADO_CONFIG.recibido;
  const isListo = orden.estado === 'listo' || orden.estado === 'entregado';

  const notaEstado =
    orden.estado === 'entregado' ? 'Entrega efectuada' :
    orden.estado === 'listo' ? null :
    'En espera de diagnóstico';

  return (
    <Pressable
      style={({ pressed }) => [styles.ordenCard, pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] }]}
      onPress={onPress}>
      {/* Encabezado */}
      <View style={styles.ordenHeader}>
        <View style={styles.ordenBadgesRow}>
          <View style={styles.tipoChip}>
            <Text style={styles.tipoChipText}>{getTipoLabel(orden.tipo)}</Text>
          </View>
          <View style={[styles.estadoPill, { backgroundColor: cfg.bg }]}>
            <PulseDot color={cfg.dot} pulse={cfg.pulse} />
            <Text style={[styles.estadoPillText, { color: cfg.text }]}>{cfg.label}</Text>
          </View>
        </View>
        <View style={styles.ordenHeaderRight}>
          <Text style={styles.ordenPrice}>{formatPrice(orden.costo_total)}</Text>
          {/* Botón WhatsApp */}
          <Pressable
            style={styles.waBtn}
            hitSlop={8}
            onPress={(e) => {
              e.stopPropagation();
              if (onWhatsAppPress) onWhatsAppPress();
            }}>
            <MaterialIcons name="chat" size={15} color="#137333" />
          </Pressable>
        </View>
      </View>

      {/* Fecha y km */}
      <View style={styles.ordenMeta}>
        <MaterialIcons name="calendar-today" size={14} color={WorkshopTheme.secondary} />
        <Text style={styles.ordenMetaText}>{formatDate(orden.fecha_servicio)}</Text>
        {orden.kilometraje != null && orden.kilometraje > 0 && (
          <>
            <Text style={styles.ordenMetaDot}>·</Text>
            <Text style={styles.ordenMetaText}>{formatKm(orden.kilometraje)}</Text>
          </>
        )}
      </View>

      {/* Descripción / síntoma */}
      {orden.descripcion ? (
        <View style={styles.jobBox}>
          <View style={styles.jobBoxRow}>
            <MaterialIcons
              name={isListo ? 'check-circle' : 'hearing'}
              size={17}
              color={isListo ? '#137333' : WorkshopTheme.error}
              style={{ marginTop: 1 }}
            />
            <Text style={styles.jobTitle} numberOfLines={3}>{orden.descripcion}</Text>
          </View>
        </View>
      ) : null}

      {/* Footer */}
      <View style={styles.ordenFooter}>
        <View style={styles.footerItem}>
          <MaterialIcons name="engineering" size={14} color={WorkshopTheme.secondary} />
          <Text style={styles.footerText} numberOfLines={1}>
            {mecanicoNombre || 'Sin asignar'}
          </Text>
        </View>
        {notaEstado ? (
          <View style={styles.footerItem}>
            <MaterialIcons name="pending" size={13} color={WorkshopTheme.secondary} />
            <Text style={styles.footerTextSecondary}>{notaEstado}</Text>
          </View>
        ) : (
          <View style={[styles.footerItem, styles.entregadoBadge]}>
            <MaterialIcons name="event-repeat" size={13} color={WorkshopTheme.tertiary} />
            <Text style={[styles.footerText, { color: WorkshopTheme.tertiary }]}>Entregado</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── Spec item ─────────────────────────────────────────────────────────────────
function SpecItem({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <View style={[styles.specItem, wide && styles.specItemWide]}>
      <Text style={styles.specLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export function VehiculoFichaScreen({
  vehiculo,
  ordenes,
  mecanicos,
  clientes = [],
  tallerNombre,
  onBack,
  onNuevoServicioPress,
  onRefresh,
}: VehiculoFichaScreenProps) {
  const [showEditarVehiculo, setShowEditarVehiculo] = useState(false);
  const [ordenParaEditar, setOrdenParaEditar] = useState<OrdenServicio | null>(null);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const handleToggleEstado = async () => {
    const nuevoEstado = vehiculo.estado === 'en_taller' ? 'entregado' : 'en_taller';
    try {
      setCambiandoEstado(true);
      await vehiculosRepo.update(vehiculo.id, { estado: nuevoEstado });
      onRefresh();
    } catch {
      Alert.alert('Error', 'No se pudo cambiar el estado del vehículo');
    } finally {
      setCambiandoEstado(false);
    }
  };


  const mecanicosMap = React.useMemo(
    () => new Map(mecanicos.map((m) => [m.id, m])),
    [mecanicos]
  );

  const ordenesDelVehiculo = React.useMemo(
    () => ordenes.filter((o) => o.vehiculo_id === vehiculo.id),
    [ordenes, vehiculo.id]
  );

  const vehicleLabel = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') || 'Vehículo';
  const estadoLabel = vehiculo.estado === 'en_taller' ? 'En taller' : 'Entregado';
  const colorVehiculo = vehiculo.color || '—';

  const handleAbrirWhatsApp = (mensajePersonalizado?: string) => {
    const rawPhone = vehiculo.propietarioTelefono || '';
    const digits = rawPhone.replace(/\D/g, '');
    if (!digits) {
      Alert.alert(
        'Sin teléfono',
        `El cliente (${vehiculo.propietarioNombre || 'Propietario'}) no tiene un número registrado.\n\nPuedes presionar "Editar" para agregarlo.`
      );
      return;
    }
    const phoneWithCode = digits.length === 10 ? `57${digits}` : digits;
    const tallerLabel = tallerNombre?.trim() || 'nuestro taller';
    const mensajeDefault = `Hola ${vehiculo.propietarioNombre || ''}, te contactamos desde ${tallerLabel} sobre tu vehículo ${vehiculo.marca || ''} ${vehiculo.modelo || ''} (Placa ${vehiculo.placa}).`;
    const texto = encodeURIComponent(mensajePersonalizado || mensajeDefault);
    const url = `https://wa.me/${phoneWithCode}?text=${texto}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp. Verifica que la aplicación esté instalada en el dispositivo.');
    });
  };


  return (
    <View style={styles.container}>
      {/* ── Barra superior ─────────────────────────────── */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={18} color={WorkshopTheme.secondary} />
          <Text style={styles.backLabel}>VEHÍCULOS</Text>
        </Pressable>
        <View style={styles.plateTopBadge}>
          <Text style={styles.plateTopText}>{vehiculo.placa}</Text>
        </View>
      </View>

      {/* ── Acciones rápidas ───────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actionsRow}
        style={styles.actionsScroll}>

        {/* Toggle estado taller */}
        <Pressable
          style={({ pressed }) => [
            styles.actionChip,
            vehiculo.estado === 'en_taller' && styles.actionChipActive,
            pressed && styles.actionChipPressed,
          ]}
          disabled={cambiandoEstado}
          onPress={handleToggleEstado}>
          <MaterialIcons
            name={vehiculo.estado === 'en_taller' ? 'check-circle' : 'build'}
            size={16}
            color={vehiculo.estado === 'en_taller' ? '#137333' : WorkshopTheme.secondary}
          />
          <Text
            style={[
              styles.actionChipText,
              vehiculo.estado === 'en_taller' && { color: '#137333', fontWeight: '700' },
            ]}>
            {vehiculo.estado === 'en_taller' ? 'Marcar entregado' : 'Marcar en taller'}
          </Text>
        </Pressable>

        {/* WhatsApp */}
        <Pressable
          style={({ pressed }) => [styles.actionChip, pressed && styles.actionChipPressed]}
          onPress={() => handleAbrirWhatsApp()}>
          <MaterialIcons name="chat" size={16} color="#25D366" />
          <Text style={[styles.actionChipText, { color: '#128C7E' }]}>WhatsApp</Text>
        </Pressable>

        {/* Editar */}
        <Pressable
          style={({ pressed }) => [styles.actionChip, pressed && styles.actionChipPressed]}
          onPress={() => setShowEditarVehiculo(true)}>
          <MaterialIcons name="edit" size={16} color={WorkshopTheme.secondary} />
          <Text style={styles.actionChipText}>Editar</Text>
        </Pressable>

        {/* Nuevo servicio */}
        <Pressable
          style={({ pressed }) => [styles.actionChipDark, pressed && styles.actionChipPressed]}
          onPress={onNuevoServicioPress}>
          <MaterialIcons name="add" size={16} color="#fff" />
          <Text style={styles.actionChipDarkText}>Servicio</Text>
        </Pressable>
      </ScrollView>

      {/* ── Lista scrolleable ──────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* Ficha cabecera */}
        <View style={styles.fichaHeader}>
          <View style={styles.fichaIcon}>
            <MaterialIcons name="directions-car" size={26} color={WorkshopTheme.inverseOnSurface} />
          </View>
          <View style={styles.fichaHeaderText}>
            <Text style={styles.fichaTitle} numberOfLines={1}>{vehicleLabel}</Text>
            <Text style={styles.fichaSubtitle} numberOfLines={1}>
              {vehiculo.propietarioNombre || 'Sin propietario'}
              {vehiculo.anio ? ` · ${vehiculo.anio}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowEditarVehiculo(true)}
            style={{ padding: 6, borderRadius: 16, backgroundColor: '#f1f5f9' }}
            hitSlop={8}>
            <MaterialIcons name="edit" size={18} color={WorkshopTheme.secondary} />
          </TouchableOpacity>
        </View>

        {/* Especificaciones */}
        <View style={styles.specCard}>
          <View style={styles.specGrid}>
            <SpecItem label="Kilometraje" value={formatKm(vehiculo.kilometraje)} />
            <SpecItem label="Año" value={vehiculo.anio ? String(vehiculo.anio) : '—'} />
            <SpecItem label="Color" value={colorVehiculo} />
            <SpecItem label="Chasis / VIN" value={vehiculo.vin_chasis || '—'} />
            <SpecItem label="Estado" value={estadoLabel} wide />
          </View>
        </View>

        {/* Historial de trabajos */}
        <View style={styles.historiaSection}>
          <View style={styles.historiaSectionHeader}>
            <Text style={styles.historiaSectionTitle}>Historial de trabajos</Text>
            <View style={styles.historiaSectionCount}>
              <Text style={styles.historiaSectionCountText}>
                {ordenesDelVehiculo.length} {ordenesDelVehiculo.length === 1 ? 'registro' : 'registros'}
              </Text>
            </View>
          </View>

          {ordenesDelVehiculo.length === 0 ? (
            <View style={styles.emptyOrdenes}>
              <MaterialIcons name="build" size={24} color={WorkshopTheme.secondary} />
              <Text style={styles.emptyOrdenesText}>Sin órdenes de trabajo</Text>
              <Text style={styles.emptyOrdenesSubtext}>
                Este vehículo aún no tiene servicios registrados.
              </Text>
            </View>
          ) : (
            <View style={styles.ordenesList}>
              {ordenesDelVehiculo.map((orden) => {
                const mec = orden.mecanico_id ? mecanicosMap.get(orden.mecanico_id) : null;
                return (
                  <OrdenCard
                    key={orden.id}
                    orden={orden}
                    mecanicoNombre={mec?.nombre || null}
                    onPress={() => setOrdenParaEditar(orden)}
                    onWhatsAppPress={() => {
                      const tallerLabel = tallerNombre?.trim() || 'nuestro taller';
                      handleAbrirWhatsApp(
                        `Hola ${vehiculo.propietarioNombre || ''}, te contactamos desde ${tallerLabel} sobre la orden de servicio (${orden.tipo || 'Servicio'}) de tu vehículo ${vehiculo.placa}.`
                      );
                    }}
                  />
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modales de edición y eliminación */}
      <EditarVehiculoModal
        visible={showEditarVehiculo}
        vehiculo={vehiculo}
        clientes={clientes}
        onClose={() => setShowEditarVehiculo(false)}
        onSuccess={onRefresh}
        onDeleted={onBack}
      />

      <EditarOrdenModal
        visible={ordenParaEditar !== null}
        orden={ordenParaEditar}
        mecanicos={mecanicos}
        tallerNombre={tallerNombre}
        vehiculoInfo={{
          placa: vehiculo.placa,
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          propietarioNombre: vehiculo.propietarioNombre,
          propietarioTelefono: vehiculo.propietarioTelefono,
          kilometraje: vehiculo.kilometraje,
        }}
        onClose={() => setOrdenParaEditar(null)}
        onSuccess={onRefresh}
        onDeleted={onRefresh}
      />
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  backLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: WorkshopTheme.secondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  plateTopBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: WorkshopTheme.surfaceContainer,
  },
  plateTopText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Actions row
  actionsScroll: { marginBottom: 12 },
  actionsRow: { gap: 8, paddingRight: 4, paddingVertical: 2 },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.surfaceContainerLow,
    borderWidth: 1,
    borderColor: WorkshopTheme.cardBorder,
  },
  actionChipPressed: { opacity: 0.7 },
  actionChipActive: {
    backgroundColor: '#e6f4ea',
    borderColor: '#137333',
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: WorkshopTheme.onSurface,
  },
  actionChipDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.inverseSurface,
    shadowColor: WorkshopTheme.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
    marginLeft: 'auto',
  },
  actionChipDarkText: {
    fontSize: 12,
    fontWeight: '700',
    color: WorkshopTheme.inverseOnSurface,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { gap: 14, paddingBottom: 24 },

  // Ficha header
  fichaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    padding: 16,
    borderRadius: 18,
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: WorkshopTheme.cardBorder,
  },
  fichaIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: WorkshopTheme.inverseSurface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fichaHeaderText: { flex: 1, minWidth: 0, gap: 3 },
  fichaTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: WorkshopTheme.onSurface,
    letterSpacing: -0.3,
  },
  fichaSubtitle: { fontSize: 13, color: WorkshopTheme.secondary },

  // Spec card
  specCard: {
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    borderRadius: 18,
    padding: 16,
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: WorkshopTheme.cardBorder,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  specItem: { width: '45%', flexGrow: 1, gap: 2 },
  specItemWide: { width: '100%' },
  specLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: WorkshopTheme.secondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  specValue: {
    fontSize: 15,
    fontWeight: '600',
    color: WorkshopTheme.onSurface,
    marginTop: 2,
  },

  // Historia section
  historiaSection: { gap: 10 },
  historiaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historiaSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
  },
  historiaSectionCount: {
    backgroundColor: WorkshopTheme.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  historiaSectionCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: WorkshopTheme.secondary,
  },

  // Empty ordenes
  emptyOrdenes: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: WorkshopTheme.cardBorder,
  },
  emptyOrdenesText: { fontSize: 14, fontWeight: '700', color: WorkshopTheme.onSurface },
  emptyOrdenesSubtext: { fontSize: 12, color: WorkshopTheme.secondary, textAlign: 'center' },

  // Ordenes list
  ordenesList: { gap: 12 },

  // Orden card
  ordenCard: {
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    borderRadius: 18,
    padding: 16,
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: WorkshopTheme.cardBorder,
    gap: 10,
  },
  ordenHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  ordenBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, flex: 1 },
  tipoChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: WorkshopTheme.surfaceContainer,
  },
  tipoChipText: {
    fontSize: 9,
    fontWeight: '800',
    color: WorkshopTheme.secondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  estadoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  estadoPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  ordenHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  ordenPrice: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 15,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
  },
  waBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F4EA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Fecha/km meta
  ordenMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ordenMetaText: { fontSize: 12, color: WorkshopTheme.secondary, fontWeight: '500' },
  ordenMetaDot: { fontSize: 12, color: WorkshopTheme.outlineVariant, fontWeight: '700' },

  // Job box
  jobBox: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.surfaceContainerLow,
    gap: 5,
  },
  jobBoxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  jobTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: WorkshopTheme.onSurface,
    lineHeight: 18,
  },

  // Footer
  ordenFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, color: WorkshopTheme.secondary, fontWeight: '500', maxWidth: 160 },
  footerTextSecondary: { fontSize: 11, color: WorkshopTheme.secondary },
  entregadoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 104, 96, 0.08)',
  },
});

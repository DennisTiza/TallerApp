import { EditarOrdenModal } from '@/components/EditarOrdenModal';
import { WorkshopTheme } from '@/constants/theme';
import { Mecanico, OrdenServicio } from '@/database';
import { ServicioItemUI, VehiculoConPropietario } from '@/types/workshop';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface ServiciosScreenProps {
  serviciosMostrados: ServicioItemUI[];
  ordenes?: OrdenServicio[];
  mecanicos?: Mecanico[];
  vehiculos?: VehiculoConPropietario[];
  tallerNombre?: string;
  onRefresh?: () => void;
}

type FiltroEstado = 'todos' | 'recibido' | 'listo';
type FiltroTipo = 'todos' | 'mantenimiento' | 'diagnostico' | 'revision';

// ── Configuración de estados ──────────────────────────────────────────────────
const ESTADO_CONFIG: Record<
  ServicioItemUI['estado'],
  { label: string; dot: string; bg: string; text: string; pulse: boolean }
> = {
  recibido: {
    label: 'RECIBIDO',
    dot: WorkshopTheme.outline,
    bg: WorkshopTheme.secondaryFixed,
    text: WorkshopTheme.onSecondaryFixed,
    pulse: false,
  },
  en_proceso: {
    label: 'EN PROCESO',
    dot: '#f59e0b',
    bg: '#fef3c7',
    text: '#78350f',
    pulse: true,
  },
  en_diagnostico: {
    label: 'DIAGNÓSTICO',
    dot: '#6366f1',
    bg: '#ede9fe',
    text: '#3730a3',
    pulse: true,
  },
  listo: {
    label: 'LISTO',
    dot: WorkshopTheme.tertiary,
    bg: WorkshopTheme.tertiaryFixed,
    text: WorkshopTheme.onTertiaryFixed,
    pulse: true,
  },
};

// ── Configuración de tipos de servicio ───────────────────────────────────────
function getTipoConfig(tipo: string | null): {
  label: string;
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  bg: string;
} {
  const t = (tipo || '').toLowerCase();
  if (t.includes('manten') || t.includes('aceite') || t.includes('filtro')) {
    return { label: 'Mantenimiento', icon: 'oil-barrel', color: '#0f766e', bg: '#ccfbf1' };
  }
  if (t.includes('diagn') || t.includes('escaneo') || t.includes('scan')) {
    return { label: 'Diagnóstico', icon: 'manage-search', color: '#7c3aed', bg: '#ede9fe' };
  }
  if (t.includes('revis') || t.includes('inspecc')) {
    return { label: 'Revisión', icon: 'fact-check', color: '#b45309', bg: '#fef3c7' };
  }
  return { label: tipo || 'Servicio', icon: 'build', color: WorkshopTheme.secondary, bg: WorkshopTheme.surfaceContainerHigh };
}

// ── Icono del contenido del trabajo ──────────────────────────────────────────
function getJobIcon(estado: ServicioItemUI['estado']): React.ComponentProps<typeof MaterialIcons>['name'] {
  if (estado === 'listo') return 'check-circle';
  if (estado === 'en_proceso') return 'build-circle';
  if (estado === 'en_diagnostico') return 'hearing';
  return 'pending';
}

function getJobIconColor(estado: ServicioItemUI['estado']): string {
  if (estado === 'listo') return WorkshopTheme.tertiary;
  if (estado === 'en_proceso') return '#f59e0b';
  if (estado === 'en_diagnostico') return WorkshopTheme.primaryContainer;
  return WorkshopTheme.outline;
}

function formatPrice(amount: number) {
  if (amount === 0) return '$ 0';
  return `$ ${amount.toLocaleString('es-CO')}`;
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).replace(/\./g, '');
  } catch {
    return dateStr;
  }
}

// ── Componente de punto pulsante animado ─────────────────────────────────────
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


// ── Tarjeta de servicio ───────────────────────────────────────────────────────
function ServiceCard({ item, onPress }: { item: ServicioItemUI; onPress?: () => void }) {
  const estadoCfg = ESTADO_CONFIG[item.estado] ?? ESTADO_CONFIG.recibido;
  const tipoCfg = getTipoConfig(item.tipo || item.descripcion);
  const isListo = item.estado === 'listo';
  const stripeColor = isListo ? WorkshopTheme.tertiary : WorkshopTheme.primary;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}>
      {/* Franja lateral */}
      <View style={[styles.cardStripe, { backgroundColor: stripeColor }]} />

      {/* Contenido */}
      <View style={styles.cardContent}>
        {/* ── Fila superior: placa + tipo + estado + monto ── */}
        <View style={styles.cardHeader}>
          <View style={styles.cardBadgesRow}>
            {/* Placa */}
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{item.placa}</Text>
            </View>
            {/* Tipo */}
            <View style={[styles.tipoBadge, { backgroundColor: tipoCfg.bg }]}>
              <Text style={[styles.tipoText, { color: tipoCfg.color }]}>{tipoCfg.label.toUpperCase()}</Text>
            </View>
            {/* Estado */}
            <View style={[styles.statusPill, { backgroundColor: estadoCfg.bg }]}>
              <PulseDot color={estadoCfg.dot} pulse={estadoCfg.pulse} />
              <Text style={[styles.statusText, { color: estadoCfg.text }]}>{estadoCfg.label}</Text>
            </View>
          </View>
          {/* Monto */}
          <Text style={styles.priceText}>{formatPrice(item.monto)}</Text>
        </View>

        {/* ── Vehículo & fecha ── */}
        <View style={styles.vehicleRow}>
          <Text style={styles.vehicleTitle} numberOfLines={1}>
            {formatDate(item.fecha)} · {item.placa}
          </Text>
        </View>
        <View style={styles.clientRow}>
          <Text style={styles.clientName} numberOfLines={1}>{item.clienteNombre}</Text>
          {item.kilometraje != null && item.kilometraje > 0 && (
            <>
              <View style={styles.dotSep} />
              <Text style={styles.kmText}>{item.kilometraje.toLocaleString('es-CO')} km</Text>
            </>
          )}
        </View>

        {/* ── Cuerpo del trabajo ── */}
        {item.descripcion ? (
          <View style={styles.jobBox}>
            <View style={styles.jobBoxHeader}>
              <MaterialIcons
                name={getJobIcon(item.estado)}
                size={16}
                color={getJobIconColor(item.estado)}
                style={styles.jobIcon}
              />
              <Text style={styles.jobTitle} numberOfLines={2}>{item.descripcion}</Text>
            </View>
            {item.repuestosDesc ? (
              <View style={styles.jobMeta}>
                <MaterialIcons name="inventory-2" size={13} color={WorkshopTheme.secondary} />
                <Text style={styles.jobMetaText} numberOfLines={1}>Repuestos: {item.repuestosDesc}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Footer: mecánico + nota de estado ── */}
        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <MaterialIcons name="engineering" size={14} color={WorkshopTheme.secondary} />
            <Text style={styles.footerText} numberOfLines={1}>
              {item.mecanicoNombre || 'Sin asignar'}
            </Text>
          </View>
          {item.notaEstado ? (
            <View style={styles.footerItem}>
              <MaterialIcons name="schedule" size={13} color={WorkshopTheme.secondary} />
              <Text style={styles.footerText}>{item.notaEstado}</Text>
            </View>
          ) : item.proximaVisita ? (
            <View style={styles.footerItem}>
              <MaterialIcons name="event" size={13} color={WorkshopTheme.secondary} />
              <Text style={styles.footerText}>Próx: {item.proximaVisita}</Text>
            </View>
          ) : (
            <View style={styles.footerItem}>
              <MaterialIcons name="verified" size={13} color={WorkshopTheme.tertiary} />
              <Text style={[styles.footerText, { color: WorkshopTheme.tertiary }]}>Entrega efectuada</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export function ServiciosScreen({
  serviciosMostrados,
  ordenes = [],
  mecanicos = [],
  vehiculos = [],
  tallerNombre,
  onRefresh = () => { },
}: ServiciosScreenProps) {
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [ordenParaEditar, setOrdenParaEditar] = useState<OrdenServicio | null>(null);

  const vehiculoParaOrden = useMemo(() => {
    if (!ordenParaEditar) return null;
    const v = vehiculos.find((vh) => vh.id === ordenParaEditar.vehiculo_id);
    if (v) {
      return {
        placa: v.placa,
        marca: v.marca,
        modelo: v.modelo,
        propietarioNombre: v.propietarioNombre,
        propietarioTelefono: v.propietarioTelefono,
        kilometraje: v.kilometraje,
      };
    }
    return null;
  }, [ordenParaEditar, vehiculos]);

  const handlePressCard = (item: ServicioItemUI) => {
    const matched = ordenes.find((o) => o.id === item.id) || null;
    if (matched) {
      setOrdenParaEditar(matched);
    }
  };

  const countAll = serviciosMostrados.length;
  const countListos = serviciosMostrados.filter((i) => i.estado === 'listo').length;
  const countActivos = serviciosMostrados.filter((i) => i.estado !== 'listo').length;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return serviciosMostrados.filter((item) => {
      const matchSearch =
        !q ||
        item.placa.toLowerCase().includes(q) ||
        item.clienteNombre.toLowerCase().includes(q) ||
        (item.descripcion?.toLowerCase().includes(q) ?? false) ||
        (item.tipo?.toLowerCase().includes(q) ?? false);

      const matchEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'listo' && item.estado === 'listo') ||
        (filtroEstado === 'recibido' && item.estado !== 'listo');

      const matchTipo =
        filtroTipo === 'todos' ||
        (() => {
          const tipoCfg = getTipoConfig(item.tipo || item.descripcion);
          const lbl = tipoCfg.label.toLowerCase();
          if (filtroTipo === 'mantenimiento') return lbl.includes('manten');
          if (filtroTipo === 'diagnostico') return lbl.includes('diagn');
          if (filtroTipo === 'revision') return lbl.includes('revis');
          return true;
        })();

      return matchSearch && matchEstado && matchTipo;
    });
  }, [serviciosMostrados, search, filtroEstado, filtroTipo]);

  return (
    <View style={styles.container}>
      {/* ── Cabecera ──────────────────────────────────── */}
      <View style={styles.heroSection}>
        <View style={styles.heroTagRow}>
          <Text style={styles.heroTag}>HISTORIAL</Text>
          <View style={styles.heroTagDot} />
          <Text style={styles.heroTagCount}>{countAll} órdenes registradas</Text>
        </View>
        <Text style={styles.heroTitle}>Servicios</Text>
        <Text style={styles.heroSubtitle}>
          Todos los mantenimientos y reparaciones que han pasado por el taller.
        </Text>
      </View>

      {/* ── Barra de búsqueda ─────────────────────────── */}
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color={WorkshopTheme.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por placa, cliente o trabajo..."
          placeholderTextColor={WorkshopTheme.secondary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS !== 'ios' && (
          <Pressable onPress={() => setSearch('')} style={styles.clearBtn}>
            <MaterialIcons name="close" size={16} color={WorkshopTheme.secondary} />
          </Pressable>
        )}
      </View>

      {/* ── Chips de filtro horizontales ──────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
        directionalLockEnabled
        nestedScrollEnabled
        decelerationRate="fast">

        {/* Chip Todos */}
        <Pressable
          style={[styles.chip, filtroEstado === 'todos' && filtroTipo === 'todos' && styles.chipActive]}
          onPress={() => { setFiltroEstado('todos'); setFiltroTipo('todos'); }}>
          <MaterialIcons
            name="tune"
            size={14}
            color={filtroEstado === 'todos' && filtroTipo === 'todos' ? '#fff' : WorkshopTheme.secondary}
          />
          <Text style={[styles.chipText, filtroEstado === 'todos' && filtroTipo === 'todos' && styles.chipTextActive]}>
            Todos los tipos
          </Text>
        </Pressable>

        {/* Chip Listos */}
        <Pressable
          style={[styles.chip, filtroEstado === 'listo' && styles.chipEstadoActive]}
          onPress={() => setFiltroEstado(filtroEstado === 'listo' ? 'todos' : 'listo')}>
          <View style={[styles.chipDot, { backgroundColor: WorkshopTheme.tertiary }]} />
          <Text style={[styles.chipText, filtroEstado === 'listo' && styles.chipTextActive]}>
            Listos ({countListos})
          </Text>
        </Pressable>

        {/* Chip Activos/Recibidos */}
        <Pressable
          style={[styles.chip, filtroEstado === 'recibido' && styles.chipEstadoActive]}
          onPress={() => setFiltroEstado(filtroEstado === 'recibido' ? 'todos' : 'recibido')}>
          <View style={[styles.chipDot, { backgroundColor: WorkshopTheme.outline }]} />
          <Text style={[styles.chipText, filtroEstado === 'recibido' && styles.chipTextActive]}>
            Recibidos ({countActivos})
          </Text>
        </Pressable>

        {/* Chip Mantenimiento */}
        <Pressable
          style={[styles.chip, filtroTipo === 'mantenimiento' && styles.chipActive]}
          onPress={() => setFiltroTipo(filtroTipo === 'mantenimiento' ? 'todos' : 'mantenimiento')}>
          <MaterialIcons
            name="oil-barrel"
            size={14}
            color={filtroTipo === 'mantenimiento' ? '#fff' : WorkshopTheme.secondary}
          />
          <Text style={[styles.chipText, filtroTipo === 'mantenimiento' && styles.chipTextActive]}>
            Mantenimiento
          </Text>
        </Pressable>

        {/* Chip Diagnóstico */}
        <Pressable
          style={[styles.chip, filtroTipo === 'diagnostico' && styles.chipActive]}
          onPress={() => setFiltroTipo(filtroTipo === 'diagnostico' ? 'todos' : 'diagnostico')}>
          <MaterialIcons
            name="manage-search"
            size={14}
            color={filtroTipo === 'diagnostico' ? '#fff' : WorkshopTheme.secondary}
          />
          <Text style={[styles.chipText, filtroTipo === 'diagnostico' && styles.chipTextActive]}>
            Diagnóstico
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── Lista / estado vacío ──────────────────────── */}
      {serviciosMostrados.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <MaterialIcons name="build" size={28} color={WorkshopTheme.secondary} />
          </View>
          <Text style={styles.emptyCardTitle}>Sin órdenes de servicio</Text>
          <Text style={styles.emptyCardSubtitle}>
            Al recibir un vehículo se creará automáticamente su primera orden de servicio.
          </Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <MaterialIcons name="search" size={28} color={WorkshopTheme.secondary} />
          </View>
          <Text style={styles.emptyCardTitle}>Sin resultados</Text>
          <Text style={styles.emptyCardSubtitle}>
            Ninguna orden coincide con tu búsqueda o filtro activo.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {filteredItems.map((item) => (
            <ServiceCard
              key={item.id}
              item={item}
              onPress={() => handlePressCard(item)}
            />
          ))}
        </View>
      )}

      {/* Modal para Editar o Eliminar Orden de Servicio */}
      <EditarOrdenModal
        visible={ordenParaEditar !== null}
        orden={ordenParaEditar}
        mecanicos={mecanicos}
        vehiculoInfo={vehiculoParaOrden}
        tallerNombre={tallerNombre}
        onClose={() => setOrdenParaEditar(null)}
        onSuccess={onRefresh}
        onDeleted={onRefresh}
      />
    </View>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hero
  heroSection: { marginBottom: 16, gap: 4 },
  heroTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroTag: {
    fontSize: 11,
    fontWeight: '700',
    color: WorkshopTheme.primary,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTagDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: WorkshopTheme.secondary,
  },
  heroTagCount: {
    fontSize: 11,
    fontWeight: '500',
    color: WorkshopTheme.secondary,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: WorkshopTheme.onSurface,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  heroSubtitle: {
    fontSize: 13,
    color: WorkshopTheme.secondary,
    lineHeight: 19,
  },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: WorkshopTheme.cardBorder,
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: WorkshopTheme.onSurface,
    padding: 0,
  },
  clearBtn: { padding: 2 },

  // Filter chips
  filterScroll: { marginBottom: 14 },
  filterRow: { gap: 8, paddingRight: 4, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: WorkshopTheme.cardBorder,
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  chipActive: {
    backgroundColor: WorkshopTheme.secondary,
    borderColor: WorkshopTheme.secondary,
  },
  chipEstadoActive: {
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
    borderColor: WorkshopTheme.secondary,
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 12, fontWeight: '600', color: WorkshopTheme.secondary },
  chipTextActive: { color: '#fff' },

  // List
  list: { gap: 12 },

  // Card
  card: {
    flexDirection: 'row',
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: WorkshopTheme.cardBorder,
  },
  cardPressed: { opacity: 0.95, transform: [{ scale: 0.99 }] },
  cardStripe: { width: 4, alignSelf: 'stretch' },
  cardContent: { flex: 1, padding: 14, gap: 8 },

  // Card header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, flex: 1 },
  plateBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
  },
  plateText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
    letterSpacing: 1.2,
  },
  tipoBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tipoText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  priceText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 16,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
    letterSpacing: -0.2,
    flexShrink: 0,
  },

  // Vehicle row
  vehicleRow: { marginTop: 2 },
  vehicleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
    letterSpacing: -0.2,
  },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clientName: { fontSize: 13, fontWeight: '600', color: WorkshopTheme.onSurface },
  dotSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: WorkshopTheme.secondary },
  kmText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: WorkshopTheme.secondary,
  },

  // Job box
  jobBox: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.surfaceContainerLow,
    gap: 6,
  },
  jobBoxHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  jobIcon: { marginTop: 1, flexShrink: 0 },
  jobTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: WorkshopTheme.onSurface,
    lineHeight: 18,
  },
  jobMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 23,
  },
  jobMetaText: { fontSize: 11, color: WorkshopTheme.secondary, flex: 1 },

  // Card footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: {
    fontSize: 11,
    color: WorkshopTheme.secondary,
    fontWeight: '500',
    maxWidth: 140,
  },

  // Empty state
  emptyCard: {
    padding: 28,
    borderRadius: 20,
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
    gap: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: WorkshopTheme.cardBorder,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: WorkshopTheme.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardTitle: { fontSize: 15, fontWeight: '700', color: WorkshopTheme.onSurface, textAlign: 'center' },
  emptyCardSubtitle: {
    fontSize: 13,
    color: WorkshopTheme.secondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },

  // List footer
  listFooter: {
    marginTop: 8,
    marginBottom: 4,
    alignItems: 'center',
    gap: 4,
  },
  listFooterIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  listFooterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: WorkshopTheme.secondary,
    textAlign: 'center',
  },
  listFooterSub: {
    fontSize: 11,
    color: WorkshopTheme.secondary,
    textAlign: 'center',
  },
});

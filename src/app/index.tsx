import { BottomNavBar } from '@/components/BottomNavBar';
import { ConfiguracionModal } from '@/components/ConfiguracionModal';
import { NuevoClienteModal } from '@/components/NuevoClienteModal';
import { OnboardingModal } from '@/components/OnboardingModal';
import { RecibirVehiculoModal } from '@/components/RecibirVehiculoModal';
import { WorkshopTheme } from '@/constants/theme';
import {
  Cliente,
  clientesRepo,
  Mecanico,
  mecanicosRepo,
  ordenesRepo,
  OrdenServicio,
  Taller,
  tallerRepo,
  vehiculosRepo,
} from '@/database';
import { ClientesScreen } from '@/screens/ClientesScreen';
import { ServiciosScreen } from '@/screens/ServiciosScreen';
import { TableroScreen } from '@/screens/TableroScreen';
import { VehiculoFichaScreen } from '@/screens/VehiculoFichaScreen';
import { VehiculosScreen } from '@/screens/VehiculosScreen';
import {
  ServicioItemUI,
  TabType,
  VehiculoConPropietario,
} from '@/types/workshop';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('tablero');

  // Datos principales de la Base de Datos
  const [taller, setTaller] = useState<Taller | null>(null);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoConPropietario[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenServicio[]>([]);

  // Filtros compartidos de Vehículos
  const [searchQueryVehiculo, setSearchQueryVehiculo] = useState('');
  const [filtroVehiculo, setFiltroVehiculo] = useState<'todos' | 'en_taller'>('todos');
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<VehiculoConPropietario | null>(null);

  // Modales
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showConfiguracion, setShowConfiguracion] = useState(false);
  const [showRecibirModal, setShowRecibirModal] = useState(false);
  const [showNuevoClienteModal, setShowNuevoClienteModal] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      const [tallerData, mecanicosData, rawVehiculos, rawClientes, rawOrdenes] = await Promise.all([
        tallerRepo.get(),
        mecanicosRepo.getActivos(),
        vehiculosRepo.getAll(),
        clientesRepo.getAll(),
        ordenesRepo.getAll(),
      ]);

      setTaller(tallerData);
      setMecanicos(mecanicosData);
      setClientes(rawClientes);
      setOrdenes(rawOrdenes);

      if (!tallerData || mecanicosData.length === 0) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
        const clientesMap = new Map<string, Cliente>();
        rawClientes.forEach((c) => clientesMap.set(c.id, c));

        const vehiculosCompletos: VehiculoConPropietario[] = rawVehiculos.map((v) => {
          const cli = v.cliente_id ? clientesMap.get(v.cliente_id) : undefined;
          return {
            ...v,
            propietarioNombre: cli?.nombre || 'Sin asignar',
            propietarioTelefono: cli?.telefono || null,
          };
        });

        setVehiculos(vehiculosCompletos);
        setVehiculoSeleccionado((prev) => {
          if (!prev) return null;
          return vehiculosCompletos.find((v) => v.id === prev.id) || null;
        });
      }
    } catch (error) {
      console.error('Error al cargar datos del taller:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
  }, [cargarDatos]);

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  // Métricas calculadas
  const vehiculosEnTaller = useMemo(() => {
    return vehiculos.filter((v) => v.estado === 'en_taller');
  }, [vehiculos]);

  const ordenesAbiertasCount = useMemo(() => {
    return ordenes.filter((o) => o.estado !== 'entregado').length;
  }, [ordenes]);

  // Lista de servicios desde la base de datos (vacía si no hay registros)
  const serviciosMostrados = useMemo<ServicioItemUI[]>(() => {
    if (ordenes.length === 0) return [];

    const vehiculosMap = new Map(vehiculos.map((v) => [v.id, v]));
    const mecanicosMap = new Map(mecanicos.map((m) => [m.id, m]));

    return ordenes.slice(0, 10).map((o) => {
      const veh = vehiculosMap.get(o.vehiculo_id);
      const mec = o.mecanico_id ? mecanicosMap.get(o.mecanico_id) : null;
      const estadoNorm: ServicioItemUI['estado'] =
        o.estado === 'listo' ? 'listo' :
        o.estado === 'en_proceso' ? 'en_proceso' :
        o.estado === 'entregado' ? 'listo' :
        'recibido';

      return {
        id: o.id,
        placa: veh?.placa || 'AUT-001',
        clienteNombre: veh?.propietarioNombre || 'Cliente',
        fecha: o.fecha_servicio || new Date().toISOString().split('T')[0],
        estado: estadoNorm,
        monto: o.costo_total || 0,
        tipo: o.tipo || null,
        descripcion: o.descripcion || null,
        repuestosDesc: null, // Se cargan por separado si se necesita
        mecanicoNombre: mec?.nombre || null,
        kilometraje: o.kilometraje ?? veh?.kilometraje ?? null,
        proximaVisita: null, // Campo opcional futuro
        notaEstado:
          o.estado === 'entregado' ? 'Entrega efectuada' :
          o.estado === 'listo' ? null :
          'Pendiente de cotización',
      };
    });
  }, [ordenes, vehiculos, mecanicos]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={WorkshopTheme.primary} />
        <Text style={styles.loadingText}>Iniciando boxStudio...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      {/* ───────────────── HEADER SUPERIOR FIJO ───────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconSquare}>
            <MaterialIcons name="precision-manufacturing" size={20} color={WorkshopTheme.onPrimary} />
          </View>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {mecanicos[0]?.nombre || taller?.nombre || 'Ing. Erick TR'}
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Control de vehículos
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerGearBtn}
          onPress={() => setShowConfiguracion(true)}
          hitSlop={8}
          activeOpacity={0.7}>
          <Ionicons name="settings-sharp" size={20} color={WorkshopTheme.secondary} />
        </TouchableOpacity>
      </View>

      {/* ───────────────── VISTA DE LA PESTAÑA ACTIVA ───────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[WorkshopTheme.primary]}
            tintColor={WorkshopTheme.primary}
          />
        }>
        {/* 1. Tablero */}
        {activeTab === 'tablero' && (
          <TableroScreen
            vehiculosEnTaller={vehiculosEnTaller}
            ordenesAbiertasCount={ordenesAbiertasCount}
            serviciosMostrados={serviciosMostrados}
            onVerTodosVehiculos={() => {
              setFiltroVehiculo('en_taller');
              setActiveTab('vehiculos');
            }}
            onVerHistorial={() => setActiveTab('servicios')}
            onRecibirPress={() => setShowRecibirModal(true)}
          />
        )}

        {/* 2. Vehículos */}
        {activeTab === 'vehiculos' && (
          vehiculoSeleccionado ? (
            <VehiculoFichaScreen
              vehiculo={vehiculoSeleccionado}
              ordenes={ordenes}
              mecanicos={mecanicos}
              clientes={clientes}
              tallerNombre={taller?.nombre}
              onBack={() => setVehiculoSeleccionado(null)}
              onNuevoServicioPress={() => setShowRecibirModal(true)}
              onRefresh={cargarDatos}
            />
          ) : (
            <VehiculosScreen
              vehiculos={vehiculos}
              vehiculosEnTaller={vehiculosEnTaller}
              searchQuery={searchQueryVehiculo}
              setSearchQuery={setSearchQueryVehiculo}
              filtroVehiculo={filtroVehiculo}
              setFiltroVehiculo={setFiltroVehiculo}
              onVerFicha={(v) => setVehiculoSeleccionado(v)}
            />
          )
        )}

        {/* 3. Servicios */}
        {activeTab === 'servicios' && (
          <ServiciosScreen
            serviciosMostrados={serviciosMostrados}
            ordenes={ordenes}
            mecanicos={mecanicos}
            vehiculos={vehiculos}
            tallerNombre={taller?.nombre}
            onRefresh={cargarDatos}
          />
        )}

        {/* 4. Clientes */}
        {activeTab === 'clientes' && (
          <ClientesScreen
            clientes={clientes}
            vehiculos={vehiculos}
            tallerNombre={taller?.nombre}
            onNuevoClientePress={() => setShowNuevoClienteModal(true)}
            onVerFichaVehiculo={(placa) => {
              setSearchQueryVehiculo(placa);
              setActiveTab('vehiculos');
            }}
            onRefresh={cargarDatos}
          />
        )}
      </ScrollView>

      {/* ───────────────── BARRA DE NAVEGACIÓN INFERIOR ───────────────── */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setVehiculoSeleccionado(null);
        }}
        onRecibirPress={() => setShowRecibirModal(true)}
      />

      {/* ───────────────── MODALES MODULARES ───────────────── */}
      <OnboardingModal
        visible={showOnboarding}
        onComplete={() => {
          setShowOnboarding(false);
          cargarDatos();
        }}
      />

      <RecibirVehiculoModal
        visible={showRecibirModal}
        mecanicos={mecanicos}
        clientes={clientes}
        onClose={() => setShowRecibirModal(false)}
        onSuccess={() => {
          setShowRecibirModal(false);
          cargarDatos();
        }}
      />

      <NuevoClienteModal
        visible={showNuevoClienteModal}
        onClose={() => setShowNuevoClienteModal(false)}
        onSuccess={() => {
          setShowNuevoClienteModal(false);
          cargarDatos();
        }}
      />

      <ConfiguracionModal
        visible={showConfiguracion}
        onClose={() => setShowConfiguracion(false)}
        onSaved={cargarDatos}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: WorkshopTheme.surface,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: WorkshopTheme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: WorkshopTheme.secondary,
    fontWeight: '600',
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: WorkshopTheme.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: WorkshopTheme.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  headerGearBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: WorkshopTheme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: WorkshopTheme.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: WorkshopTheme.onSurface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
});

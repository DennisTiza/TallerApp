import { WorkshopTheme } from '@/constants/theme';
import { ServicioItemUI, VehiculoConPropietario } from '@/types/workshop';
import { MaterialIcons } from '@expo/vector-icons';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TableroScreenProps {
  vehiculosEnTaller: VehiculoConPropietario[];
  ordenesAbiertasCount: number;
  serviciosMostrados: ServicioItemUI[];
  onVerTodosVehiculos: () => void;
  onVerHistorial: () => void;
  onRecibirPress: () => void;
}

export function TableroScreen({
  vehiculosEnTaller,
  ordenesAbiertasCount,
  serviciosMostrados,
  onVerTodosVehiculos,
  onVerHistorial,
  onRecibirPress,
}: TableroScreenProps) {
  return (
    <View style={styles.container}>
      {/* Page Header & Hero Intro */}
      <View style={styles.heroSection}>
        <Text style={styles.heroSectionTag}>TABLERO</Text>
        <Text style={styles.heroTitle}>Tu taller, hoy</Text>
        <Text style={styles.heroSubtitle}>
          Los vehículos que tienes en el taller y los últimos trabajos registrados.
        </Text>
      </View>

      {/* KPI Metrics Grid (2 Columnas) */}
      <View style={styles.kpiGrid}>
        {/* Card 1: En Taller */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiCardHeader}>
            <Text style={styles.kpiCardLabel}>EN TALLER</Text>
            <View style={styles.kpiIconBoxGray}>
              <MaterialIcons name="directions-car" size={18} color={WorkshopTheme.secondary} />
            </View>
          </View>
          <Text style={styles.kpiCardValue}>{vehiculosEnTaller.length}</Text>
        </View>

        {/* Card 2: Órdenes Abiertas */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiCardHeader}>
            <Text style={styles.kpiCardLabel}>ÓRDENES ABIERTAS</Text>
            <View style={styles.kpiIconBoxTeal}>
              <MaterialIcons name="build" size={18} color={WorkshopTheme.tertiary} />
            </View>
          </View>
          <Text style={styles.kpiCardValue}>{ordenesAbiertasCount}</Text>
        </View>
      </View>

      {/* Sección: En el taller ahora */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>En el taller ahora</Text>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{vehiculosEnTaller.length}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onVerTodosVehiculos} style={styles.sectionLink}>
            <Text style={styles.sectionLinkText}>Ver todos</Text>
            <MaterialIcons name="chevron-right" size={16} color={WorkshopTheme.primary} />
          </TouchableOpacity>
        </View>

        {/* Estado vacío amigable cuando no hay vehículos en el taller */}
        {vehiculosEnTaller.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="home-work" size={28} color={WorkshopTheme.secondary} />
            </View>
            <Text style={styles.emptyCardTitle}>No hay vehículos en el taller.</Text>
            <Text style={styles.emptyCardSubtitle}>
              Las bahías están disponibles. Registra el ingreso de un nuevo vehículo para iniciar órdenes.
            </Text>
          </View>
        ) : (
          <View style={styles.vehiclesList}>
            {vehiculosEnTaller.map((v) => (
              <View key={v.id} style={styles.serviceItemCard}>
                <View style={styles.serviceLeft}>
                  <View style={styles.plateAndClientRow}>
                    <View style={styles.plateBadge}>
                      <Text style={styles.plateText}>{v.placa}</Text>
                    </View>
                    <Text style={styles.clientName} numberOfLines={1}>
                      {v.marca} {v.modelo}
                    </Text>
                  </View>
                  <Text style={styles.serviceDate}>{v.propietarioNombre || 'Cliente'}</Text>
                </View>
                <View style={styles.serviceRight}>
                  <View style={styles.badgeRecibido}>
                    <View style={styles.badgeDotRecibido} />
                    <Text style={styles.badgeRecibidoText}>EN TALLER</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Sección: Últimos servicios */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <Text style={styles.sectionTitle}>Últimos servicios</Text>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{serviciosMostrados.length}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onVerHistorial} style={styles.sectionLink}>
            <Text style={styles.sectionLinkText}>Ver historial</Text>
            <MaterialIcons name="chevron-right" size={16} color={WorkshopTheme.primary} />
          </TouchableOpacity>
        </View>

        {serviciosMostrados.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <MaterialIcons name="build" size={26} color={WorkshopTheme.secondary} />
            </View>
            <Text style={styles.emptyCardTitle}>No hay servicios registrados aún.</Text>
            <Text style={styles.emptyCardSubtitle}>
              Cuando recibas un vehículo en el taller, sus órdenes de trabajo aparecerán aquí.
            </Text>
          </View>
        ) : (
          <View style={styles.servicesStack}>
            {serviciosMostrados.map((item) => (
              <View key={item.id} style={styles.serviceItemCard}>
                <View style={styles.serviceLeft}>
                  <View style={styles.plateAndClientRow}>
                    <View style={styles.plateBadge}>
                      <Text style={styles.plateText}>{item.placa}</Text>
                    </View>
                    <Text style={styles.clientName} numberOfLines={1}>
                      {item.clienteNombre}
                    </Text>
                  </View>
                  <Text style={styles.serviceDate}>{item.fecha}</Text>
                </View>

                <View style={styles.serviceRight}>
                  {item.estado === 'listo' ? (
                    <View style={styles.badgeListo}>
                      <View style={styles.badgeDotListo} />
                      <Text style={styles.badgeListoText}>LISTO</Text>
                    </View>
                  ) : (
                    <View style={styles.badgeRecibido}>
                      <View style={styles.badgeDotRecibido} />
                      <Text style={styles.badgeRecibidoText}>RECIBIDO</Text>
                    </View>
                  )}
                  <Text style={styles.serviceAmount}>$ {item.monto.toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroSection: {
    marginBottom: 16,
    gap: 4,
  },
  heroSectionTag: {
    fontSize: 11,
    fontWeight: '700',
    color: WorkshopTheme.secondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: WorkshopTheme.onSurface,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: WorkshopTheme.secondary,
    lineHeight: 20,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    justifyContent: 'space-between',
  },
  kpiCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  kpiCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: WorkshopTheme.secondary,
    textTransform: 'uppercase',
  },
  kpiIconBoxGray: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: WorkshopTheme.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconBoxTeal: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: WorkshopTheme.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiCardValue: {
    fontSize: 30,
    fontWeight: '800',
    color: WorkshopTheme.onSurface,
    lineHeight: 34,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
    letterSpacing: -0.2,
  },
  badgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.surfaceContainer,
  },
  badgeCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: WorkshopTheme.secondary,
  },
  sectionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: WorkshopTheme.primary,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
    gap: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: WorkshopTheme.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
    textAlign: 'center',
  },
  emptyCardSubtitle: {
    fontSize: 13,
    color: WorkshopTheme.secondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  emptyCardButton: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: WorkshopTheme.primaryFixed,
  },
  emptyCardButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: WorkshopTheme.primary,
  },
  servicesStack: {
    gap: 10,
  },
  vehiclesList: {
    gap: 10,
  },
  serviceItemCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  serviceLeft: {
    flex: 1,
    gap: 4,
  },
  plateAndClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: WorkshopTheme.surfaceContainerHighest,
  },
  plateText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
    letterSpacing: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: WorkshopTheme.onSurface,
    flex: 1,
  },
  serviceDate: {
    fontSize: 12,
    color: WorkshopTheme.secondary,
  },
  serviceRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badgeRecibido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.secondaryFixed,
  },
  badgeDotRecibido: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WorkshopTheme.outline,
  },
  badgeRecibidoText: {
    fontSize: 10,
    fontWeight: '800',
    color: WorkshopTheme.onSecondaryFixed,
    letterSpacing: 0.4,
  },
  badgeListo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.tertiaryFixed,
  },
  badgeDotListo: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: WorkshopTheme.tertiary,
  },
  badgeListoText: {
    fontSize: 10,
    fontWeight: '800',
    color: WorkshopTheme.onTertiaryFixed,
    letterSpacing: 0.4,
  },
  serviceAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
  },
});

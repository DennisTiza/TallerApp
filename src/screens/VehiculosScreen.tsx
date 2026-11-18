import { WorkshopTheme } from '@/constants/theme';
import { VehiculoConPropietario } from '@/types/workshop';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface VehiculosScreenProps {
  vehiculos: VehiculoConPropietario[];
  vehiculosEnTaller: VehiculoConPropietario[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filtroVehiculo: 'todos' | 'en_taller';
  setFiltroVehiculo: (filtro: 'todos' | 'en_taller') => void;
  onVerFicha: (vehiculo: VehiculoConPropietario) => void;
}

export function VehiculosScreen({
  vehiculos,
  vehiculosEnTaller,
  searchQuery,
  setSearchQuery,
  filtroVehiculo,
  setFiltroVehiculo,
  onVerFicha,
}: VehiculosScreenProps) {
  const vehiculosFiltrados = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vehiculos.filter((v) => {
      const matchQuery =
        !q ||
        v.placa.toLowerCase().includes(q) ||
        (v.marca && v.marca.toLowerCase().includes(q)) ||
        (v.modelo && v.modelo.toLowerCase().includes(q)) ||
        (v.propietarioNombre && v.propietarioNombre.toLowerCase().includes(q));

      const matchFiltro =
        filtroVehiculo === 'todos' || (filtroVehiculo === 'en_taller' && v.estado === 'en_taller');

      return matchQuery && matchFiltro;
    });
  }, [vehiculos, searchQuery, filtroVehiculo]);

  return (
    <View style={styles.container}>
      <View style={styles.heroSection}>
        <Text style={styles.heroSectionTag}>VEHÍCULOS</Text>
        <Text style={styles.heroTitle}>Vehículos del taller</Text>
        <Text style={styles.heroSubtitle}>
          Cada carro con su información y su historial completo de trabajos.
        </Text>
      </View>

      {/* Buscador y Filtros */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={WorkshopTheme.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por placa, marca o cliente..."
          placeholderTextColor={WorkshopTheme.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={WorkshopTheme.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterChip, filtroVehiculo === 'todos' && styles.filterChipActive]}
          onPress={() => setFiltroVehiculo('todos')}>
          <Text
            style={[
              styles.filterChipText,
              filtroVehiculo === 'todos' && styles.filterChipTextActive,
            ]}>
            Todos ({vehiculos.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            filtroVehiculo === 'en_taller' && styles.filterChipActive,
          ]}
          onPress={() => setFiltroVehiculo('en_taller')}>
          <Text
            style={[
              styles.filterChipText,
              filtroVehiculo === 'en_taller' && styles.filterChipTextActive,
            ]}>
            En Taller ({vehiculosEnTaller.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de vehículos */}
      {vehiculosFiltrados.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialIcons name="directions-car" size={32} color={WorkshopTheme.secondary} />
          <Text style={styles.emptyCardTitle}>No se encontraron vehículos</Text>
          <Text style={styles.emptyCardSubtitle}>
            Prueba cambiando el término de búsqueda o recibe un nuevo vehículo.
          </Text>
        </View>
      ) : (
        <View style={styles.servicesStack}>
          {vehiculosFiltrados.map((v) => (
            <Pressable
              key={v.id}
              style={({ pressed }) => [styles.serviceItemCard, pressed && styles.cardPressed]}
              onPress={() => onVerFicha(v)}>
              <View style={styles.serviceLeft}>
                <View style={styles.plateAndClientRow}>
                  <View style={styles.plateBadge}>
                    <Text style={styles.plateText}>{v.placa}</Text>
                  </View>
                  <Text style={styles.clientName} numberOfLines={1}>
                    {v.marca || 'Vehículo'} {v.modelo || ''}
                  </Text>
                </View>
                <Text style={styles.serviceDate}>
                  {v.propietarioNombre || 'Sin asignar'}
                </Text>
              </View>
              <View style={styles.serviceRight}>
                {v.estado === 'en_taller' ? (
                  <View style={styles.badgeRecibido}>
                    <View style={styles.badgeDotRecibido} />
                    <Text style={styles.badgeRecibidoText}>EN TALLER</Text>
                  </View>
                ) : (
                  <View style={styles.badgeListo}>
                    <View style={styles.badgeDotListo} />
                    <Text style={styles.badgeListoText}>ENTREGADO</Text>
                  </View>
                )}
                <Text style={styles.serviceAmount}>{v.kilometraje || 0} km</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={WorkshopTheme.secondary} style={{ opacity: 0.4, marginLeft: 4 }} />
            </Pressable>
          ))}
        </View>
      )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: WorkshopTheme.surfaceContainerHigh,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: WorkshopTheme.onSurface,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: WorkshopTheme.surfaceContainerLow,
  },
  filterChipActive: {
    backgroundColor: WorkshopTheme.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: WorkshopTheme.secondary,
  },
  filterChipTextActive: {
    color: WorkshopTheme.onPrimary,
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
  servicesStack: {
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
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
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

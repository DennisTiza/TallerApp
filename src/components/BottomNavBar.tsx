import { WorkshopTheme } from '@/constants/theme';
import { TabType } from '@/types/workshop';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavBarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onRecibirPress: () => void;
}

export function BottomNavBar({
  activeTab,
  onSelectTab,
  onRecibirPress,
}: BottomNavBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      <View style={styles.bottomNavRow}>
        {/* 1. Tablero */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onSelectTab('tablero')}
          activeOpacity={0.75}>
          <MaterialIcons
            name="dashboard"
            size={22}
            color={activeTab === 'tablero' ? WorkshopTheme.primary : WorkshopTheme.secondary}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'tablero' ? styles.navLabelActive : styles.navLabelInactive,
            ]}>
            Tablero
          </Text>
        </TouchableOpacity>

        {/* 2. Vehículos */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onSelectTab('vehiculos')}
          activeOpacity={0.75}>
          <MaterialIcons
            name="directions-car"
            size={22}
            color={activeTab === 'vehiculos' ? WorkshopTheme.primary : WorkshopTheme.secondary}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'vehiculos' ? styles.navLabelActive : styles.navLabelInactive,
            ]}>
            Vehículos
          </Text>
        </TouchableOpacity>

        {/* 3. Recibir (+ Botón Central Elevado) */}
        <View style={styles.centerFabContainer}>
          <TouchableOpacity
            style={styles.centerFab}
            onPress={onRecibirPress}
            activeOpacity={0.88}>
            <MaterialIcons name="add" size={26} color={WorkshopTheme.onPrimary} />
          </TouchableOpacity>
          <Text style={styles.centerFabLabel}>RECIBIR</Text>
        </View>

        {/* 4. Servicios */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onSelectTab('servicios')}
          activeOpacity={0.75}>
          <MaterialIcons
            name="build"
            size={22}
            color={activeTab === 'servicios' ? WorkshopTheme.primary : WorkshopTheme.secondary}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'servicios' ? styles.navLabelActive : styles.navLabelInactive,
            ]}>
            Servicios
          </Text>
        </TouchableOpacity>

        {/* 5. Clientes */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => onSelectTab('clientes')}
          activeOpacity={0.75}>
          <MaterialIcons
            name="group"
            size={22}
            color={activeTab === 'clientes' ? WorkshopTheme.primary : WorkshopTheme.secondary}
          />
          <Text
            style={[
              styles.navLabel,
              activeTab === 'clientes' ? styles.navLabelActive : styles.navLabelInactive,
            ]}>
            Clientes
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WorkshopTheme.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: WorkshopTheme.cardBorder,
    shadowColor: '#122b32',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  bottomNavRow: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 50,
  },
  navLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  navLabelActive: {
    fontWeight: '700',
    color: WorkshopTheme.primary,
  },
  navLabelInactive: {
    fontWeight: '500',
    color: WorkshopTheme.secondary,
  },
  centerFabContainer: {
    alignItems: 'center',
    marginTop: -20,
    minWidth: 64,
  },
  centerFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WorkshopTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: WorkshopTheme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 6,
  },
  centerFabLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: WorkshopTheme.primary,
    marginTop: 2,
    letterSpacing: 0.6,
  },
});

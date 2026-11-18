import { EditarClienteModal } from '@/components/EditarClienteModal';
import { WorkshopTheme } from '@/constants/theme';
import { Cliente, Vehiculo } from '@/database';
import { ClienteUI } from '@/types/workshop';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface ClientesScreenProps {
  clientes: Cliente[];
  vehiculos: Vehiculo[];
  tallerNombre?: string;
  onNuevoClientePress: () => void;
  onVerFichaVehiculo: (placa: string) => void;
  onRefresh?: () => void;
}

export function ClientesScreen({
  clientes,
  vehiculos,
  tallerNombre,
  onNuevoClientePress,
  onVerFichaVehiculo,
  onRefresh = () => { },
}: ClientesScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAZ, setSortAZ] = useState(true);
  const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);

  // Lista enriquecida de clientes con sus vehículos asignados
  const clientesListos = useMemo<ClienteUI[]>(() => {
    let baseClientes: ClienteUI[] = [];

    if (clientes.length > 0) {
      baseClientes = clientes.map((c) => {
        const vehs = vehiculos.filter((v) => v.cliente_id === c.id);
        const palabras = c.nombre.trim().split(/\s+/);
        const iniciales =
          palabras.length > 1
            ? `${palabras[0][0]}${palabras[1][0]}`.toUpperCase()
            : (palabras[0]?.slice(0, 2) || 'CL').toUpperCase();

        const placaPrincipal = vehs[0]?.placa || 'PENDIENTE';
        const vehiculoDesc = vehs[0]
          ? `${vehs[0].marca || ''} ${vehs[0].modelo || ''}`.trim() + (vehs.length > 1 ? ` (+${vehs.length - 1})` : '')
          : 'Sin vehículo asignado';

        return {
          id: c.id,
          nombre: c.nombre,
          telefono: c.telefono,
          correo: c.correo,
          iniciales,
          placaPrincipal,
          vehiculoDesc,
          totalVehiculos: vehs.length,
        };
      });
    }

    // Filtrar por búsqueda
    const q = searchQuery.trim().toLowerCase();
    const filtrados = baseClientes.filter((c) => {
      if (!q) return true;
      const matchNombre = c.nombre.toLowerCase().includes(q);
      const matchTelefono = c.telefono ? c.telefono.includes(q) : false;
      const matchPlaca = c.placaPrincipal.toLowerCase().includes(q);
      return matchNombre || matchTelefono || matchPlaca;
    });

    // Ordenar A-Z o Z-A
    return filtrados.sort((a, b) => {
      return sortAZ
        ? a.nombre.localeCompare(b.nombre)
        : b.nombre.localeCompare(a.nombre);
    });
  }, [clientes, vehiculos, searchQuery, sortAZ]);

  // Acciones de comunicación rápida
  const handleLlamar = (telefono?: string | null) => {
    if (!telefono) {
      Alert.alert('Sin teléfono', 'Este cliente no tiene un número registrado.');
      return;
    }
    const clean = telefono.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${clean}`).catch(() => {
      Alert.alert('Error', 'No se pudo iniciar la llamada.');
    });
  };

  const handleWhatsApp = (telefono?: string | null, nombre?: string) => {
    if (!telefono) {
      Alert.alert('Sin teléfono', 'Este cliente no tiene un número registrado.');
      return;
    }
    const clean = telefono.replace(/[^0-9]/g, '');
    const phoneWithCode = clean.startsWith('57') ? clean : `57${clean}`;
    const mensaje = encodeURIComponent(
      `Hola ${nombre || ''}, te contactamos desde ${tallerNombre || 'Box H&T Centro Automotriz'}.`
    );
    Linking.openURL(`https://wa.me/${phoneWithCode}?text=${mensaje}`).catch(() => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp.');
    });
  };

  return (
    <View style={styles.container}>
      {/* Contexto & Botón Nuevo */}
      <View style={styles.clientHeaderRow}>
        <View style={styles.clientHeaderTexts}>
          <Text style={styles.heroSectionTag}>CLIENTES</Text>
          <Text style={styles.heroTitle}>Directorio</Text>
          <Text style={styles.heroSubtitle}>
            Quiénes traen sus carros al taller y cómo contactarlos.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.btnNuevoCliente}
          onPress={onNuevoClientePress}
          activeOpacity={0.85}>
          <MaterialIcons name="person-add" size={18} color={WorkshopTheme.inverseOnSurface} />
          <Text style={styles.btnNuevoClienteText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* Barra de Búsqueda de Clientes */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={WorkshopTheme.secondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar cliente por nombre o teléfono..."
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

      {/* Contador y Botón Orden A-Z */}
      <View style={styles.clientCounterRow}>
        <View style={styles.counterLeft}>
          <View style={styles.pulseDot} />
          <Text style={styles.counterText}>
            {clientesListos.length} cliente{clientesListos.length === 1 ? '' : 's'} registrado{clientesListos.length === 1 ? '' : 's'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => setSortAZ(!sortAZ)}
          activeOpacity={0.75}>
          <Text style={styles.sortButtonText}>{sortAZ ? 'A-Z' : 'Z-A'}</Text>
          <MaterialIcons
            name={sortAZ ? 'arrow-downward' : 'arrow-upward'}
            size={14}
            color={WorkshopTheme.onSurface}
          />
        </TouchableOpacity>
      </View>

      {/* Lista de Tarjetas de Cliente */}
      {clientesListos.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialIcons name="search-off" size={36} color={WorkshopTheme.secondary} />
          <Text style={styles.emptyCardTitle}>Cliente no encontrado</Text>
          <Text style={styles.emptyCardSubtitle}>
            Verifica la ortografía o registra al nuevo propietario directamente.
          </Text>
          <TouchableOpacity
            style={styles.emptyCardButton}
            onPress={onNuevoClientePress}
            activeOpacity={0.88}>
            <MaterialIcons name="person-add" size={16} color={WorkshopTheme.primary} />
            <Text style={styles.emptyCardButtonText}>Registrar cliente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.clientCardsStack}>
          {clientesListos.map((c) => (
            <View key={c.id} style={styles.clientCard}>
              {/* Fila superior: Avatar con iniciales, Nombre, Contador de Vehículos y Opciones */}
              <View style={styles.clientTopRow}>
                <View style={styles.clientInfoGroup}>
                  <View style={styles.clientAvatarCircle}>
                    <Text style={styles.clientAvatarText}>{c.iniciales}</Text>
                  </View>
                  <View style={styles.clientNameCol}>
                    <Text style={styles.clientCardName} numberOfLines={1}>
                      {c.nombre}
                    </Text>
                    <View style={styles.vehicleCountRow}>
                      <MaterialIcons name="directions-car" size={15} color={WorkshopTheme.tertiary} />
                      <Text style={styles.vehicleCountText}>
                        {c.totalVehiculos} vehículo{c.totalVehiculos === 1 ? '' : 's'} registrado{c.totalVehiculos === 1 ? '' : 's'}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.moreOptionsButton}
                  activeOpacity={0.6}
                  onPress={() => {
                    const full = clientes.find((item) => item.id === c.id) || null;
                    setClienteParaEditar(full);
                  }}>
                  <MaterialIcons name="more-vert" size={20} color={WorkshopTheme.secondary} />
                </TouchableOpacity>
              </View>

              {/* Barra de Teléfono y Comunicación Rápida */}
              <View style={styles.commBar}>
                <TouchableOpacity
                  style={styles.phoneTouchArea}
                  onPress={() => handleLlamar(c.telefono)}
                  activeOpacity={0.7}>
                  <View style={styles.phoneIconSquare}>
                    <MaterialIcons name="call" size={16} color={WorkshopTheme.secondary} />
                  </View>
                  <Text style={styles.phonePlateText} numberOfLines={1}>
                    {c.telefono || 'Sin número'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.commActionButtons}>
                  {/* Botón Llamar */}
                  <TouchableOpacity
                    style={styles.commCircleButton}
                    onPress={() => handleLlamar(c.telefono)}
                    activeOpacity={0.85}>
                    <MaterialIcons name="phone-in-talk" size={18} color={WorkshopTheme.tertiary} />
                  </TouchableOpacity>

                  {/* Botón WhatsApp */}
                  <TouchableOpacity
                    style={styles.waCircleButton}
                    onPress={() => handleWhatsApp(c.telefono, c.nombre)}
                    activeOpacity={0.85}>
                    <Ionicons name="chatbubble" size={16} color={WorkshopTheme.onTertiary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fila inferior: Tag del Vehículo Principal y Enlace a Ficha */}
              <View style={styles.clientMetaRow}>
                <View style={styles.vehicleBadgeRow}>
                  <View style={styles.vehiclePlatePill}>
                    <Text style={styles.vehiclePlatePillText}>{c.placaPrincipal}</Text>
                  </View>
                  <Text style={styles.vehicleModelSummary} numberOfLines={1}>
                    {c.vehiculoDesc}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Modal para Editar y Eliminar Cliente y Asignar Vehículos */}
      <EditarClienteModal
        visible={clienteParaEditar !== null}
        cliente={clienteParaEditar}
        vehiculos={vehiculos}
        onClose={() => setClienteParaEditar(null)}
        onSuccess={onRefresh}
        onDeleted={onRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  clientHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    paddingTop: 4,
  },
  clientHeaderTexts: {
    flex: 1,
    gap: 2,
  },
  btnNuevoCliente: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: WorkshopTheme.inverseSurface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  btnNuevoClienteText: {
    color: WorkshopTheme.inverseOnSurface,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
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
  clientCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 14,
  },
  counterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: WorkshopTheme.tertiary,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
    color: WorkshopTheme.secondary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: WorkshopTheme.surfaceContainerHigh,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
  },
  clientCardsStack: {
    gap: 12,
  },
  clientCard: {
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    borderRadius: 18,
    padding: 16,
    gap: 12,
    shadowColor: '#122b32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  clientTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  clientInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  clientAvatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: WorkshopTheme.secondaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  clientAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: WorkshopTheme.onSecondaryFixed,
  },
  clientNameCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  clientCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
  },
  vehicleCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleCountText: {
    fontSize: 12,
    color: WorkshopTheme.secondary,
  },
  moreOptionsButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commBar: {
    backgroundColor: WorkshopTheme.surfaceContainerLow,
    borderRadius: 14,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneTouchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  phoneIconSquare: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonePlateText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '600',
    color: WorkshopTheme.onSurface,
    letterSpacing: 0.6,
  },
  commActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  waCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: WorkshopTheme.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: WorkshopTheme.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  clientMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  vehicleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  vehiclePlatePill: {
    backgroundColor: WorkshopTheme.surfaceContainer,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vehiclePlatePillText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: '800',
    color: WorkshopTheme.onSurface,
    letterSpacing: 0.8,
  },
  vehicleModelSummary: {
    fontSize: 12,
    color: WorkshopTheme.secondary,
    flex: 1,
  },
  fichaLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  fichaLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: WorkshopTheme.tertiary,
  },
  assistanceBanner: {
    marginTop: 20,
    backgroundColor: WorkshopTheme.surfaceContainer,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  assistanceIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.tertiaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assistanceTextCol: {
    flex: 1,
    gap: 2,
  },
  assistanceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: WorkshopTheme.onSurface,
  },
  assistanceSubtitle: {
    fontSize: 11,
    color: WorkshopTheme.secondary,
    lineHeight: 16,
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
    marginVertical: 10,
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
});

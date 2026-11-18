import { WorkshopTheme } from '@/constants/theme';
import { clientesRepo, vehiculosRepo } from '@/database';
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface NuevoClienteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NuevoClienteModal({
  visible,
  onClose,
  onSuccess,
}: NuevoClienteModalProps) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [placa, setPlaca] = useState('');
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa el nombre del cliente.');
      return;
    }

    setGuardando(true);
    try {
      const clienteCreado = await clientesRepo.create({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        correo: null,
        direccion: null,
        notas: null,
      });

      if (placa.trim()) {
        const cleanPlaca = placa.trim().toUpperCase();
        const existente = await vehiculosRepo.getByPlaca(cleanPlaca);
        if (existente) {
          await vehiculosRepo.update(existente.id, {
            cliente_id: clienteCreado.id,
          });
        } else {
          await vehiculosRepo.create({
            cliente_id: clienteCreado.id,
            placa: cleanPlaca,
            marca: 'Vehículo',
            modelo: 'Registrado',
            anio: null,
            color: null,
            kilometraje: 0,
            vin_chasis: null,
            estado: 'en_taller',
          });
        }
      }

      setNombre('');
      setTelefono('');
      setPlaca('');
      onSuccess();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo registrar el cliente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleGroup}>
              <View style={styles.modalIconCircle}>
                <MaterialIcons name="person-add" size={18} color={WorkshopTheme.primary} />
              </View>
              <Text style={styles.modalTitle}>Nuevo Cliente</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <MaterialIcons name="close" size={20} color={WorkshopTheme.secondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalInputs}>
            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalInputLabel}>Nombre Completo *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. Carlos Mendoza"
                placeholderTextColor={WorkshopTheme.secondary}
                value={nombre}
                onChangeText={setNombre}
              />
            </View>

            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalInputLabel}>Teléfono / WhatsApp</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. 312 0000000"
                placeholderTextColor={WorkshopTheme.secondary}
                keyboardType="phone-pad"
                value={telefono}
                onChangeText={setTelefono}
              />
            </View>

            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalInputLabel}>Vehículo Asignado (Opcional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalPlateInput]}
                placeholder="Placa (ej. ABC-123)"
                placeholderTextColor={WorkshopTheme.secondary}
                autoCapitalize="characters"
                value={placa}
                onChangeText={setPlaca}
              />
            </View>
          </View>

          <View style={styles.modalActionsRow}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={onClose}
              activeOpacity={0.8}>
              <Text style={styles.modalCancelBtnText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSaveBtn, guardando && styles.btnDisabled]}
              onPress={handleGuardar}
              disabled={guardando}
              activeOpacity={0.88}>
              {guardando ? (
                <ActivityIndicator color={WorkshopTheme.onPrimary} size="small" />
              ) : (
                <Text style={styles.modalSaveBtnText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(38, 49, 67, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: WorkshopTheme.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: WorkshopTheme.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: WorkshopTheme.onSurface,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WorkshopTheme.surfaceContainerLow,
  },
  modalInputs: {
    gap: 12,
  },
  modalFieldGroup: {
    gap: 6,
  },
  modalInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: WorkshopTheme.secondary,
  },
  modalInput: {
    backgroundColor: WorkshopTheme.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: WorkshopTheme.onSurface,
  },
  modalPlateInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    letterSpacing: 1,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: WorkshopTheme.secondary,
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: WorkshopTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: WorkshopTheme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: WorkshopTheme.onPrimary,
  },
  btnDisabled: {
    opacity: 0.7,
  },
});

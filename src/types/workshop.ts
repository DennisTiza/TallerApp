import { Vehiculo } from '@/database';

export interface VehiculoConPropietario extends Vehiculo {
  propietarioNombre?: string;
  propietarioTelefono?: string | null;
}

export interface ServicioItemUI {
  id: string;
  placa: string;
  clienteNombre: string;
  fecha: string;
  estado: 'recibido' | 'listo' | 'en_proceso' | 'en_diagnostico';
  monto: number;
  // Campos extendidos para las tarjetas ricas
  tipo: string | null;
  descripcion: string | null;
  repuestosDesc: string | null;
  mecanicoNombre: string | null;
  kilometraje: number | null;
  proximaVisita: string | null;
  notaEstado: string | null;
}

export interface ClienteUI {
  id: string;
  nombre: string;
  telefono: string | null;
  correo?: string | null;
  iniciales: string;
  placaPrincipal: string;
  vehiculoDesc: string;
  totalVehiculos: number;
}

export type TabType = 'tablero' | 'vehiculos' | 'servicios' | 'clientes';

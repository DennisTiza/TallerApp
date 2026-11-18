/**
 * Schema y definiciones de la base de datos SQLite para TallerApp.
 * Adaptado de PostgreSQL a SQLite con soporte de UUIDs generados vía expo-crypto.
 */

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  notas: string | null;
  creado_en?: string;
}

export type EstadoVehiculo = 'en_taller' | 'entregado';

export interface Vehiculo {
  id: string;
  cliente_id: string | null;
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  color: string | null;
  kilometraje: number;
  vin_chasis: string | null;
  estado: EstadoVehiculo;
  creado_en?: string;
}

export interface Taller {
  id: string;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
  creado_en?: string;
}

export interface Mecanico {
  id: string;
  taller_id: string;
  nombre: string;
  telefono: string | null;
  especialidad: string | null;
  activo: number; // 1 = true, 0 = false
  creado_en?: string;
}

export type EstadoOrden = 'recibido' | 'en_proceso' | 'listo' | 'entregado';

export interface OrdenServicio {
  id: string;
  vehiculo_id: string;
  mecanico_id: string | null;
  tipo: string | null;
  estado: EstadoOrden;
  descripcion: string | null;
  trabajo_realizado?: string | null;
  repuestos?: string | null;
  fecha_servicio: string;
  kilometraje: number | null;
  presupuesto: number;
  costo_total: number;
  creado_en?: string;
}

export interface RepuestoServicio {
  id: string;
  orden_servicio_id: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export const DATABASE_NAME = 'taller.db';

export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- 1. TABLA: clientes
  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT,
    correo TEXT,
    direccion TEXT,
    notas TEXT,
    creado_en TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- 2. TABLA: vehiculos
  CREATE TABLE IF NOT EXISTS vehiculos (
    id TEXT PRIMARY KEY NOT NULL,
    cliente_id TEXT,
    placa TEXT UNIQUE NOT NULL,
    marca TEXT,
    modelo TEXT,
    anio INTEGER,
    color TEXT,
    kilometraje INTEGER DEFAULT 0,
    vin_chasis TEXT,
    estado TEXT CHECK (estado IN ('en_taller', 'entregado')) DEFAULT 'en_taller',
    creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
  );

  -- 3. TABLA: taller
  CREATE TABLE IF NOT EXISTS taller (
    id TEXT PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL,
    nit TEXT,
    direccion TEXT,
    telefono TEXT,
    correo TEXT,
    creado_en TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- 4. TABLA: mecanicos
  CREATE TABLE IF NOT EXISTS mecanicos (
    id TEXT PRIMARY KEY NOT NULL,
    taller_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT,
    especialidad TEXT,
    activo INTEGER DEFAULT 1,
    creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (taller_id) REFERENCES taller(id) ON DELETE CASCADE
  );

  -- 5. TABLA: ordenes_servicio
  CREATE TABLE IF NOT EXISTS ordenes_servicio (
    id TEXT PRIMARY KEY NOT NULL,
    vehiculo_id TEXT NOT NULL,
    mecanico_id TEXT,
    tipo TEXT,
    estado TEXT CHECK (estado IN ('recibido', 'en_proceso', 'listo', 'entregado')) DEFAULT 'recibido',
    descripcion TEXT,
    trabajo_realizado TEXT,
    repuestos TEXT,
    fecha_servicio TEXT DEFAULT CURRENT_DATE,
    kilometraje INTEGER,
    presupuesto REAL DEFAULT 0.00,
    costo_total REAL DEFAULT 0.00,
    creado_en TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehiculo_id) REFERENCES vehiculos(id) ON DELETE CASCADE,
    FOREIGN KEY (mecanico_id) REFERENCES mecanicos(id) ON DELETE SET NULL
  );

  -- 6. TABLA: repuestos_servicio
  CREATE TABLE IF NOT EXISTS repuestos_servicio (
    id TEXT PRIMARY KEY NOT NULL,
    orden_servicio_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    cantidad INTEGER DEFAULT 1,
    precio_unitario REAL DEFAULT 0.00,
    FOREIGN KEY (orden_servicio_id) REFERENCES ordenes_servicio(id) ON DELETE CASCADE
  );

  -- Índices para optimizar búsquedas y llaves foráneas
  CREATE INDEX IF NOT EXISTS idx_vehiculos_cliente ON vehiculos(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_vehiculos_placa ON vehiculos(placa);
  CREATE INDEX IF NOT EXISTS idx_mecanicos_taller ON mecanicos(taller_id);
  CREATE INDEX IF NOT EXISTS idx_ordenes_vehiculo ON ordenes_servicio(vehiculo_id);
  CREATE INDEX IF NOT EXISTS idx_ordenes_mecanico ON ordenes_servicio(mecanico_id);
  CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes_servicio(estado);
  CREATE INDEX IF NOT EXISTS idx_repuestos_orden ON repuestos_servicio(orden_servicio_id);
`;

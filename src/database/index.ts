import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DATABASE_NAME,
  CREATE_TABLES_SQL,
  Cliente,
  Vehiculo,
  Taller,
  Mecanico,
  OrdenServicio,
  RepuestoServicio,
  EstadoVehiculo,
  EstadoOrden,
} from './schema';

export * from './schema';

let dbInstance: any = null;
let sqliteAvailable: boolean | null = null;
let sqliteModule: any = null;

/**
 * Genera un UUID v4 criptográficamente seguro con fallback.
 */
export function generateUUID(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

/**
 * Detecta de forma segura si el módulo nativo de SQLite está disponible
 * (por ejemplo, en un Development Build o compilación nativa) o si se está
 * ejecutando en Expo Go / Web donde debe usarse el almacenamiento AsyncStorage.
 */
export function isSQLiteAvailable(): boolean {
  if (sqliteAvailable !== null) return sqliteAvailable;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-sqlite');
    if (mod && (mod.openDatabaseAsync || mod.openDatabaseSync)) {
      sqliteModule = mod;
      sqliteAvailable = true;
      return true;
    }
    sqliteAvailable = false;
    return false;
  } catch {
    console.log('[TallerApp] ExpoSQLite nativo no está enlazado en este entorno (Expo Go). Activando almacenamiento local de alta compatibilidad.');
    sqliteAvailable = false;
    return false;
  }
}

let dbInitPromise: Promise<any> | null = null;

/**
 * Obtiene o abre la instancia de la base de datos SQLite si está disponible.
 * Garantiza que las tablas siempre se creen antes de procesar cualquier consulta.
 */
export async function getDatabase(): Promise<any> {
  if (!isSQLiteAvailable()) return null;
  if (!dbInstance) {
    if (!dbInitPromise) {
      dbInitPromise = (async () => {
        try {
          const instance = await sqliteModule.openDatabaseAsync(DATABASE_NAME);
          await instance.execAsync(`
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
          `);
          await instance.execAsync(CREATE_TABLES_SQL);
          try {
            await instance.execAsync('ALTER TABLE ordenes_servicio ADD COLUMN trabajo_realizado TEXT;');
          } catch {}
          try {
            await instance.execAsync('ALTER TABLE ordenes_servicio ADD COLUMN repuestos TEXT;');
          } catch {}
          dbInstance = instance;
          return instance;
        } catch (error) {
          console.error('[TallerApp] Error al inicializar SQLite:', error);
          throw error;
        } finally {
          dbInitPromise = null;
        }
      })();
    }
    return await dbInitPromise;
  }
  return dbInstance;
}

/**
 * Inicializa las tablas e índices si no existen.
 */
export async function initDatabase(): Promise<any> {
  return await getDatabase();
}

/**
 * Limpia y restablece por completo la base de datos local (tanto SQLite como AsyncStorage).
 */
export async function resetDatabase(): Promise<void> {
  if (isSQLiteAvailable()) {
    const db = await getDatabase();
    await db.execAsync(`
      DROP TABLE IF EXISTS repuestos_servicio;
      DROP TABLE IF EXISTS ordenes_servicio;
      DROP TABLE IF EXISTS mecanicos;
      DROP TABLE IF EXISTS vehiculos;
      DROP TABLE IF EXISTS clientes;
      DROP TABLE IF EXISTS taller;
    `);
    await db.execAsync(CREATE_TABLES_SQL);
  } else {
    await AsyncStorage.multiRemove(Object.values(AS_KEYS));
  }
}

// ============================================================================
// HELPERS PARA MODO ASYNCSTORAGE (Fallback transparente para Expo Go / Web)
// ============================================================================
const AS_KEYS = {
  CLIENTES: '@tallerapp:clientes',
  VEHICULOS: '@tallerapp:vehiculos',
  TALLER: '@tallerapp:taller',
  MECANICOS: '@tallerapp:mecanicos',
  ORDENES: '@tallerapp:ordenes',
  REPUESTOS: '@tallerapp:repuestos',
};

async function getAsList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function setAsList<T>(key: string, list: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

// ============================================================================
// 1. REPOSITORIO: CLIENTES
// ============================================================================
export const clientesRepo = {
  async create(data: Omit<Cliente, 'id' | 'creado_en'> & { id?: string }): Promise<Cliente> {
    const id = data.id || generateUUID();
    const now = new Date().toISOString();

    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO clientes (id, nombre, telefono, correo, direccion, notas, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, data.nombre, data.telefono ?? null, data.correo ?? null, data.direccion ?? null, data.notas ?? null, now]
      );
      const created = await this.getById(id);
      if (!created) throw new Error('Error al crear el cliente');
      return created;
    } else {
      const list = await getAsList<Cliente>(AS_KEYS.CLIENTES);
      const nuevo: Cliente = {
        id,
        nombre: data.nombre,
        telefono: data.telefono ?? null,
        correo: data.correo ?? null,
        direccion: data.direccion ?? null,
        notas: data.notas ?? null,
        creado_en: now,
      };
      list.unshift(nuevo);
      await setAsList(AS_KEYS.CLIENTES, list);
      return nuevo;
    }
  },

  async getAll(): Promise<Cliente[]> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getAllAsync('SELECT * FROM clientes ORDER BY creado_en DESC');
    } else {
      return await getAsList<Cliente>(AS_KEYS.CLIENTES);
    }
  },

  async getById(id: string): Promise<Cliente | null> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getFirstAsync('SELECT * FROM clientes WHERE id = ?', [id]);
    } else {
      const list = await getAsList<Cliente>(AS_KEYS.CLIENTES);
      return list.find((c) => c.id === id) || null;
    }
  },

  async search(query: string): Promise<Cliente[]> {
    const term = query.toLowerCase();
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      const sqlTerm = `%${query}%`;
      return await db.getAllAsync(
        'SELECT * FROM clientes WHERE nombre LIKE ? OR telefono LIKE ? OR correo LIKE ? ORDER BY nombre ASC',
        [sqlTerm, sqlTerm, sqlTerm]
      );
    } else {
      const list = await getAsList<Cliente>(AS_KEYS.CLIENTES);
      return list.filter(
        (c) =>
          c.nombre.toLowerCase().includes(term) ||
          (c.telefono && c.telefono.toLowerCase().includes(term)) ||
          (c.correo && c.correo.toLowerCase().includes(term))
      );
    }
  },

  async update(id: string, data: Partial<Omit<Cliente, 'id' | 'creado_en'>>): Promise<Cliente | null> {
    const current = await this.getById(id);
    if (!current) return null;
    const updated = { ...current, ...data };

    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE clientes SET nombre = ?, telefono = ?, correo = ?, direccion = ?, notas = ? WHERE id = ?`,
        [
          updated.nombre,
          updated.telefono ?? null,
          updated.correo ?? null,
          updated.direccion ?? null,
          updated.notas ?? null,
          id,
        ]
      );
      return await this.getById(id);
    } else {
      const list = await getAsList<Cliente>(AS_KEYS.CLIENTES);
      const index = list.findIndex((c) => c.id === id);
      if (index !== -1) {
        list[index] = updated;
        await setAsList(AS_KEYS.CLIENTES, list);
      }
      return updated;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      const result = await db.runAsync('DELETE FROM clientes WHERE id = ?', [id]);
      return result.changes > 0;
    } else {
      const list = await getAsList<Cliente>(AS_KEYS.CLIENTES);
      const filtered = list.filter((c) => c.id !== id);
      const changed = filtered.length !== list.length;
      if (changed) await setAsList(AS_KEYS.CLIENTES, filtered);
      return changed;
    }
  },
};

// ============================================================================
// 2. REPOSITORIO: VEHICULOS
// ============================================================================
export const vehiculosRepo = {
  async create(data: Omit<Vehiculo, 'id' | 'creado_en'> & { id?: string }): Promise<Vehiculo> {
    const id = data.id || generateUUID();
    const now = new Date().toISOString();
    const cleanPlaca = data.placa.trim().toUpperCase();

    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO vehiculos (id, cliente_id, placa, marca, modelo, anio, color, kilometraje, vin_chasis, estado, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.cliente_id ?? null,
          cleanPlaca,
          data.marca ?? null,
          data.modelo ?? null,
          data.anio ?? null,
          data.color ?? null,
          data.kilometraje ?? 0,
          data.vin_chasis ?? null,
          data.estado ?? 'en_taller',
          now,
        ]
      );
      const created = await this.getById(id);
      if (!created) throw new Error('Error al registrar vehículo');
      return created;
    } else {
      const list = await getAsList<Vehiculo>(AS_KEYS.VEHICULOS);
      const nuevo: Vehiculo = {
        id,
        cliente_id: data.cliente_id ?? null,
        placa: cleanPlaca,
        marca: data.marca ?? null,
        modelo: data.modelo ?? null,
        anio: data.anio ?? null,
        color: data.color ?? null,
        kilometraje: data.kilometraje ?? 0,
        vin_chasis: data.vin_chasis ?? null,
        estado: data.estado ?? 'en_taller',
        creado_en: now,
      };
      list.unshift(nuevo);
      await setAsList(AS_KEYS.VEHICULOS, list);
      return nuevo;
    }
  },

  async getAll(): Promise<Vehiculo[]> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getAllAsync('SELECT * FROM vehiculos ORDER BY creado_en DESC');
    } else {
      return await getAsList<Vehiculo>(AS_KEYS.VEHICULOS);
    }
  },

  async getById(id: string): Promise<Vehiculo | null> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getFirstAsync('SELECT * FROM vehiculos WHERE id = ?', [id]);
    } else {
      const list = await getAsList<Vehiculo>(AS_KEYS.VEHICULOS);
      return list.find((v) => v.id === id) || null;
    }
  },

  async getByPlaca(placa: string): Promise<Vehiculo | null> {
    const clean = placa.trim().toUpperCase();
    const cleanNoSpaces = clean.replace(/[\s-]/g, '');
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getFirstAsync(
        `SELECT * FROM vehiculos 
         WHERE placa = ? 
            OR UPPER(REPLACE(REPLACE(placa, ' ', ''), '-', '')) = ?
         LIMIT 1`,
        [clean, cleanNoSpaces]
      );
    } else {
      const list = await getAsList<Vehiculo>(AS_KEYS.VEHICULOS);
      return list.find((v) => v.placa === clean || v.placa.replace(/[\s-]/g, '').toUpperCase() === cleanNoSpaces) || null;
    }
  },

  async getByClienteId(clienteId: string): Promise<Vehiculo[]> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getAllAsync('SELECT * FROM vehiculos WHERE cliente_id = ? ORDER BY placa ASC', [clienteId]);
    } else {
      const list = await getAsList<Vehiculo>(AS_KEYS.VEHICULOS);
      return list.filter((v) => v.cliente_id === clienteId);
    }
  },

  async update(id: string, data: Partial<Omit<Vehiculo, 'id' | 'creado_en'>>): Promise<Vehiculo | null> {
    const current = await this.getById(id);
    if (!current) return null;
    const updated: Vehiculo = {
      ...current,
      ...data,
      placa: data.placa ? data.placa.trim().toUpperCase() : current.placa,
    };

    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE vehiculos
         SET cliente_id = ?, placa = ?, marca = ?, modelo = ?, anio = ?, color = ?, kilometraje = ?, vin_chasis = ?, estado = ?
         WHERE id = ?`,
        [
          updated.cliente_id ?? null,
          updated.placa,
          updated.marca ?? null,
          updated.modelo ?? null,
          updated.anio ?? null,
          updated.color ?? null,
          updated.kilometraje ?? 0,
          updated.vin_chasis ?? null,
          updated.estado ?? 'en_taller',
          id,
        ]
      );
      return await this.getById(id);
    } else {
      const list = await getAsList<Vehiculo>(AS_KEYS.VEHICULOS);
      const index = list.findIndex((v) => v.id === id);
      if (index !== -1) {
        list[index] = updated;
        await setAsList(AS_KEYS.VEHICULOS, list);
      }
      return updated;
    }
  },

  async updateEstado(id: string, estado: EstadoVehiculo): Promise<boolean> {
    const res = await this.update(id, { estado });
    return res !== null;
  },

  async delete(id: string): Promise<boolean> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      const result = await db.runAsync('DELETE FROM vehiculos WHERE id = ?', [id]);
      return result.changes > 0;
    } else {
      const list = await getAsList<Vehiculo>(AS_KEYS.VEHICULOS);
      const filtered = list.filter((v) => v.id !== id);
      const changed = filtered.length !== list.length;
      if (changed) await setAsList(AS_KEYS.VEHICULOS, filtered);
      return changed;
    }
  },
};

// ============================================================================
// 3. REPOSITORIO: TALLER
// ============================================================================
export const tallerRepo = {
  async get(): Promise<Taller | null> {
    try {
      if (isSQLiteAvailable()) {
        const db = await getDatabase();
        if (!db) return null;
        return (await db.getFirstAsync('SELECT * FROM taller LIMIT 1')) || null;
      } else {
        const raw = await AsyncStorage.getItem(AS_KEYS.TALLER);
        return raw ? JSON.parse(raw) : null;
      }
    } catch (e) {
      console.warn('[TallerApp] Error o taller no configurado aún:', e);
      return null;
    }
  },

  async upsert(data: Omit<Taller, 'id' | 'creado_en'> & { id?: string }): Promise<Taller> {
    const existing = await this.get();
    const now = new Date().toISOString();

    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      if (existing) {
        await db.runAsync(
          `UPDATE taller SET nombre = ?, nit = ?, direccion = ?, telefono = ?, correo = ? WHERE id = ?`,
          [data.nombre, data.nit ?? null, data.direccion ?? null, data.telefono ?? null, data.correo ?? null, existing.id]
        );
        return (await this.get())!;
      } else {
        const id = data.id || generateUUID();
        await db.runAsync(
          `INSERT INTO taller (id, nombre, nit, direccion, telefono, correo, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, data.nombre, data.nit ?? null, data.direccion ?? null, data.telefono ?? null, data.correo ?? null, now]
        );
        return (await this.get())!;
      }
    } else {
      const tallerGuardado: Taller = {
        id: existing?.id || data.id || generateUUID(),
        nombre: data.nombre,
        nit: data.nit ?? null,
        direccion: data.direccion ?? null,
        telefono: data.telefono ?? null,
        correo: data.correo ?? null,
        creado_en: existing?.creado_en || now,
      };
      await AsyncStorage.setItem(AS_KEYS.TALLER, JSON.stringify(tallerGuardado));
      return tallerGuardado;
    }
  },
};

// ============================================================================
// 4. REPOSITORIO: MECANICOS
// ============================================================================
export const mecanicosRepo = {
  async create(data: Omit<Mecanico, 'id' | 'creado_en'> & { id?: string }): Promise<Mecanico> {
    const id = data.id || generateUUID();
    const now = new Date().toISOString();

    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO mecanicos (id, taller_id, nombre, telefono, especialidad, activo, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, data.taller_id, data.nombre, data.telefono ?? null, data.especialidad ?? null, data.activo ?? 1, now]
      );
      const created = await this.getById(id);
      if (!created) throw new Error('Error al registrar mecánico');
      return created;
    } else {
      const list = await getAsList<Mecanico>(AS_KEYS.MECANICOS);
      const nuevo: Mecanico = {
        id,
        taller_id: data.taller_id,
        nombre: data.nombre,
        telefono: data.telefono ?? null,
        especialidad: data.especialidad ?? null,
        activo: data.activo ?? 1,
        creado_en: now,
      };
      list.push(nuevo);
      await setAsList(AS_KEYS.MECANICOS, list);
      return nuevo;
    }
  },

  async getAll(): Promise<Mecanico[]> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getAllAsync('SELECT * FROM mecanicos ORDER BY nombre ASC');
    } else {
      const list = await getAsList<Mecanico>(AS_KEYS.MECANICOS);
      return list.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  },

  async getActivos(): Promise<Mecanico[]> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getAllAsync('SELECT * FROM mecanicos WHERE activo = 1 ORDER BY nombre ASC');
    } else {
      const list = await getAsList<Mecanico>(AS_KEYS.MECANICOS);
      return list.filter((m) => m.activo === 1).sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
  },

  async getById(id: string): Promise<Mecanico | null> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getFirstAsync('SELECT * FROM mecanicos WHERE id = ?', [id]);
    } else {
      const list = await getAsList<Mecanico>(AS_KEYS.MECANICOS);
      return list.find((m) => m.id === id) || null;
    }
  },

  async update(id: string, data: Partial<Omit<Mecanico, 'id' | 'creado_en'>>): Promise<Mecanico | null> {
    const current = await this.getById(id);
    if (!current) return null;
    const updated: Mecanico = { ...current, ...data };

    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE mecanicos SET taller_id = ?, nombre = ?, telefono = ?, especialidad = ?, activo = ? WHERE id = ?`,
        [updated.taller_id, updated.nombre, updated.telefono, updated.especialidad, updated.activo, id]
      );
      return await this.getById(id);
    } else {
      const list = await getAsList<Mecanico>(AS_KEYS.MECANICOS);
      const index = list.findIndex((m) => m.id === id);
      if (index !== -1) {
        list[index] = updated;
        await setAsList(AS_KEYS.MECANICOS, list);
      }
      return updated;
    }
  },

  async delete(id: string): Promise<boolean> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      const result = await db.runAsync('DELETE FROM mecanicos WHERE id = ?', [id]);
      return result.changes > 0;
    } else {
      const list = await getAsList<Mecanico>(AS_KEYS.MECANICOS);
      const filtered = list.filter((m) => m.id !== id);
      const changed = filtered.length !== list.length;
      if (changed) await setAsList(AS_KEYS.MECANICOS, filtered);
      return changed;
    }
  },
};

// ============================================================================
// 5. REPOSITORIO: ORDENES DE SERVICIO
// ============================================================================
export interface OrdenDetallada extends Omit<OrdenServicio, 'repuestos'> {
  vehiculo_placa?: string;
  vehiculo_marca?: string;
  vehiculo_modelo?: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
  mecanico_nombre?: string;
  repuestos?: RepuestoServicio[];
  repuestos_texto?: string | null;
}

export const ordenesRepo = {
  async create(data: Omit<OrdenServicio, 'id' | 'creado_en'> & { id?: string }): Promise<OrdenServicio> {
    const id = data.id || generateUUID();
    const now = new Date().toISOString();

    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO ordenes_servicio (id, vehiculo_id, mecanico_id, tipo, estado, descripcion, trabajo_realizado, repuestos, fecha_servicio, kilometraje, presupuesto, costo_total, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.vehiculo_id,
          data.mecanico_id ?? null,
          data.tipo ?? null,
          data.estado ?? 'recibido',
          data.descripcion ?? null,
          data.trabajo_realizado ?? null,
          data.repuestos ?? null,
          data.fecha_servicio || now.split('T')[0],
          data.kilometraje ?? null,
          data.presupuesto ?? 0.0,
          data.costo_total ?? 0.0,
          now,
        ]
      );
      const created = await this.getById(id);
      if (!created) throw new Error('Error al crear orden de servicio');
      return created;
    } else {
      const list = await getAsList<OrdenServicio>(AS_KEYS.ORDENES);
      const nueva: OrdenServicio = {
        id,
        vehiculo_id: data.vehiculo_id,
        mecanico_id: data.mecanico_id ?? null,
        tipo: data.tipo ?? null,
        estado: data.estado ?? 'recibido',
        descripcion: data.descripcion ?? null,
        trabajo_realizado: data.trabajo_realizado ?? null,
        repuestos: data.repuestos ?? null,
        fecha_servicio: data.fecha_servicio || now.split('T')[0],
        kilometraje: data.kilometraje ?? null,
        presupuesto: data.presupuesto ?? 0.0,
        costo_total: data.costo_total ?? 0.0,
        creado_en: now,
      };
      list.unshift(nueva);
      await setAsList(AS_KEYS.ORDENES, list);
      return nueva;
    }
  },

  async getAll(): Promise<OrdenServicio[]> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getAllAsync('SELECT * FROM ordenes_servicio ORDER BY creado_en DESC');
    } else {
      return await getAsList<OrdenServicio>(AS_KEYS.ORDENES);
    }
  },

  async getById(id: string): Promise<OrdenServicio | null> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getFirstAsync('SELECT * FROM ordenes_servicio WHERE id = ?', [id]);
    } else {
      const list = await getAsList<OrdenServicio>(AS_KEYS.ORDENES);
      return list.find((o) => o.id === id) || null;
    }
  },

  async getDetalle(id: string): Promise<OrdenDetallada | null> {
    const orden = await this.getById(id);
    if (!orden) return null;

    const vehiculo = await vehiculosRepo.getById(orden.vehiculo_id);
    const cliente = vehiculo?.cliente_id ? await clientesRepo.getById(vehiculo.cliente_id) : null;
    const mecanico = orden.mecanico_id ? await mecanicosRepo.getById(orden.mecanico_id) : null;
    const repuestos = await repuestosRepo.getByOrdenId(id);

    return {
      ...orden,
      vehiculo_placa: vehiculo?.placa,
      vehiculo_marca: vehiculo?.marca || undefined,
      vehiculo_modelo: vehiculo?.modelo || undefined,
      cliente_nombre: cliente?.nombre,
      cliente_telefono: cliente?.telefono || undefined,
      mecanico_nombre: mecanico?.nombre,
      repuestos_texto: orden.repuestos ?? null,
      repuestos,
    };
  },

  async getByEstado(estado: EstadoOrden): Promise<OrdenServicio[]> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getAllAsync('SELECT * FROM ordenes_servicio WHERE estado = ? ORDER BY creado_en DESC', [estado]);
    } else {
      const list = await getAsList<OrdenServicio>(AS_KEYS.ORDENES);
      return list.filter((o) => o.estado === estado);
    }
  },

  async getByVehiculoId(vehiculoId: string): Promise<OrdenServicio[]> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getAllAsync('SELECT * FROM ordenes_servicio WHERE vehiculo_id = ? ORDER BY fecha_servicio DESC', [vehiculoId]);
    } else {
      const list = await getAsList<OrdenServicio>(AS_KEYS.ORDENES);
      return list.filter((o) => o.vehiculo_id === vehiculoId);
    }
  },

  async update(id: string, data: Partial<Omit<OrdenServicio, 'id' | 'creado_en'>>): Promise<OrdenServicio | null> {
    const current = await this.getById(id);
    if (!current) return null;
    const updated: OrdenServicio = { ...current, ...data };

    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      await db.runAsync(
        `UPDATE ordenes_servicio
         SET vehiculo_id = ?, mecanico_id = ?, tipo = ?, estado = ?, descripcion = ?, trabajo_realizado = ?, repuestos = ?, fecha_servicio = ?, kilometraje = ?, presupuesto = ?, costo_total = ?
         WHERE id = ?`,
        [
          updated.vehiculo_id,
          updated.mecanico_id ?? null,
          updated.tipo ?? null,
          updated.estado ?? 'recibido',
          updated.descripcion ?? null,
          updated.trabajo_realizado ?? null,
          updated.repuestos ?? null,
          updated.fecha_servicio,
          updated.kilometraje ?? null,
          updated.presupuesto ?? 0,
          updated.costo_total ?? 0,
          id,
        ]
      );
      return await this.getById(id);
    } else {
      const list = await getAsList<OrdenServicio>(AS_KEYS.ORDENES);
      const index = list.findIndex((o) => o.id === id);
      if (index !== -1) {
        list[index] = updated;
        await setAsList(AS_KEYS.ORDENES, list);
      }
      return updated;
    }
  },

  async updateEstado(id: string, estado: EstadoOrden): Promise<boolean> {
    const res = await this.update(id, { estado });
    return res !== null;
  },

  async recalcularCostoTotal(ordenId: string, costoManoObra: number = 0): Promise<number> {
    const repuestos = await repuestosRepo.getByOrdenId(ordenId);
    const subtotalRepuestos = repuestos.reduce((acc, r) => acc + r.cantidad * r.precio_unitario, 0);
    const total = subtotalRepuestos + (costoManoObra || 0);
    await this.update(ordenId, { costo_total: total });
    return total;
  },

  async delete(id: string): Promise<boolean> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      const result = await db.runAsync('DELETE FROM ordenes_servicio WHERE id = ?', [id]);
      return result.changes > 0;
    } else {
      const list = await getAsList<OrdenServicio>(AS_KEYS.ORDENES);
      const filtered = list.filter((o) => o.id !== id);
      const changed = filtered.length !== list.length;
      if (changed) await setAsList(AS_KEYS.ORDENES, filtered);
      return changed;
    }
  },
};

// ============================================================================
// 6. REPOSITORIO: REPUESTOS DE SERVICIO
// ============================================================================
export const repuestosRepo = {
  async create(data: Omit<RepuestoServicio, 'id'> & { id?: string }): Promise<RepuestoServicio> {
    const id = data.id || generateUUID();
    const repuesto: RepuestoServicio = {
      id,
      orden_servicio_id: data.orden_servicio_id,
      nombre: data.nombre,
      cantidad: data.cantidad ?? 1,
      precio_unitario: data.precio_unitario ?? 0.0,
    };

    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      await db.runAsync(
        `INSERT INTO repuestos_servicio (id, orden_servicio_id, nombre, cantidad, precio_unitario)
         VALUES (?, ?, ?, ?, ?)`,
        [id, repuesto.orden_servicio_id, repuesto.nombre, repuesto.cantidad, repuesto.precio_unitario]
      );
    } else {
      const list = await getAsList<RepuestoServicio>(AS_KEYS.REPUESTOS);
      list.push(repuesto);
      await setAsList(AS_KEYS.REPUESTOS, list);
    }

    return repuesto;
  },

  async getByOrdenId(ordenServicioId: string): Promise<RepuestoServicio[]> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      return await db.getAllAsync(
        'SELECT * FROM repuestos_servicio WHERE orden_servicio_id = ? ORDER BY nombre ASC',
        [ordenServicioId]
      );
    } else {
      const list = await getAsList<RepuestoServicio>(AS_KEYS.REPUESTOS);
      return list.filter((r) => r.orden_servicio_id === ordenServicioId);
    }
  },

  async delete(id: string): Promise<boolean> {
    if (isSQLiteAvailable()) {
      const db = await getDatabase();
      const result = await db.runAsync('DELETE FROM repuestos_servicio WHERE id = ?', [id]);
      return result.changes > 0;
    } else {
      const list = await getAsList<RepuestoServicio>(AS_KEYS.REPUESTOS);
      const filtered = list.filter((r) => r.id !== id);
      const changed = filtered.length !== list.length;
      if (changed) await setAsList(AS_KEYS.REPUESTOS, filtered);
      return changed;
    }
  },
};

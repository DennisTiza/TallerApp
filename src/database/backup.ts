import * as FileSystem from 'expo-file-system/legacy';
import {
  isSQLiteAvailable,
  getDatabase,
  tallerRepo,
  mecanicosRepo,
  clientesRepo,
  vehiculosRepo,
  ordenesRepo,
  repuestosRepo,
} from './index';
import {
  Cliente,
  Vehiculo,
  Taller,
  Mecanico,
  OrdenServicio,
  RepuestoServicio,
  DATABASE_NAME,
} from './schema';

export interface DatabaseBackupPayload {
  appName: string;
  version: number;
  exportedAt: string;
  data: {
    taller: Taller[];
    mecanicos: Mecanico[];
    clientes: Cliente[];
    vehiculos: Vehiculo[];
    ordenes_servicio: OrdenServicio[];
    repuestos_servicio: RepuestoServicio[];
  };
  counts: {
    taller: number;
    mecanicos: number;
    clientes: number;
    vehiculos: number;
    ordenes_servicio: number;
    repuestos_servicio: number;
  };
}

/**
 * Obtiene la ruta física del archivo de la base de datos SQLite en el dispositivo.
 */
export function getDatabaseFilePath(): string {
  const docDir = (FileSystem as any).documentDirectory || '';
  return `${docDir}SQLite/${DATABASE_NAME}`;
}

/**
 * Exporta toda la base de datos local como un objeto JSON estructurado con metadatos.
 * Formato ideal para respaldo portátil, seguro y multiplataforma en Google Drive.
 */
export async function exportDatabaseAsJSON(): Promise<DatabaseBackupPayload> {
  if (isSQLiteAvailable()) {
    const db = await getDatabase();
    if (db) {
      await db.execAsync('PRAGMA wal_checkpoint(FULL);');
    }
  }

  const tallerItem = await tallerRepo.get();
  const taller = tallerItem ? [tallerItem] : [];
  const mecanicos = await mecanicosRepo.getAll();
  const clientes = await clientesRepo.getAll();
  const vehiculos = await vehiculosRepo.getAll();
  const ordenes_servicio = await ordenesRepo.getAll();

  const allRepuestos: RepuestoServicio[] = [];
  for (const o of ordenes_servicio) {
    const rep = await repuestosRepo.getByOrdenId(o.id);
    allRepuestos.push(...rep);
  }

  const payload: DatabaseBackupPayload = {
    appName: 'TallerApp',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      taller,
      mecanicos,
      clientes,
      vehiculos,
      ordenes_servicio,
      repuestos_servicio: allRepuestos,
    },
    counts: {
      taller: taller.length,
      mecanicos: mecanicos.length,
      clientes: clientes.length,
      vehiculos: vehiculos.length,
      ordenes_servicio: ordenes_servicio.length,
      repuestos_servicio: allRepuestos.length,
    },
  };

  return payload;
}

/**
 * Restaura la base de datos a partir de un respaldo JSON de Google Drive o archivo local.
 */
export async function importDatabaseFromJSON(backup: DatabaseBackupPayload): Promise<boolean> {
  if (!backup || !backup.data || backup.appName !== 'TallerApp') {
    throw new Error('El archivo de respaldo no es válido para TallerApp.');
  }

  if (isSQLiteAvailable()) {
    const db = await getDatabase();
    await db.withTransactionAsync(async () => {
      await db.execAsync('PRAGMA foreign_keys = OFF;');
      await db.execAsync(`
        DELETE FROM repuestos_servicio;
        DELETE FROM ordenes_servicio;
        DELETE FROM vehiculos;
        DELETE FROM mecanicos;
        DELETE FROM clientes;
        DELETE FROM taller;
      `);

      for (const t of backup.data.taller || []) {
        await db.runAsync(
          'INSERT INTO taller (id, nombre, nit, direccion, telefono, correo, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [t.id, t.nombre, t.nit ?? null, t.direccion ?? null, t.telefono ?? null, t.correo ?? null, t.creado_en ?? null]
        );
      }

      for (const m of backup.data.mecanicos || []) {
        await db.runAsync(
          'INSERT INTO mecanicos (id, taller_id, nombre, telefono, especialidad, activo, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [m.id, m.taller_id, m.nombre, m.telefono ?? null, m.especialidad ?? null, m.activo ?? 1, m.creado_en ?? null]
        );
      }

      for (const c of backup.data.clientes || []) {
        await db.runAsync(
          'INSERT INTO clientes (id, nombre, telefono, correo, direccion, notas, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [c.id, c.nombre, c.telefono ?? null, c.correo ?? null, c.direccion ?? null, c.notas ?? null, c.creado_en ?? null]
        );
      }

      for (const v of backup.data.vehiculos || []) {
        await db.runAsync(
          'INSERT INTO vehiculos (id, cliente_id, placa, marca, modelo, anio, color, kilometraje, vin_chasis, estado, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            v.id,
            v.cliente_id ?? null,
            v.placa,
            v.marca ?? null,
            v.modelo ?? null,
            v.anio ?? null,
            v.color ?? null,
            v.kilometraje ?? 0,
            v.vin_chasis ?? null,
            v.estado ?? 'en_taller',
            v.creado_en ?? null,
          ]
        );
      }

      for (const o of backup.data.ordenes_servicio || []) {
        await db.runAsync(
          'INSERT INTO ordenes_servicio (id, vehiculo_id, mecanico_id, tipo, estado, descripcion, fecha_servicio, kilometraje, presupuesto, costo_total, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            o.id,
            o.vehiculo_id,
            o.mecanico_id ?? null,
            o.tipo ?? null,
            o.estado ?? 'recibido',
            o.descripcion ?? null,
            o.fecha_servicio,
            o.kilometraje ?? null,
            o.presupuesto ?? 0,
            o.costo_total ?? 0,
            o.creado_en ?? null,
          ]
        );
      }

      for (const r of backup.data.repuestos_servicio || []) {
        await db.runAsync(
          'INSERT INTO repuestos_servicio (id, orden_servicio_id, nombre, cantidad, precio_unitario) VALUES (?, ?, ?, ?, ?)',
          [r.id, r.orden_servicio_id, r.nombre, r.cantidad ?? 1, r.precio_unitario ?? 0]
        );
      }

      await db.execAsync('PRAGMA foreign_keys = ON;');
    });
  } else {
    // Restauración en modo fallback
    if (backup.data.taller && backup.data.taller[0]) {
      await tallerRepo.upsert(backup.data.taller[0]);
    }
    for (const m of backup.data.mecanicos || []) {
      await mecanicosRepo.create(m);
    }
    for (const c of backup.data.clientes || []) {
      await clientesRepo.create(c);
    }
    for (const v of backup.data.vehiculos || []) {
      await vehiculosRepo.create(v);
    }
    for (const o of backup.data.ordenes_servicio || []) {
      await ordenesRepo.create(o);
    }
    for (const r of backup.data.repuestos_servicio || []) {
      await repuestosRepo.create(r);
    }
  }

  return true;
}

/**
 * Prepara el archivo .db binario en caché para subir a Google Drive.
 */
export async function getLocalDatabaseBackupFileUri(): Promise<string> {
  if (!isSQLiteAvailable()) {
    throw new Error('El archivo binario .db solo está disponible en compilación con soporte nativo SQLite.');
  }
  const db = await getDatabase();
  await db.execAsync('PRAGMA wal_checkpoint(FULL);');

  const dbPath = getDatabaseFilePath();
  const cacheDir = (FileSystem as any).cacheDirectory || '';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetUri = `${cacheDir}taller_backup_${timestamp}.db`;

  const info = await FileSystem.getInfoAsync(dbPath);
  if (!info.exists) {
    throw new Error('El archivo de la base de datos no existe aún.');
  }

  await FileSystem.copyAsync({ from: dbPath, to: targetUri });
  return targetUri;
}

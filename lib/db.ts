import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Edificio } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'consorcio.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// HMR-safe singleton using globalThis
const globalForDb = globalThis as unknown as { __db?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb.__db) {
    globalForDb.__db = new Database(DB_PATH);
    globalForDb.__db.pragma('journal_mode = WAL');
    initSchema(globalForDb.__db);
  }
  return globalForDb.__db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS edificios (
      id TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      direccion TEXT,
      email_remitente TEXT,
      nombre_remitente TEXT NOT NULL,
      ruta_base TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS unidades (
      id TEXT PRIMARY KEY,
      edificio_id TEXT NOT NULL,
      n INTEGER NOT NULL,
      nombre TEXT,
      email_propietario TEXT,
      email_inquilino TEXT,
      depto TEXT,
      tipo TEXT,
      FOREIGN KEY (edificio_id) REFERENCES edificios(id),
      UNIQUE(edificio_id, n)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS envios_log (
      id TEXT PRIMARY KEY,
      edificio_id TEXT NOT NULL,
      tipo_accion TEXT NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_enviados INTEGER DEFAULT 0,
      total_errores INTEGER DEFAULT 0,
      modo_test INTEGER DEFAULT 0,
      FOREIGN KEY (edificio_id) REFERENCES edificios(id)
    )
  `);
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
}

// ============ EDIFICIOS ============

export type { Edificio } from '@/types';

export function getAllEdificios(): Edificio[] {
  const database = getDb();
  return database.prepare('SELECT * FROM edificios ORDER BY nombre').all() as Edificio[];
}

export function getEdificioById(id: string): Edificio | undefined {
  const database = getDb();
  return database.prepare('SELECT * FROM edificios WHERE id = ?').get(id) as Edificio | undefined;
}

export function createEdificio(edificio: Omit<Edificio, 'created_at' | 'updated_at'>): Edificio {
  const database = getDb();
  const now = new Date().toISOString();

  database.prepare(`
    INSERT INTO edificios (id, nombre, direccion, email_remitente, nombre_remitente, ruta_base, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    edificio.id,
    edificio.nombre,
    edificio.direccion,
    edificio.email_remitente,
    edificio.nombre_remitente,
    edificio.ruta_base,
    now,
    now
  );

  // Create building subdirectories (idempotent with recursive)
  const edificioDir = edificio.ruta_base;
  fs.mkdirSync(path.join(edificioDir, 'pdfs'), { recursive: true });
  fs.mkdirSync(path.join(edificioDir, 'logs'), { recursive: true });

  const created = getEdificioById(edificio.id);
  if (!created) {
    throw new Error(`Failed to create edificio: ${edificio.id}`);
  }
  return created;
}

export function updateEdificio(id: string, data: Partial<Omit<Edificio, 'id' | 'created_at' | 'updated_at'>>): Edificio | undefined {
  const database = getDb();
  const existing = getEdificioById(id);
  if (!existing) return undefined;

  const updates: string[] = [];
  const values: (string | null)[] = [];

  if (data.nombre !== undefined) {
    updates.push('nombre = ?');
    values.push(data.nombre);
  }
  if (data.direccion !== undefined) {
    updates.push('direccion = ?');
    values.push(data.direccion);
  }
  if (data.email_remitente !== undefined) {
    updates.push('email_remitente = ?');
    values.push(data.email_remitente);
  }
  if (data.nombre_remitente !== undefined) {
    updates.push('nombre_remitente = ?');
    values.push(data.nombre_remitente);
  }
  if (data.ruta_base !== undefined) {
    updates.push('ruta_base = ?');
    values.push(data.ruta_base);
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    database.prepare(`UPDATE edificios SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  return getEdificioById(id);
}

export function deleteEdificio(id: string): boolean {
  const database = getDb();

  const unidadesCount = database.prepare('SELECT COUNT(*) as count FROM unidades WHERE edificio_id = ?').get(id) as { count: number };
  if (unidadesCount.count > 0) {
    return false;
  }

  const result = database.prepare('DELETE FROM edificios WHERE id = ?').run(id);
  return result.changes > 0;
}

// ============ UNIDADES ============

export interface Unidad {
  id: string;
  edificio_id: string;
  n: number;
  nombre: string | null;
  email_propietario: string | null;
  email_inquilino: string | null;
  depto: string | null;
  tipo: string | null;
}

export function getUnidadesByEdificio(edificioId: string): Unidad[] {
  const database = getDb();
  return database.prepare('SELECT * FROM unidades WHERE edificio_id = ? ORDER BY n').all(edificioId) as Unidad[];
}

export function upsertUnidades(edificioId: string, unidades: Omit<Unidad, 'id' | 'edificio_id'>[]): void {
  const database = getDb();

  const deleteExisting = database.prepare('DELETE FROM unidades WHERE edificio_id = ?');

  const insert = database.prepare(`
    INSERT INTO unidades (id, edificio_id, n, nombre, email_propietario, email_inquilino, depto, tipo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = database.transaction((units: Omit<Unidad, 'id' | 'edificio_id'>[]) => {
    deleteExisting.run(edificioId);
    for (const unit of units) {
      insert.run(
        generateId(`${edificioId}-${unit.n}`),
        edificioId,
        unit.n,
        unit.nombre,
        unit.email_propietario,
        unit.email_inquilino,
        unit.depto,
        unit.tipo
      );
    }
  });

  insertMany(unidades);
}

export function getUnidadesCount(edificioId: string): number {
  const database = getDb();
  const result = database.prepare('SELECT COUNT(*) as count FROM unidades WHERE edificio_id = ?').get(edificioId) as { count: number };
  return result.count;
}

// ============ ENVIOS LOG ============

export interface EnvioLog {
  id: string;
  edificio_id: string;
  tipo_accion: string;
  fecha: string;
  total_enviados: number;
  total_errores: number;
  modo_test: boolean;
}

export function createEnvioLog(log: Omit<EnvioLog, 'id' | 'fecha'>): EnvioLog {
  const database = getDb();
  const id = generateId('log');

  database.prepare(`
    INSERT INTO envios_log (id, edificio_id, tipo_accion, total_enviados, total_errores, modo_test)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    log.edificio_id,
    log.tipo_accion,
    log.total_enviados,
    log.total_errores,
    log.modo_test ? 1 : 0
  );

  return database.prepare('SELECT * FROM envios_log WHERE id = ?').get(id) as EnvioLog;
}

export function getEnviosLogByEdificio(edificioId: string, limit = 50): EnvioLog[] {
  const database = getDb();
  return database.prepare('SELECT * FROM envios_log WHERE edificio_id = ? ORDER BY fecha DESC LIMIT ?').all(edificioId, limit) as EnvioLog[];
}

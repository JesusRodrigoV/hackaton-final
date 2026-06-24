const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'scoring.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.serialize(() => {
      db.run('PRAGMA journal_mode = WAL');
      db.run('PRAGMA synchronous = NORMAL');
    });
  }
});

// Helper wrapper for DB queries using Promises
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize tables
async function initDb() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS buro_cache_local (
      id TEXT PRIMARY KEY,
      ci_usuario TEXT,
      score_buro_tradicional INTEGER,
      fecha_consulta TEXT
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS evaluaciones_scoring (
      id TEXT PRIMARY KEY,
      credito_id TEXT,
      score_final_generado INTEGER,
      shap_values TEXT,
      fecha_evaluacion TEXT
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS datos_alternativos_usuario (
      usuario_id TEXT PRIMARY KEY,
      pago_servicios_al_dia INTEGER,
      compras_ecommerce_mes INTEGER,
      recargas_moviles_promedio REAL
    )
  `);

  console.log('Database tables initialized.');
}

module.exports = {
  dbRun,
  dbGet,
  dbAll,
  initDb
};

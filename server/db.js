import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'garajhub.db');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

const ensureColumn = async (table, column, definition) => {
  const cols = await all(`PRAGMA table_info(${table})`);
  const exists = cols.some((c) => c.name === column);
  if (!exists) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
};

const init = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      name TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'user',
      bio TEXT,
      avatar TEXT,
      portfolio_url TEXT,
      skills TEXT,
      languages TEXT,
      tools TEXT,
      created_at TEXT,
      banned INTEGER DEFAULT 0
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS startups (
      id TEXT PRIMARY KEY,
      nomi TEXT NOT NULL,
      tavsif TEXT,
      category TEXT,
      kerakli_mutaxassislar TEXT,
      logo TEXT,
      egasi_id TEXT,
      egasi_name TEXT,
      status TEXT DEFAULT 'pending_admin',
      yaratilgan_vaqt TEXT,
      a_zolar TEXT,
      tasks TEXT,
      views INTEGER DEFAULT 0,
      github_url TEXT,
      website_url TEXT,
      rejection_reason TEXT,
      FOREIGN KEY (egasi_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS join_requests (
      id TEXT PRIMARY KEY,
      startup_id TEXT,
      startup_name TEXT,
      user_id TEXT,
      user_name TEXT,
      user_phone TEXT,
      specialty TEXT,
      comment TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT,
      FOREIGN KEY (startup_id) REFERENCES startups(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      text TEXT,
      type TEXT DEFAULT 'info',
      is_read INTEGER DEFAULT 0,
      created_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      startup_id TEXT,
      title TEXT,
      description TEXT,
      assigned_to_id TEXT,
      assigned_to_name TEXT,
      deadline TEXT,
      status TEXT DEFAULT 'todo',
      created_at TEXT,
      FOREIGN KEY (startup_id) REFERENCES startups(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      action TEXT,
      entity_type TEXT,
      entity_id TEXT,
      meta TEXT,
      created_at TEXT
    )
  `);

  await ensureColumn('users', 'banned', 'INTEGER DEFAULT 0');

  const existingCategories = await all('SELECT * FROM categories');
  if (existingCategories.length === 0) {
    const defaults = [
      "Fintech",
      "Edtech",
      "AI/ML",
      "E-commerce",
      "SaaS",
      "Blockchain",
      "Healthcare",
      "Cybersecurity",
      "GameDev",
      "Networking",
      "Productivity",
      "Other"
    ];
    for (const name of defaults) {
      await run('INSERT INTO categories (name, created_at) VALUES (?, ?)', [
        name,
        new Date().toISOString()
      ]);
    }
  }
};

export { db, run, get, all, init };

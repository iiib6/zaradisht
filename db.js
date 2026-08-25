import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import dotenv from 'dotenv';

dotenv.config();

const require = createRequire(import.meta.url);
const pg = require('pg');
const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data directory for local fallback (use /tmp on Vercel serverless if needed)
const dataDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (e) {}
}

let pgPool = null;
let isPgConnected = false;

// Check for PostgreSQL (Neon / Cloud Postgres)
const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl && databaseUrl.startsWith('postgres')) {
  try {
    pgPool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // Test connection & initialize PostgreSQL schema
    pgPool.query(`
      CREATE TABLE IF NOT EXISTS analyses (
        id SERIAL PRIMARY KEY,
        quote TEXT,
        analysis TEXT,
        mode VARCHAR(50) DEFAULT 'full',
        tags TEXT,
        device_info TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        analysis_id INTEGER,
        role VARCHAR(20),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reading_progress (
        id SERIAL PRIMARY KEY,
        book_part TEXT,
        current_section TEXT,
        notes TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS custom_glossary (
        id SERIAL PRIMARY KEY,
        term TEXT,
        category TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `).then(() => {
      isPgConnected = true;
      console.log('🐘 تم الاتصال بقاعدة بيانات Neon PostgreSQL السحابية بنجاح!');
    }).catch(err => {
      console.warn('تنبيه تهيئة PostgreSQL:', err.message);
    });

  } catch (err) {
    console.warn('⚠️ فشل الاتصال بـ PostgreSQL:', err.message);
  }
}

// Fallback JSON Store
const jsonDbPath = path.join(dataDir, 'zarathustra_store.json');
function readJsonStore() {
  if (!fs.existsSync(jsonDbPath)) {
    const initial = { analyses: [], chats: [], progress: [], glossary: [] };
    try {
      fs.writeFileSync(jsonDbPath, JSON.stringify(initial, null, 2), 'utf-8');
    } catch (e) {}
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(jsonDbPath, 'utf-8'));
  } catch (e) {
    return { analyses: [], chats: [], progress: [], glossary: [] };
  }
}

function writeJsonStore(data) {
  try {
    fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
}

export const db = {
  async saveAnalysis({ quote, analysis, mode = 'full', tags = '', deviceInfo = '' }) {
    if (pgPool) {
      try {
        const res = await pgPool.query(
          `INSERT INTO analyses (quote, analysis, mode, tags, device_info, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
          [quote, analysis, mode, tags, deviceInfo]
        );
        return res.rows[0];
      } catch (err) {
        console.error('Postgres insert error, using local fallback:', err.message);
      }
    }

    const store = readJsonStore();
    const newItem = {
      id: Date.now(),
      quote,
      analysis,
      mode,
      tags,
      device_info: deviceInfo,
      created_at: new Date().toLocaleString('ar-IQ')
    };
    store.analyses.unshift(newItem);
    writeJsonStore(store);
    return newItem;
  },

  async getAnalyses({ limit = 100, search = '' } = {}) {
    if (pgPool) {
      try {
        if (search) {
          const res = await pgPool.query(
            `SELECT * FROM analyses 
             WHERE quote ILIKE $1 OR analysis ILIKE $1 OR tags ILIKE $1 
             ORDER BY id DESC LIMIT $2`,
            [`%${search}%`, limit]
          );
          return res.rows;
        }
        const res = await pgPool.query(`SELECT * FROM analyses ORDER BY id DESC LIMIT $1`, [limit]);
        return res.rows;
      } catch (err) {
        console.error('Postgres select error, using local fallback:', err.message);
      }
    }

    const store = readJsonStore();
    let list = store.analyses;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => 
        (a.quote && a.quote.toLowerCase().includes(q)) || 
        (a.analysis && a.analysis.toLowerCase().includes(q))
      );
    }
    return list.slice(0, limit);
  },

  async deleteAnalysis(id) {
    if (pgPool) {
      try {
        await pgPool.query(`DELETE FROM analyses WHERE id = $1`, [id]);
        return true;
      } catch (err) {
        console.error('Postgres delete error:', err.message);
      }
    }

    const store = readJsonStore();
    store.analyses = store.analyses.filter(a => a.id !== Number(id));
    writeJsonStore(store);
    return true;
  },

  async saveChat({ analysisId = 0, role, content }) {
    if (pgPool) {
      try {
        const res = await pgPool.query(
          `INSERT INTO chats (analysis_id, role, content, created_at)
           VALUES ($1, $2, $3, NOW()) RETURNING *`,
          [analysisId, role, content]
        );
        return res.rows[0];
      } catch (err) {
        console.error('Postgres chat insert error:', err.message);
      }
    }

    const store = readJsonStore();
    const newMsg = { id: Date.now(), analysis_id: analysisId, role, content, created_at: new Date().toISOString() };
    store.chats.push(newMsg);
    writeJsonStore(store);
    return newMsg;
  },

  async getStats() {
    let count = 0;
    let type = 'JSON Store (محلي)';

    if (pgPool) {
      try {
        const res = await pgPool.query(`SELECT COUNT(*) as count FROM analyses`);
        count = parseInt(res.rows[0].count, 10);
        type = 'Neon PostgreSQL (سحابي متزامن 🐘)';
      } catch (e) {}
    } else {
      const store = readJsonStore();
      count = store.analyses.length;
    }

    return {
      totalAnalyses: count,
      databaseType: type,
      isCloud: Boolean(pgPool)
    };
  }
};

'use strict';
const fs = require('fs');
const path = require('path');
const paths = require('./paths');

let SQL = null;
async function getSQL() {
  if (!SQL) {
    const sqljs = require('sql.js');
    SQL = await sqljs();
  }
  return SQL;
}

function rowsFromExec(res) {
  if (!res || !res.length) return [];
  const { columns, values } = res[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((c, i) => (obj[c] = row[i]));
    return obj;
  });
}

async function openStateDb() {
  const SQLi = await getSQL();
  const buf = fs.readFileSync(paths.stateDb);
  return new SQLi.Database(buf);
}

// 读取 threads 表（元数据 + 累计 tokens_used）
async function getThreads() {
  let db;
  try {
    db = await openStateDb();
  } catch (e) {
    return [];
  }
  try {
    const res = db.exec(
      `SELECT id, rollout_path, title, model, model_provider, cwd,
              tokens_used, agent_role, agent_nickname, cli_version,
              created_at, updated_at, created_at_ms, updated_at_ms,
              thread_source, first_user_message
       FROM threads`
    );
    return rowsFromExec(res);
  } finally {
    db.close();
  }
}

async function getSpawnEdges() {
  let db;
  try {
    db = await openStateDb();
  } catch (e) {
    return [];
  }
  try {
    const res = db.exec(
      `SELECT parent_thread_id, child_thread_id, status FROM thread_spawn_edges`
    );
    return rowsFromExec(res);
  } finally {
    db.close();
  }
}

module.exports = { getThreads, getSpawnEdges };

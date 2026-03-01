import express from 'express';
import cors from 'cors';
import { init, run, get, all } from './db.js';

const app = express();
const PORT = process.env.PORT || 5174;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const parseJson = (value, fallback = []) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const logAction = async (actorId, action, entityType, entityId, meta = {}) => {
  if (!actorId) return;
  await run(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      `a_${Date.now()}`,
      actorId,
      action,
      entityType,
      entityId,
      JSON.stringify(meta),
      new Date().toISOString()
    ]
  );
};

const mapUser = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    name: row.name,
    phone: row.phone,
    role: row.role,
    bio: row.bio,
    avatar: row.avatar,
    portfolio_url: row.portfolio_url,
    skills: parseJson(row.skills),
    languages: parseJson(row.languages),
    tools: parseJson(row.tools),
    created_at: row.created_at,
    banned: row.banned === 1
  };
};

const mapStartup = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    nomi: row.nomi,
    tavsif: row.tavsif,
    category: row.category,
    kerakli_mutaxassislar: parseJson(row.kerakli_mutaxassislar),
    logo: row.logo,
    egasi_id: row.egasi_id,
    egasi_name: row.egasi_name,
    status: row.status,
    yaratilgan_vaqt: row.yaratilgan_vaqt,
    a_zolar: parseJson(row.a_zolar),
    tasks: parseJson(row.tasks),
    views: row.views || 0,
    github_url: row.github_url || '',
    website_url: row.website_url || '',
    rejection_reason: row.rejection_reason || null
  };
};

const mapJoinRequest = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    startup_id: row.startup_id,
    startup_name: row.startup_name,
    user_id: row.user_id,
    user_name: row.user_name,
    user_phone: row.user_phone,
    specialty: row.specialty,
    comment: row.comment,
    status: row.status,
    created_at: row.created_at
  };
};

const mapNotification = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    title: row.title,
    text: row.text,
    type: row.type,
    is_read: row.is_read === 1,
    created_at: row.created_at
  };
};

const mapTask = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    startup_id: row.startup_id,
    title: row.title,
    description: row.description,
    assigned_to_id: row.assigned_to_id,
    assigned_to_name: row.assigned_to_name,
    deadline: row.deadline,
    status: row.status,
    created_at: row.created_at
  };
};

const buildUpdate = (body, jsonFields = []) => {
  const fields = [];
  const values = [];
  Object.keys(body || {}).forEach((key) => {
    if (key === 'id') return;
    fields.push(`${key} = ?`);
    if (jsonFields.includes(key)) {
      values.push(JSON.stringify(body[key] || []));
    } else {
      values.push(body[key]);
    }
  });
  return { fields, values };
};

app.get('/api/health', async (req, res) => {
  res.json({ ok: true });
});

app.get('/api/stats', async (req, res) => {
  const users = await get('SELECT COUNT(*) as count FROM users');
  const startups = await get('SELECT COUNT(*) as count FROM startups');
  const pending = await get('SELECT COUNT(*) as count FROM startups WHERE status = "pending_admin"');
  const requests = await get('SELECT COUNT(*) as count FROM join_requests WHERE status = "pending"');
  const notifications = await get('SELECT COUNT(*) as count FROM notifications');
  res.json({
    users: users?.count || 0,
    startups: startups?.count || 0,
    pending_startups: pending?.count || 0,
    join_requests: requests?.count || 0,
    notifications: notifications?.count || 0
  });
});

// Users
app.get('/api/users', async (req, res) => {
  const rows = await all('SELECT * FROM users');
  res.json(rows.map(mapUser));
});

app.get('/api/users/:id', async (req, res) => {
  const row = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).send('User not found');
  res.json(mapUser(row));
});

app.get('/api/users/by-email', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send('Email required');
  const row = await get('SELECT * FROM users WHERE email = ?', [email]);
  res.json(mapUser(row));
});

app.post('/api/users', async (req, res) => {
  const u = req.body;
  await run(
    `INSERT INTO users (id, email, password, name, phone, role, bio, avatar, portfolio_url, skills, languages, tools, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      u.id,
      u.email,
      u.password || '',
      u.name,
      u.phone || '',
      u.role || 'user',
      u.bio || '',
      u.avatar || '',
      u.portfolio_url || '',
      JSON.stringify(u.skills || []),
      JSON.stringify(u.languages || []),
      JSON.stringify(u.tools || []),
      u.created_at || new Date().toISOString()
    ]
  );
  const created = await get('SELECT * FROM users WHERE id = ?', [u.id]);
  res.status(201).json(mapUser(created));
});

app.put('/api/users/:id', async (req, res) => {
  const { fields, values } = buildUpdate(req.body, ['skills', 'languages', 'tools']);
  if (fields.length === 0) return res.status(400).send('No fields to update');
  values.push(req.params.id);
  await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  const updated = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  res.json(mapUser(updated));
});

app.put('/api/users/:id/role', async (req, res) => {
  const role = req.body?.role;
  if (!role) return res.status(400).send('role required');
  await run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
  const updated = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  await logAction(req.body?.actor_id, 'update_role', 'user', req.params.id, { role });
  res.json(mapUser(updated));
});

app.put('/api/users/:id/ban', async (req, res) => {
  const banned = req.body?.banned ? 1 : 0;
  await run('UPDATE users SET banned = ? WHERE id = ?', [banned, req.params.id]);
  const updated = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  await logAction(req.body?.actor_id, banned ? 'ban_user' : 'unban_user', 'user', req.params.id);
  res.json(mapUser(updated));
});

app.delete('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  await run('DELETE FROM join_requests WHERE user_id = ?', [userId]);
  await run('DELETE FROM notifications WHERE user_id = ?', [userId]);
  const startups = await all('SELECT * FROM startups');
  for (const s of startups) {
    const members = parseJson(s.a_zolar);
    const filtered = members.filter((m) => m.user_id !== userId);
    if (filtered.length !== members.length) {
      await run('UPDATE startups SET a_zolar = ? WHERE id = ?', [JSON.stringify(filtered), s.id]);
    }
  }
  await run('DELETE FROM users WHERE id = ?', [userId]);
  await logAction(req.query?.actor_id, 'delete_user', 'user', userId);
  res.status(204).end();
});

// Startups
app.get('/api/startups', async (req, res) => {
  const rows = await all('SELECT * FROM startups');
  res.json(rows.map(mapStartup));
});

app.post('/api/startups', async (req, res) => {
  const s = req.body;
  await run(
    `INSERT INTO startups (id, nomi, tavsif, category, kerakli_mutaxassislar, logo, egasi_id, egasi_name, status, yaratilgan_vaqt, a_zolar, tasks, views, github_url, website_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.id,
      s.nomi,
      s.tavsif,
      s.category,
      JSON.stringify(s.kerakli_mutaxassislar || []),
      s.logo,
      s.egasi_id,
      s.egasi_name,
      s.status || 'pending_admin',
      s.yaratilgan_vaqt || new Date().toISOString(),
      JSON.stringify(s.a_zolar || []),
      JSON.stringify(s.tasks || []),
      s.views || 0,
      s.github_url || '',
      s.website_url || ''
    ]
  );
  const created = await get('SELECT * FROM startups WHERE id = ?', [s.id]);
  res.status(201).json(mapStartup(created));
});

app.put('/api/startups/:id', async (req, res) => {
  const { fields, values } = buildUpdate(req.body, ['kerakli_mutaxassislar', 'a_zolar', 'tasks']);
  if (fields.length === 0) return res.status(400).send('No fields to update');
  values.push(req.params.id);
  await run(`UPDATE startups SET ${fields.join(', ')} WHERE id = ?`, values);
  const updated = await get('SELECT * FROM startups WHERE id = ?', [req.params.id]);
  res.json(mapStartup(updated));
});

app.put('/api/startups/:id/status', async (req, res) => {
  const status = req.body?.status;
  if (!status) return res.status(400).send('status required');
  await run('UPDATE startups SET status = ?, rejection_reason = ? WHERE id = ?', [
    status,
    req.body?.rejection_reason || null,
    req.params.id
  ]);
  const updated = await get('SELECT * FROM startups WHERE id = ?', [req.params.id]);
  await logAction(req.body?.actor_id, 'update_startup_status', 'startup', req.params.id, {
    status,
    rejection_reason: req.body?.rejection_reason || null
  });
  res.json(mapStartup(updated));
});

app.delete('/api/startups/:id', async (req, res) => {
  const id = req.params.id;
  await run('DELETE FROM startups WHERE id = ?', [id]);
  await run('DELETE FROM tasks WHERE startup_id = ?', [id]);
  await run('DELETE FROM join_requests WHERE startup_id = ?', [id]);
  await logAction(req.query?.actor_id, 'delete_startup', 'startup', id);
  res.status(204).end();
});

// Join Requests
app.get('/api/join-requests', async (req, res) => {
  const status = req.query.status;
  const rows = status
    ? await all('SELECT * FROM join_requests WHERE status = ?', [status])
    : await all('SELECT * FROM join_requests');
  res.json(rows.map(mapJoinRequest));
});

app.post('/api/join-requests', async (req, res) => {
  const r = req.body;
  await run(
    `INSERT INTO join_requests (id, startup_id, startup_name, user_id, user_name, user_phone, specialty, comment, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      r.id,
      r.startup_id,
      r.startup_name,
      r.user_id,
      r.user_name,
      r.user_phone,
      r.specialty,
      r.comment,
      r.status || 'pending',
      r.created_at || new Date().toISOString()
    ]
  );
  const created = await get('SELECT * FROM join_requests WHERE id = ?', [r.id]);
  res.status(201).json(mapJoinRequest(created));
});

app.put('/api/join-requests/:id/status', async (req, res) => {
  const status = req.body?.status;
  if (!status) return res.status(400).send('Status required');
  await run('UPDATE join_requests SET status = ? WHERE id = ?', [status, req.params.id]);
  const updated = await get('SELECT * FROM join_requests WHERE id = ?', [req.params.id]);
  res.json(mapJoinRequest(updated));
});

app.delete('/api/join-requests/:id', async (req, res) => {
  await run('DELETE FROM join_requests WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

// Notifications
app.get('/api/notifications', async (req, res) => {
  const userId = req.query.userId;
  let rows = [];
  if (userId && userId !== 'all') {
    rows = await all('SELECT * FROM notifications WHERE user_id = ? OR user_id = "admin" ORDER BY created_at DESC', [userId]);
  } else {
    rows = await all('SELECT * FROM notifications ORDER BY created_at DESC');
  }
  res.json(rows.map(mapNotification));
});

app.post('/api/notifications', async (req, res) => {
  const n = req.body;
  await run(
    `INSERT INTO notifications (id, user_id, title, text, type, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      n.id,
      n.user_id,
      n.title,
      n.text,
      n.type || 'info',
      n.is_read ? 1 : 0,
      n.created_at || new Date().toISOString()
    ]
  );
  const created = await get('SELECT * FROM notifications WHERE id = ?', [n.id]);
  res.status(201).json(mapNotification(created));
});

app.put('/api/notifications/:id/read', async (req, res) => {
  await run('UPDATE notifications SET is_read = 1 WHERE id = ?', [req.params.id]);
  const updated = await get('SELECT * FROM notifications WHERE id = ?', [req.params.id]);
  res.json(mapNotification(updated));
});

app.put('/api/notifications/mark-all-read', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).send('userId required');
  await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  res.status(204).end();
});

// Tasks
app.post('/api/tasks', async (req, res) => {
  const t = req.body;
  await run(
    `INSERT INTO tasks (id, startup_id, title, description, assigned_to_id, assigned_to_name, deadline, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      t.id,
      t.startup_id,
      t.title,
      t.description,
      t.assigned_to_id,
      t.assigned_to_name,
      t.deadline || '',
      t.status || 'todo',
      t.created_at || new Date().toISOString()
    ]
  );
  const created = await get('SELECT * FROM tasks WHERE id = ?', [t.id]);
  res.status(201).json(mapTask(created));
});

app.put('/api/tasks/:id/status', async (req, res) => {
  const status = req.body?.status;
  if (!status) return res.status(400).send('Status required');
  await run('UPDATE tasks SET status = ? WHERE id = ?', [status, req.params.id]);
  const updated = await get('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
  res.json(mapTask(updated));
});

app.delete('/api/tasks/:id', async (req, res) => {
  await run('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

// Categories
app.get('/api/categories', async (req, res) => {
  const rows = await all('SELECT * FROM categories ORDER BY name ASC');
  res.json(rows);
});

app.post('/api/categories', async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).send('name required');
  await run('INSERT INTO categories (name, created_at) VALUES (?, ?)', [name, new Date().toISOString()]);
  const created = await get('SELECT * FROM categories WHERE name = ?', [name]);
  await logAction(req.body?.actor_id, 'create_category', 'category', String(created?.id), { name });
  res.status(201).json(created);
});

app.delete('/api/categories/:id', async (req, res) => {
  const id = req.params.id;
  await run('DELETE FROM categories WHERE id = ?', [id]);
  await logAction(req.query?.actor_id, 'delete_category', 'category', id);
  res.status(204).end();
});

// Audit logs
app.get('/api/audit-logs', async (req, res) => {
  const limit = Math.min(parseInt(req.query?.limit || '50', 10), 200);
  const rows = await all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?', [limit]);
  res.json(rows.map((r) => ({
    id: r.id,
    actor_id: r.actor_id,
    action: r.action,
    entity_type: r.entity_type,
    entity_id: r.entity_id,
    meta: parseJson(r.meta, {}),
    created_at: r.created_at
  })));
});

const start = async () => {
  await init();
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
};

start();

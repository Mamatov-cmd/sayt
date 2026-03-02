import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { init, run, get, all } from './db.js';

const app = express();
const PORT = process.env.PORT || 5174;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

const parseJson = (value, fallback = []) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const toBool = (value) => value === 1 || value === '1' || value === true;

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
    banner: row.banner || '',
    portfolio_url: row.portfolio_url,
    cv_data: row.cv_data || '',
    cv_file_name: row.cv_file_name || '',
    cv_mime: row.cv_mime || '',
    cv_size: Number(row.cv_size || 0),
    cv_updated_at: row.cv_updated_at || null,
    skills: parseJson(row.skills),
    languages: parseJson(row.languages),
    tools: parseJson(row.tools),
    created_at: row.created_at,
    banned: toBool(row.banned),
    is_pro: toBool(row.is_pro),
    pro_status: row.pro_status || 'free',
    pro_updated_at: row.pro_updated_at || null
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
    rejection_reason: row.rejection_reason || null,
    segment: row.segment || 'IT asoschi + dasturchi',
    template_key: row.template_key || '',
    template_name: row.template_name || '',
    lifecycle_status: row.lifecycle_status || 'live',
    success_fee_percent: row.success_fee_percent ?? 1.5,
    registry_notes: row.registry_notes || ''
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
    is_read: toBool(row.is_read),
    meta: parseJson(row.meta, null),
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
    priority: row.priority || 'medium',
    estimate_hours: Number(row.estimate_hours || 0),
    actual_hours: Number(row.actual_hours || 0),
    calendar_tag: row.calendar_tag || '',
    created_by: row.created_by || '',
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at
  };
};

const mapProPaymentRequest = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    user_name: row.user_name,
    sender_full_name: row.sender_full_name,
    sender_card_number: row.sender_card_number,
    receipt_image: row.receipt_image,
    status: row.status,
    admin_note: row.admin_note || '',
    reviewed_by: row.reviewed_by || null,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at || null
  };
};

const mapStartupChatMessage = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    startup_id: row.startup_id,
    sender_id: row.sender_id,
    sender_name: row.sender_name,
    message_type: row.message_type || 'text',
    content: row.content || '',
    file_name: row.file_name || '',
    file_url: row.file_url || '',
    created_at: row.created_at
  };
};

const mapStartupInvitation = (row) => {
  if (!row) return null;
  return {
    id: row.id,
    startup_id: row.startup_id,
    startup_name: row.startup_name,
    inviter_id: row.inviter_id,
    inviter_name: row.inviter_name,
    invitee_id: row.invitee_id,
    invitee_name: row.invitee_name,
    role_hint: row.role_hint || '',
    status: row.status || 'pending',
    notification_id: row.notification_id || null,
    created_at: row.created_at,
    responded_at: row.responded_at || null
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

const nowIso = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const toBoolInt = (value) => (value ? 1 : 0);

const STARTUP_TEMPLATES = [
  {
    key: 'it_mvp',
    name: 'IT MVP',
    segment: 'IT asoschisi + dasturchi',
    description: "Tez MVP chiqish uchun bazaviy texnik tarkib va sprint vazifalari.",
    specialists: ['Frontend', 'Backend', 'UI/UX', 'QA'],
    default_tasks: [
      { title: 'MVP scope aniqlash', description: "Asosiy 3-5 funksiyani muzlatish.", days_offset: 2, priority: 'high', estimate_hours: 8, calendar_tag: 'planning' },
      { title: 'Dizayn prototipi', description: "Figma oqimi va asosiy ekranlar.", days_offset: 5, priority: 'high', estimate_hours: 12, calendar_tag: 'design' },
      { title: 'Backend API skeleti', description: "Auth, startup, task endpointlar.", days_offset: 8, priority: 'medium', estimate_hours: 16, calendar_tag: 'development' },
      { title: 'Frontend integratsiya', description: "Asosiy sahifalarni API bilan boglash.", days_offset: 12, priority: 'medium', estimate_hours: 20, calendar_tag: 'development' },
      { title: 'Demo va test', description: "Smoke test va birinchi demo tayyorlash.", days_offset: 15, priority: 'high', estimate_hours: 10, calendar_tag: 'release' }
    ]
  },
  {
    key: 'saas_b2b',
    name: 'SaaS B2B',
    segment: 'SaaS',
    description: "B2B SaaS uchun sotuv pipeline va product validatsiya shabloni.",
    specialists: ['Product manager', 'Backend', 'Frontend', 'Sotuv'],
    default_tasks: [
      { title: 'ICP va pain point', description: "Asosiy mijoz segmentini yozib chiqish.", days_offset: 3, priority: 'high', estimate_hours: 6, calendar_tag: 'planning' },
      { title: 'Onboarding flow', description: "Ro'yxatdan o'tish va trial oqimi.", days_offset: 7, priority: 'high', estimate_hours: 14, calendar_tag: 'product' },
      { title: 'Billing integratsiya', description: "Pro tolov va plan boshqaruvi.", days_offset: 11, priority: 'medium', estimate_hours: 10, calendar_tag: 'billing' },
      { title: 'Sales pipeline', description: "Lead -> call -> proposal bosqichlari.", days_offset: 14, priority: 'medium', estimate_hours: 8, calendar_tag: 'sales' }
    ]
  },
  {
    key: 'ai_product',
    name: 'AI Mahsulot',
    segment: "Sun'iy intellekt / ML",
    description: "AI mahsulot uchun data, model va release boshqaruv shabloni.",
    specialists: ['ML muhandis', 'Backend', 'Frontend', 'Prompt muhandis'],
    default_tasks: [
      { title: 'Data manbalarini yigish', description: "Model uchun zarur datasetni tayyorlash.", days_offset: 4, priority: 'high', estimate_hours: 14, calendar_tag: 'data' },
      { title: 'Model baseline', description: "Birinchi model va metrikalarni chiqarish.", days_offset: 9, priority: 'high', estimate_hours: 16, calendar_tag: 'ml' },
      { title: 'Inference API', description: "Modeldan javob beruvchi endpoint.", days_offset: 12, priority: 'medium', estimate_hours: 12, calendar_tag: 'development' },
      { title: 'Monitoring va feedback', description: "Xato logi va foydalanuvchi feedback oqimi.", days_offset: 16, priority: 'medium', estimate_hours: 10, calendar_tag: 'ops' }
    ]
  }
];

const normalizeTaskPriority = (value) => {
  const v = String(value || '').toLowerCase().trim();
  if (['low', 'medium', 'high', 'critical'].includes(v)) return v;
  return 'medium';
};

const normalizeTaskStatus = (value) => {
  const v = String(value || '').toLowerCase().trim();
  if (['todo', 'in-progress', 'done'].includes(v)) return v;
  return 'todo';
};

const getTemplateByKey = (value) => {
  const key = String(value || '').trim();
  if (!key) return null;
  return STARTUP_TEMPLATES.find((t) => t.key === key) || null;
};

const isStartupMember = (startup, userId) => {
  if (!startup || !userId) return false;
  if (startup.egasi_id === userId) return true;
  return (startup.a_zolar || []).some((m) => m.user_id === userId);
};

const getPlatformConfig = async () => {
  const platform = await get('SELECT * FROM platform_settings WHERE id = 1');
  const billing = await get('SELECT * FROM billing_settings WHERE id = 1');
  return {
    pro_enabled: (platform?.pro_enabled ?? 1) === 1,
    plan_name: platform?.plan_name || 'GarajHub Pro',
    price_text: platform?.price_text || '149 000 UZS / oy',
    startup_limit_free: Number(platform?.startup_limit_free ?? 1),
    card_holder: billing?.card_holder || '',
    card_number: billing?.card_number || '',
    bank_name: billing?.bank_name || '',
    receipt_note: billing?.receipt_note || 'Chek rasmini yuklang'
  };
};

const canUseProRestrictions = async () => {
  const platform = await get('SELECT pro_enabled FROM platform_settings WHERE id = 1');
  return (platform?.pro_enabled ?? 1) === 1;
};

const ensureWorkspace = async (startupId, createdBy = 'system') => {
  const existing = await get('SELECT * FROM workspaces WHERE startup_id = ?', [startupId]);
  if (existing) return existing;
  const created_at = nowIso();
  await run(
    `INSERT INTO workspaces (id, startup_id, created_by, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [makeId('ws'), startupId, createdBy, 'active', created_at, created_at]
  );
  return get('SELECT * FROM workspaces WHERE startup_id = ?', [startupId]);
};

const safeDate = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d;
};

const daysDiff = (from, to = new Date()) => {
  const a = safeDate(from);
  if (!a) return 999;
  const ms = to.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toDateOnly = (value) => {
  if (!value) return '';
  const d = safeDate(value);
  if (!d) return '';
  return d.toISOString().slice(0, 10);
};

const startOfDay = (value = new Date()) => {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (value = new Date()) => {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
};

const buildCalendarSummary = (tasks) => {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfDay(new Date(todayStart.getTime() + 6 * 24 * 60 * 60 * 1000));
  const nextWeekEnd = endOfDay(new Date(todayStart.getTime() + 13 * 24 * 60 * 60 * 1000));

  let overdue = 0;
  let today = 0;
  let thisWeek = 0;
  let nextWeek = 0;
  let noDeadline = 0;

  const events = tasks
    .filter((task) => !!task.deadline)
    .map((task) => {
      const deadline = safeDate(task.deadline);
      const daysLeft = deadline ? Math.ceil((startOfDay(deadline).getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000)) : null;
      return {
        ...task,
        days_left: daysLeft,
        is_overdue: !!(deadline && deadline < todayStart && task.status !== 'done'),
        deadline_date: toDateOnly(task.deadline)
      };
    })
    .sort((a, b) => {
      const ad = safeDate(a.deadline)?.getTime() || 0;
      const bd = safeDate(b.deadline)?.getTime() || 0;
      return ad - bd;
    });

  for (const task of tasks) {
    if (!task.deadline) {
      noDeadline += 1;
      continue;
    }
    const deadline = safeDate(task.deadline);
    if (!deadline) continue;
    if (task.status !== 'done' && deadline < todayStart) overdue += 1;
    if (deadline >= todayStart && deadline <= todayEnd) today += 1;
    if (deadline >= todayStart && deadline <= weekEnd) thisWeek += 1;
    if (deadline > weekEnd && deadline <= nextWeekEnd) nextWeek += 1;
  }

  return {
    summary: {
      overdue,
      today,
      this_week: thisWeek,
      next_week: nextWeek,
      no_deadline: noDeadline,
      total_with_deadline: events.length
    },
    events
  };
};

const syncStartupTasks = async (startupId) => {
  if (!startupId) return [];
  const rows = await all('SELECT * FROM tasks WHERE startup_id = ? ORDER BY created_at DESC', [startupId]);
  const mapped = rows.map(mapTask);
  await run('UPDATE startups SET tasks = ? WHERE id = ?', [JSON.stringify(mapped), startupId]);
  return mapped;
};

const buildWorkspaceInsights = ({ startup, tasks, decisions, memberVotes, activities }) => {
  const now = new Date();
  const weekStart = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  const weekEnd = endOfDay(now);

  const taskRows = Array.isArray(tasks) ? tasks : [];
  const activityRows = Array.isArray(activities) ? activities : [];
  const members = startup?.a_zolar || [];
  const memberNameMap = Object.fromEntries(members.map((m) => [m.user_id, m.name]));

  const todoCount = taskRows.filter((t) => t.status === 'todo').length;
  const inProgressCount = taskRows.filter((t) => t.status === 'in-progress').length;
  const doneCount = taskRows.filter((t) => t.status === 'done').length;
  const blockedCount = taskRows.filter((t) => t.status === 'blocked').length;
  const totalTasks = taskRows.length;

  const overdueCount = taskRows.filter((t) => {
    const deadline = safeDate(t.deadline);
    return !!(deadline && deadline < startOfDay(now) && t.status !== 'done');
  }).length;
  const dueThisWeekCount = taskRows.filter((t) => {
    const deadline = safeDate(t.deadline);
    return !!(deadline && deadline >= weekStart && deadline <= weekEnd);
  }).length;

  const completionRate = totalTasks ? doneCount / totalTasks : 0;
  const estimateTotal = taskRows.reduce((acc, task) => acc + Number(task.estimate_hours || 0), 0);
  const actualTotal = taskRows.reduce((acc, task) => acc + Number(task.actual_hours || 0), 0);
  const burnRatio = estimateTotal > 0 ? actualTotal / estimateTotal : 0;

  const recentActivities = activityRows.filter((act) => {
    const created = safeDate(act.created_at);
    return !!(created && created >= weekStart && created <= weekEnd);
  });
  const activeMemberIds = new Set(recentActivities.map((act) => act.user_id).filter(Boolean));

  const taskCompletedActivity = recentActivities.filter((act) => {
    if (act.activity_type !== 'task_status_changed') return false;
    const payload = parseJson(act.payload, {});
    return payload?.status === 'done';
  }).length;

  const contributionMap = {};
  for (const act of recentActivities) {
    const key = act.user_id || 'system';
    if (!contributionMap[key]) {
      contributionMap[key] = {
        user_id: key,
        user_name: memberNameMap[key] || key,
        actions: 0,
        hours: 0
      };
    }
    contributionMap[key].actions += 1;
    contributionMap[key].hours += Number(act.hours_spent || 0);
  }
  const topContributors = Object.values(contributionMap)
    .sort((a, b) => (b.actions + b.hours) - (a.actions + a.hours))
    .slice(0, 5)
    .map((item) => ({
      ...item,
      hours: Number(item.hours.toFixed(1))
    }));

  const calendar = buildCalendarSummary(taskRows);
  const nextPriorities = [
    ...taskRows
      .filter((t) => {
        const deadline = safeDate(t.deadline);
        return t.status !== 'done' && deadline && deadline <= endOfDay(new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000));
      })
      .sort((a, b) => {
        const ad = safeDate(a.deadline)?.getTime() || 0;
        const bd = safeDate(b.deadline)?.getTime() || 0;
        return ad - bd;
      })
      .slice(0, 5)
      .map((t) => t.title),
    ...taskRows
      .filter((t) => t.status === 'blocked')
      .slice(0, 3)
      .map((t) => `${t.title} (bloklangan)`)
  ].slice(0, 6);

  const highlights = [];
  highlights.push(`Jami vazifa: ${totalTasks}, bajarilgan: ${doneCount}, jarayonda: ${inProgressCount}.`);
  highlights.push(`Haftalik completion: ${Math.round(completionRate * 100)}%, muddati o'tgani: ${overdueCount} ta.`);
  highlights.push(`So'nggi 7 kun faol a'zolar: ${activeMemberIds.size}/${members.length || 1}.`);
  if (taskCompletedActivity > 0) highlights.push(`So'nggi 7 kunda ${taskCompletedActivity} ta vazifa yakunlandi.`);
  if (blockedCount > 0) highlights.push(`Bloklangan vazifalar bor: ${blockedCount} ta.`);
  if (estimateTotal > 0) highlights.push(`Vaqt sarfi nisbati: ${Math.round(burnRatio * 100)}% (${actualTotal.toFixed(1)}h / ${estimateTotal.toFixed(1)}h).`);

  return {
    kpi: {
      tasks_total: totalTasks,
      tasks_todo: todoCount,
      tasks_in_progress: inProgressCount,
      tasks_done: doneCount,
      tasks_blocked: blockedCount,
      overdue_tasks: overdueCount,
      due_this_week: dueThisWeekCount,
      completion_rate: Number((completionRate * 100).toFixed(1)),
      active_members_7d: activeMemberIds.size,
      members_total: members.length,
      open_decisions: Array.isArray(decisions) ? decisions.filter((d) => d.status === 'open').length : 0,
      open_member_votes: Array.isArray(memberVotes) ? memberVotes.filter((v) => v.status === 'open').length : 0,
      estimated_hours: Number(estimateTotal.toFixed(1)),
      actual_hours: Number(actualTotal.toFixed(1)),
      burn_ratio: Number((burnRatio * 100).toFixed(1))
    },
    weekly_report: {
      generated_at: now.toISOString(),
      period_start: weekStart.toISOString(),
      period_end: weekEnd.toISOString(),
      highlights,
      top_contributors: topContributors,
      next_priorities: nextPriorities
    },
    calendar_summary: calendar.summary
  };
};

const buildStartupReputationGraph = async (startupId) => {
  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return { members: [], edges: [] };

  const startup = mapStartup(startupRow);
  const members = startup.a_zolar || [];
  const memberIds = members.map((m) => m.user_id);
  if (memberIds.length === 0) return { members: [], edges: [] };

  const reviews = await all(
    `SELECT * FROM peer_reviews WHERE startup_id = ? ORDER BY created_at DESC`,
    [startupId]
  );

  const taskRows = await all(
    `SELECT assigned_to_id, COUNT(*) as total,
            SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done_count
     FROM tasks
     WHERE startup_id = ?
     GROUP BY assigned_to_id`,
    [startupId]
  );
  const taskStats = Object.fromEntries(
    taskRows.map((r) => [
      r.assigned_to_id,
      { total: r.total || 0, done: r.done_count || 0 }
    ])
  );

  const activityRows = await all(
    `SELECT user_id, SUM(hours_spent) as hours, MAX(created_at) as last_activity
     FROM workspace_activity
     WHERE startup_id = ?
     GROUP BY user_id`,
    [startupId]
  );
  const activityMap = Object.fromEntries(
    activityRows.map((r) => [r.user_id, { hours: r.hours || 0, last_activity: r.last_activity }])
  );

  const memberMetrics = members.map((member) => {
    const received = reviews.filter((r) => r.to_user_id === member.user_id);
    const avgRating = received.length
      ? received.reduce((acc, r) => acc + (r.rating || 0), 0) / received.length
      : 0;
    const avgDelivery = received.length
      ? received.reduce((acc, r) => acc + (r.task_delivery || 0), 0) / received.length
      : 0;
    const avgCollab = received.length
      ? received.reduce((acc, r) => acc + (r.collaboration || 0), 0) / received.length
      : 0;
    const avgReliability = received.length
      ? received.reduce((acc, r) => acc + (r.reliability || 0), 0) / received.length
      : 0;

    const task = taskStats[member.user_id] || { total: 0, done: 0 };
    const completionRate = task.total > 0 ? task.done / task.total : 0.5;
    const activity = activityMap[member.user_id] || { hours: 0, last_activity: null };

    const rawScore =
      avgRating * 12 +
      completionRate * 30 +
      (avgDelivery / 5) * 12 +
      (avgCollab / 5) * 10 +
      (avgReliability / 5) * 12 +
      Math.min(activity.hours, 40) / 40 * 14 +
      (startup.lifecycle_status === 'live' ? 10 : startup.lifecycle_status === 'acquired' ? 14 : 4);

    return {
      user_id: member.user_id,
      user_name: member.name,
      role: member.role || 'Contributor',
      joined_at: member.joined_at,
      avg_rating: Number(avgRating.toFixed(2)),
      reviews_count: received.length,
      completion_rate: Number((completionRate * 100).toFixed(1)),
      activity_hours: Number((activity.hours || 0).toFixed(1)),
      last_activity: activity.last_activity || member.joined_at || startup.yaratilgan_vaqt,
      score: Math.round(clamp(rawScore, 0, 100))
    };
  });

  const edgeMap = {};
  for (const review of reviews) {
    const key = `${review.from_user_id}__${review.to_user_id}`;
    if (!edgeMap[key]) {
      edgeMap[key] = {
        source: review.from_user_id,
        target: review.to_user_id,
        interactions: 0,
        rating_total: 0
      };
    }
    edgeMap[key].interactions += 1;
    edgeMap[key].rating_total += review.rating || 0;
  }
  const edges = Object.values(edgeMap).map((e) => ({
    source: e.source,
    target: e.target,
    interactions: e.interactions,
    avg_rating: Number((e.rating_total / Math.max(1, e.interactions)).toFixed(2)),
    strength: Math.round(clamp(((e.interactions * 0.6) + (e.rating_total / Math.max(1, e.interactions))), 1, 10))
  }));

  return {
    members: memberMetrics.sort((a, b) => b.score - a.score),
    edges
  };
};

const buildUserReputationSummary = async (userId) => {
  const user = await get('SELECT id, name FROM users WHERE id = ?', [userId]);
  if (!user) return null;

  const startupsRows = await all('SELECT * FROM startups');
  const collaborationStartups = startupsRows
    .map((row) => mapStartup(row))
    .filter((s) => (s.a_zolar || []).some((m) => m.user_id === userId));

  const peerReviews = await all('SELECT * FROM peer_reviews WHERE to_user_id = ?', [userId]);
  const outboundReviews = await all('SELECT * FROM peer_reviews WHERE from_user_id = ?', [userId]);
  const tasks = await all('SELECT * FROM tasks WHERE assigned_to_id = ?', [userId]);
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const completionRate = tasks.length ? doneTasks / tasks.length : 0;

  const avgRating = peerReviews.length
    ? peerReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / peerReviews.length
    : 0;
  const avgDelivery = peerReviews.length
    ? peerReviews.reduce((acc, r) => acc + (r.task_delivery || 0), 0) / peerReviews.length
    : 0;
  const avgCollab = peerReviews.length
    ? peerReviews.reduce((acc, r) => acc + (r.collaboration || 0), 0) / peerReviews.length
    : 0;
  const avgReliability = peerReviews.length
    ? peerReviews.reduce((acc, r) => acc + (r.reliability || 0), 0) / peerReviews.length
    : 0;

  const activeProjects = collaborationStartups.filter((s) => s.lifecycle_status === 'live').length;
  const successfulProjects = collaborationStartups.filter((s) => s.lifecycle_status === 'acquired').length;
  const failedProjects = collaborationStartups.filter((s) => s.lifecycle_status === 'closed').length;

  const collaborationMap = {};
  for (const r of [...peerReviews, ...outboundReviews]) {
    const peerId = r.from_user_id === userId ? r.to_user_id : r.from_user_id;
    if (!peerId) continue;
    if (!collaborationMap[peerId]) {
      collaborationMap[peerId] = { peer_id: peerId, interactions: 0, score_total: 0 };
    }
    collaborationMap[peerId].interactions += 1;
    collaborationMap[peerId].score_total += r.rating || 0;
  }

  const peerIds = Object.keys(collaborationMap);
  const peers = peerIds.length
    ? await all(
      `SELECT id, name FROM users WHERE id IN (${peerIds.map(() => '?').join(',')})`,
      peerIds
    )
    : [];
  const peerNameMap = Object.fromEntries(peers.map((p) => [p.id, p.name]));

  const graph = Object.values(collaborationMap).map((item) => ({
    ...item,
    peer_name: peerNameMap[item.peer_id] || item.peer_id,
    avg_rating: Number((item.score_total / Math.max(1, item.interactions)).toFixed(2))
  })).sort((a, b) => b.interactions - a.interactions);

  const rawScore =
    avgRating * 14 +
    completionRate * 30 +
    (avgDelivery / 5) * 10 +
    (avgCollab / 5) * 8 +
    (avgReliability / 5) * 10 +
    Math.min(collaborationStartups.length, 8) / 8 * 12 +
    Math.min(graph.length, 12) / 12 * 8 +
    Math.min(activeProjects, 5) / 5 * 8 +
    Math.min(successfulProjects, 3) / 3 * 8 -
    Math.min(failedProjects, 4) * 3;

  return {
    user_id: user.id,
    user_name: user.name,
    score: Math.round(clamp(rawScore, 0, 100)),
    stats: {
      reviews_received: peerReviews.length,
      avg_rating: Number(avgRating.toFixed(2)),
      completion_rate: Number((completionRate * 100).toFixed(1)),
      collaboration_count: collaborationStartups.length,
      network_size: graph.length,
      active_projects: activeProjects,
      successful_projects: successfulProjects,
      failed_projects: failedProjects,
      avg_delivery: Number(avgDelivery.toFixed(2)),
      avg_collaboration: Number(avgCollab.toFixed(2)),
      avg_reliability: Number(avgReliability.toFixed(2))
    },
    graph
  };
};

const buildStartupAiRisk = async (startupId) => {
  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return null;
  const startup = mapStartup(startupRow);

  const tasks = await all('SELECT * FROM tasks WHERE startup_id = ?', [startupId]);
  const openDecisions = await all('SELECT * FROM workspace_decisions WHERE startup_id = ? AND status = "open"', [startupId]);
  const openCases = await all('SELECT * FROM member_vote_cases WHERE startup_id = ? AND status = "open"', [startupId]);
  const equity = await all('SELECT * FROM equity_allocations WHERE startup_id = ? AND status = "active"', [startupId]);
  const recentActivity = await get(
    `SELECT COUNT(*) as count
     FROM workspace_activity
     WHERE startup_id = ? AND created_at >= datetime('now', '-7 day')`,
    [startupId]
  );

  const now = new Date();
  const overdue = tasks.filter((t) => t.deadline && t.status !== 'done' && safeDate(t.deadline) && safeDate(t.deadline) < now).length;
  const stalled = tasks.filter((t) => t.status !== 'done' && daysDiff(t.created_at, now) > 14).length;
  const completed = tasks.filter((t) => t.status === 'done').length;
  const completionRate = tasks.length ? completed / tasks.length : 0;
  const oldOpenDecisions = openDecisions.filter((d) => daysDiff(d.created_at, now) > 7).length;

  const totalEquity = equity.reduce((acc, e) => acc + (Number(e.share_percent) || 0), 0);
  const maxShare = equity.reduce((acc, e) => Math.max(acc, Number(e.share_percent) || 0), 0);
  const activityCount = recentActivity?.count || 0;

  const signals = [];
  let risk = 8;
  if (overdue > 0) {
    risk += Math.min(30, overdue * 6);
    signals.push({ type: 'deadline', level: 'high', text: `${overdue} ta deadline o'tib ketgan vazifa bor.` });
  }
  if (stalled > 0) {
    risk += Math.min(20, stalled * 4);
    signals.push({ type: 'execution', level: 'medium', text: `${stalled} ta vazifa 14 kundan ko'p vaqt davomida yopilmagan.` });
  }
  if (completionRate < 0.45 && tasks.length >= 4) {
    risk += 14;
    signals.push({ type: 'delivery', level: 'high', text: `Vazifa bajarilish darajasi past: ${Math.round(completionRate * 100)}%.` });
  }
  if (oldOpenDecisions > 0) {
    risk += Math.min(16, oldOpenDecisions * 5);
    signals.push({ type: 'governance', level: 'medium', text: `Ochiq qarorlar kechikmoqda (${oldOpenDecisions} ta).` });
  }
  if (openCases.length > 0) {
    risk += Math.min(18, openCases.length * 6);
    signals.push({ type: 'team', level: 'high', text: `Asoschi ovozi ochiq holatda (${openCases.length} ta).` });
  }
  if (equity.length > 0 && (totalEquity < 99 || totalEquity > 101)) {
    risk += 10;
    signals.push({ type: 'equity', level: 'medium', text: `Ulush balanslashmagan (${totalEquity.toFixed(2)}%).` });
  }
  if (maxShare > 70) {
    risk += 9;
    signals.push({ type: 'equity', level: 'medium', text: `Bitta odam ulushi juda yuqori (${maxShare.toFixed(1)}%).` });
  }
  if (activityCount === 0) {
    risk += 12;
    signals.push({ type: 'activity', level: 'high', text: "So'nggi 7 kunda workspace activity yo'q." });
  }
  if (startup.lifecycle_status === 'closed') risk = 100;

  const score = Math.round(clamp(risk, 0, 100));
  const level =
    score >= 75 ? 'critical'
      : score >= 55 ? 'high'
        : score >= 30 ? 'medium'
          : 'low';

  return {
    score,
    level,
    signals,
    metrics: {
      overdue_tasks: overdue,
      stalled_tasks: stalled,
      completion_rate: Number((completionRate * 100).toFixed(1)),
      open_decisions: openDecisions.length,
      open_member_votes: openCases.length,
      equity_total: Number(totalEquity.toFixed(2)),
      max_single_equity: Number(maxShare.toFixed(2)),
      activity_7d: activityCount
    }
  };
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
  const proUsers = await get('SELECT COUNT(*) as count FROM users WHERE is_pro = 1');
  const pendingPro = await get('SELECT COUNT(*) as count FROM pro_payment_requests WHERE status = "pending"');
  res.json({
    users: users?.count || 0,
    startups: startups?.count || 0,
    pending_startups: pending?.count || 0,
    join_requests: requests?.count || 0,
    notifications: notifications?.count || 0,
    pro_users: proUsers?.count || 0,
    pending_pro_requests: pendingPro?.count || 0
  });
});

// Pro settings and payment workflow
app.get('/api/pro/config', async (req, res) => {
  const config = await getPlatformConfig();
  res.json(config);
});

app.put('/api/admin/pro/config', async (req, res) => {
  const body = req.body || {};
  const actorId = body.actor_id;
  const role = body.actor_role;
  if (role !== 'admin') return res.status(403).send('Faqat admin Pro sozlamasini yangilay oladi');

  const now = nowIso();
  await run(
    `UPDATE platform_settings
     SET pro_enabled = ?, plan_name = ?, price_text = ?, startup_limit_free = ?, updated_at = ?
     WHERE id = 1`,
    [
      toBoolInt(body.pro_enabled !== false),
      body.plan_name || 'GarajHub Pro',
      body.price_text || '149 000 UZS / oy',
      Number(body.startup_limit_free || 1),
      now
    ]
  );

  await run(
    `UPDATE billing_settings
     SET card_holder = ?, card_number = ?, bank_name = ?, receipt_note = ?, updated_at = ?
     WHERE id = 1`,
    [
      body.card_holder || '',
      body.card_number || '',
      body.bank_name || '',
      body.receipt_note || 'Chek rasmini yuklang',
      now
    ]
  );

  await logAction(actorId, 'update_pro_config', 'platform', 'pro_config', {
    pro_enabled: body.pro_enabled !== false
  });
  const config = await getPlatformConfig();
  res.json(config);
});

app.get('/api/pro/requests', async (req, res) => {
  const status = req.query.status;
  const userId = req.query.userId;
  const role = req.query.role;
  let rows = [];
  if (role === 'admin') {
    if (status) {
      rows = await all('SELECT * FROM pro_payment_requests WHERE status = ? ORDER BY created_at DESC', [status]);
    } else {
      rows = await all('SELECT * FROM pro_payment_requests ORDER BY created_at DESC');
    }
  } else if (userId) {
    if (status) {
      rows = await all(
        'SELECT * FROM pro_payment_requests WHERE user_id = ? AND status = ? ORDER BY created_at DESC',
        [userId, status]
      );
    } else {
      rows = await all(
        'SELECT * FROM pro_payment_requests WHERE user_id = ? ORDER BY created_at DESC',
        [userId]
      );
    }
  } else {
    return res.status(400).send('userId yoki role=admin talab qilinadi');
  }
  res.json(rows.map(mapProPaymentRequest));
});

app.post('/api/pro/requests', async (req, res) => {
  const body = req.body || {};
  const userId = body.user_id;
  if (!userId) return res.status(400).send('user_id talab qilinadi');
  if (!body.sender_full_name || !body.sender_card_number || !body.receipt_image) {
    return res.status(400).send('sender_full_name, sender_card_number, receipt_image majburiy');
  }

  const config = await getPlatformConfig();
  if (!config.pro_enabled) return res.status(400).send('Hozirda Pro rejim ochirilgan');

  const user = await get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!user) return res.status(404).send('Foydalanuvchi topilmadi');
  if (user.is_pro === 1) return res.status(400).send('Foydalanuvchi allaqachon Pro');

  const pending = await get(
    'SELECT * FROM pro_payment_requests WHERE user_id = ? AND status = "pending" ORDER BY created_at DESC LIMIT 1',
    [userId]
  );
  if (pending) return res.status(409).send('Kutilayotgan Pro sorov allaqachon mavjud');

  const id = makeId('proreq');
  const createdAt = nowIso();
  await run(
    `INSERT INTO pro_payment_requests (
      id, user_id, user_name, sender_full_name, sender_card_number, receipt_image, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      user.name || body.user_name || '',
      body.sender_full_name,
      body.sender_card_number,
      body.receipt_image,
      'pending',
      createdAt
    ]
  );

  await run(
    `INSERT INTO notifications (id, user_id, title, text, type, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      makeId('n'),
      'admin',
      'Yangi Pro so\'rov',
      `${user.name} Pro uchun chek yubordi. So'rovni tekshiring.`,
      'info',
      0,
      createdAt
    ]
  );

  const created = await get('SELECT * FROM pro_payment_requests WHERE id = ?', [id]);
  res.status(201).json(mapProPaymentRequest(created));
});

app.put('/api/pro/requests/:id/review', async (req, res) => {
  const requestId = req.params.id;
  const body = req.body || {};
  const action = body.action;
  const reviewerRole = body.actor_role;
  if (reviewerRole !== 'admin') return res.status(403).send('Faqat admin korib chiqishi mumkin');
  if (!['approve', 'reject'].includes(action)) return res.status(400).send('action approve yoki reject bolishi kerak');

  const existing = await get('SELECT * FROM pro_payment_requests WHERE id = ?', [requestId]);
  if (!existing) return res.status(404).send('Pro sorov topilmadi');
  if (existing.status !== 'pending') return res.status(400).send('Sorov allaqachon korib chiqilgan');

  const reviewedAt = nowIso();
  const nextStatus = action === 'approve' ? 'approved' : 'rejected';
  await run(
    `UPDATE pro_payment_requests
     SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = ?
     WHERE id = ?`,
    [
      nextStatus,
      body.admin_note || '',
      body.actor_id || null,
      reviewedAt,
      requestId
    ]
  );

  if (action === 'approve') {
    await run(
      `UPDATE users
       SET is_pro = 1, pro_status = 'pro', pro_updated_at = ?
       WHERE id = ?`,
      [reviewedAt, existing.user_id]
    );
  } else {
    await run(
      `UPDATE users
       SET is_pro = 0, pro_status = 'rejected', pro_updated_at = ?
       WHERE id = ?`,
      [reviewedAt, existing.user_id]
    );
  }

  await run(
    `INSERT INTO notifications (id, user_id, title, text, type, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      makeId('n'),
      existing.user_id,
      action === 'approve' ? 'Pro tasdiqlandi' : 'Pro so\'rov rad etildi',
      action === 'approve'
        ? 'To\'lovingiz tasdiqlandi. Endi siz Pro funksiyalardan foydalanishingiz mumkin.'
        : `So'rovingiz rad etildi${body.admin_note ? `: ${body.admin_note}` : '.'}`,
      action === 'approve' ? 'success' : 'danger',
      0,
      reviewedAt
    ]
  );

  await logAction(body.actor_id, action === 'approve' ? 'approve_pro_request' : 'reject_pro_request', 'pro_request', requestId, {
    user_id: existing.user_id
  });

  const updated = await get('SELECT * FROM pro_payment_requests WHERE id = ?', [requestId]);
  res.json(mapProPaymentRequest(updated));
});

// Users
app.get('/api/users', async (req, res) => {
  const rows = await all('SELECT * FROM users');
  res.json(rows.map(mapUser));
});

app.get('/api/users/:id', async (req, res) => {
  if (req.params.id === 'by-email') {
    const email = req.query.email;
    if (!email) return res.status(400).send('Elektron pochta talab qilinadi');
    const row = await get('SELECT * FROM users WHERE email = ?', [email]);
    return res.json(mapUser(row));
  }
  const row = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).send('Foydalanuvchi topilmadi');
  res.json(mapUser(row));
});

app.get('/api/users/by-email', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).send('Elektron pochta talab qilinadi');
  const row = await get('SELECT * FROM users WHERE email = ?', [email]);
  res.json(mapUser(row));
});

app.post('/api/users', async (req, res) => {
  const u = req.body;
  await run(
    `INSERT INTO users (
      id, email, password, name, phone, role, bio, avatar, banner, portfolio_url, skills, languages, tools, created_at,
      is_pro, pro_status, pro_updated_at, cv_data, cv_file_name, cv_mime, cv_size, cv_updated_at
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      u.id,
      u.email,
      u.password || '',
      u.name,
      u.phone || '',
      u.role || 'user',
      u.bio || '',
      u.avatar || '',
      u.banner || '',
      u.portfolio_url || '',
      JSON.stringify(u.skills || []),
      JSON.stringify(u.languages || []),
      JSON.stringify(u.tools || []),
      u.created_at || new Date().toISOString(),
      u.is_pro ? 1 : 0,
      u.pro_status || 'free',
      u.pro_updated_at || null,
      u.cv_data || '',
      u.cv_file_name || '',
      u.cv_mime || '',
      Number(u.cv_size || 0),
      u.cv_updated_at || null
    ]
  );
  const created = await get('SELECT * FROM users WHERE id = ?', [u.id]);
  res.status(201).json(mapUser(created));
});

app.put('/api/users/:id', async (req, res) => {
  const { fields, values } = buildUpdate(req.body, ['skills', 'languages', 'tools']);
  if (fields.length === 0) return res.status(400).send('Yangilash uchun maydon topilmadi');
  values.push(req.params.id);
  await run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  const updated = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  res.json(mapUser(updated));
});

app.post('/api/users/:id/cv', async (req, res) => {
  const userId = req.params.id;
  const actorId = req.body?.actor_id;
  const actorRole = req.body?.actor_role;
  if (!actorId) return res.status(400).send('actor_id talab qilinadi');
  if (actorId !== userId && actorRole !== 'admin') return res.status(403).send('Faqat egasi yoki admin CV yuklay oladi');

  const existing = await get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!existing) return res.status(404).send('Foydalanuvchi topilmadi');

  const cvData = String(req.body?.cv_data || '');
  const cvFileName = String(req.body?.cv_file_name || '').trim();
  const cvMime = String(req.body?.cv_mime || '').trim();
  const cvSize = Number(req.body?.cv_size || 0);
  if (!cvData || !cvFileName || !cvMime) {
    return res.status(400).send('cv_data, cv_file_name, cv_mime talab qilinadi');
  }
  if (!cvData.startsWith('data:')) {
    return res.status(400).send('cv_data format notogri');
  }
  const allowedMime = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (!allowedMime.includes(cvMime)) {
    return res.status(400).send('CV turi faqat PDF, DOC yoki DOCX bolishi kerak');
  }
  if (!Number.isFinite(cvSize) || cvSize <= 0 || cvSize > 10 * 1024 * 1024) {
    return res.status(400).send('CV hajmi 10MB dan oshmasligi kerak');
  }

  const now = nowIso();
  await run(
    `UPDATE users
     SET cv_data = ?, cv_file_name = ?, cv_mime = ?, cv_size = ?, cv_updated_at = ?
     WHERE id = ?`,
    [cvData, cvFileName, cvMime, cvSize, now, userId]
  );
  const updated = await get('SELECT * FROM users WHERE id = ?', [userId]);
  await logAction(actorId, 'upload_cv', 'user', userId, {
    cv_file_name: cvFileName,
    cv_mime: cvMime,
    cv_size: cvSize
  });
  res.json(mapUser(updated));
});

app.delete('/api/users/:id/cv', async (req, res) => {
  const userId = req.params.id;
  const actorId = req.query?.actor_id;
  const actorRole = req.query?.actor_role;
  if (!actorId) return res.status(400).send('actor_id talab qilinadi');
  if (actorId !== userId && actorRole !== 'admin') return res.status(403).send('Faqat egasi yoki admin CV ochira oladi');

  const existing = await get('SELECT * FROM users WHERE id = ?', [userId]);
  if (!existing) return res.status(404).send('Foydalanuvchi topilmadi');

  await run(
    `UPDATE users
     SET cv_data = '', cv_file_name = '', cv_mime = '', cv_size = 0, cv_updated_at = ?
     WHERE id = ?`,
    [nowIso(), userId]
  );
  const updated = await get('SELECT * FROM users WHERE id = ?', [userId]);
  await logAction(actorId, 'delete_cv', 'user', userId);
  res.json(mapUser(updated));
});

app.put('/api/users/:id/role', async (req, res) => {
  const role = req.body?.role;
  if (!role) return res.status(400).send('role talab qilinadi');
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

app.put('/api/users/:id/pro', async (req, res) => {
  const isPro = req.body?.is_pro ? 1 : 0;
  await run(
    `UPDATE users
     SET is_pro = ?, pro_status = ?, pro_updated_at = ?
     WHERE id = ?`,
    [
      isPro,
      isPro ? 'pro' : 'free',
      nowIso(),
      req.params.id
    ]
  );
  const updated = await get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  await logAction(req.body?.actor_id, isPro ? 'grant_pro_user' : 'revoke_pro_user', 'user', req.params.id);
  res.json(mapUser(updated));
});

app.delete('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  await run('DELETE FROM join_requests WHERE user_id = ?', [userId]);
  await run('DELETE FROM notifications WHERE user_id = ?', [userId]);
  await run('DELETE FROM pro_payment_requests WHERE user_id = ?', [userId]);
  await run('DELETE FROM startup_chat_messages WHERE sender_id = ?', [userId]);
  await run('DELETE FROM startup_invitations WHERE invitee_id = ? OR inviter_id = ?', [userId, userId]);
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

app.get('/api/startup-templates', async (req, res) => {
  res.json(
    STARTUP_TEMPLATES.map((template) => ({
      key: template.key,
      name: template.name,
      segment: template.segment,
      description: template.description,
      specialists: template.specialists || [],
      default_tasks: template.default_tasks || []
    }))
  );
});

app.post('/api/startups', async (req, res) => {
  const s = req.body || {};
  if (!s.id || !String(s.nomi || '').trim()) {
    return res.status(400).send('id va nomi talab qilinadi');
  }

  const template = getTemplateByKey(s.template_key);
  const specialistsInput = Array.isArray(s.kerakli_mutaxassislar)
    ? s.kerakli_mutaxassislar
    : String(s.kerakli_mutaxassislar || '').split(/[,\n;|]+/);
  const specialists = specialistsInput.map((item) => String(item || '').trim()).filter(Boolean);
  const normalizedSpecialists = specialists.length > 0
    ? specialists
    : (template?.specialists || []);
  if (normalizedSpecialists.length === 0) {
    return res.status(400).send('Kerakli mutaxassislar talab qilinadi');
  }

  const startupCreatedAt = s.yaratilgan_vaqt || nowIso();
  const startupMembers = Array.isArray(s.a_zolar) && s.a_zolar.length > 0
    ? s.a_zolar.map((m) => ({
      user_id: m.user_id,
      name: m.name || m.user_id,
      role: m.role || 'Azo',
      joined_at: m.joined_at || startupCreatedAt
    }))
    : [{
      user_id: s.egasi_id,
      name: s.egasi_name || s.egasi_id,
      role: 'Asoschi',
      joined_at: startupCreatedAt
    }];

  const seededTasks = (template?.default_tasks || []).map((task) => {
    const deadline = task.days_offset
      ? toDateOnly(new Date(Date.now() + Number(task.days_offset) * 24 * 60 * 60 * 1000))
      : '';
    return {
      id: makeId('t'),
      startup_id: s.id,
      title: task.title,
      description: task.description || '',
      assigned_to_id: s.egasi_id,
      assigned_to_name: s.egasi_name || s.egasi_id,
      deadline,
      priority: normalizeTaskPriority(task.priority),
      estimate_hours: Number(task.estimate_hours || 0),
      actual_hours: 0,
      calendar_tag: task.calendar_tag || 'backlog',
      created_by: s.egasi_id,
      status: 'todo',
      created_at: startupCreatedAt,
      updated_at: startupCreatedAt
    };
  });

  const incomingTasks = Array.isArray(s.tasks)
    ? s.tasks
      .map((task) => ({
        id: task.id || makeId('t'),
        startup_id: s.id,
        title: String(task.title || '').trim(),
        description: task.description || '',
        assigned_to_id: task.assigned_to_id || s.egasi_id,
        assigned_to_name: task.assigned_to_name || s.egasi_name || s.egasi_id,
        deadline: toDateOnly(task.deadline),
        priority: normalizeTaskPriority(task.priority),
        estimate_hours: Number(task.estimate_hours || 0),
        actual_hours: Number(task.actual_hours || 0),
        calendar_tag: task.calendar_tag || 'backlog',
        created_by: task.created_by || s.egasi_id,
        status: normalizeTaskStatus(task.status),
        created_at: task.created_at || startupCreatedAt,
        updated_at: task.updated_at || startupCreatedAt
      }))
      .filter((task) => !!task.title)
    : [];
  const startupTasks = incomingTasks.length > 0 ? incomingTasks : seededTasks;

  const proRestrictionsEnabled = await canUseProRestrictions();
  if (s.egasi_id && proRestrictionsEnabled) {
    const owner = await get('SELECT * FROM users WHERE id = ?', [s.egasi_id]);
    const isOwnerPro = owner?.is_pro === 1 || owner?.role === 'admin';
    if (!isOwnerPro) {
      const settings = await getPlatformConfig();
      const ownedCountRow = await get('SELECT COUNT(*) as count FROM startups WHERE egasi_id = ?', [s.egasi_id]);
      const ownedCount = Number(ownedCountRow?.count || 0);
      if (ownedCount >= Number(settings.startup_limit_free || 1)) {
        return res.status(403).json({
          error: 'Pro reja talab qilinadi',
          message: `Bepul foydalanuvchi faqat ${settings.startup_limit_free || 1} ta startup yarata oladi. Cheksiz startup uchun Pro ga o'ting.`
        });
      }
    }
  }
  await run(
    `INSERT INTO startups (
      id, nomi, tavsif, category, kerakli_mutaxassislar, logo, egasi_id, egasi_name,
      status, yaratilgan_vaqt, a_zolar, tasks, views, github_url, website_url,
      segment, template_key, template_name, lifecycle_status, success_fee_percent, registry_notes
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      s.id,
      s.nomi,
      s.tavsif,
      s.category,
      JSON.stringify(normalizedSpecialists),
      s.logo,
      s.egasi_id,
      s.egasi_name,
      s.status || 'pending_admin',
      startupCreatedAt,
      JSON.stringify(startupMembers),
      JSON.stringify(startupTasks),
      s.views || 0,
      s.github_url || '',
      s.website_url || '',
      s.segment || template?.segment || 'IT asoschisi + dasturchi',
      template?.key || '',
      template?.name || '',
      s.lifecycle_status || 'live',
      Number.isFinite(Number(s.success_fee_percent)) ? Number(s.success_fee_percent) : 1.5,
      s.registry_notes || ''
    ]
  );
  await ensureWorkspace(s.id, s.egasi_id || 'system');

  for (const task of startupTasks) {
    await run(
      `INSERT INTO tasks (
        id, startup_id, title, description, assigned_to_id, assigned_to_name, deadline, status, created_at,
        priority, estimate_hours, actual_hours, calendar_tag, created_by, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        s.id,
        task.title,
        task.description || '',
        task.assigned_to_id || s.egasi_id,
        task.assigned_to_name || s.egasi_name || s.egasi_id,
        toDateOnly(task.deadline),
        normalizeTaskStatus(task.status),
        task.created_at || startupCreatedAt,
        normalizeTaskPriority(task.priority),
        Number(task.estimate_hours || 0),
        Number(task.actual_hours || 0),
        task.calendar_tag || 'backlog',
        task.created_by || s.egasi_id,
        task.updated_at || startupCreatedAt
      ]
    );
  }
  await syncStartupTasks(s.id);

  await run(
    `INSERT INTO workspace_activity (id, startup_id, user_id, activity_type, payload, hours_spent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      makeId('act'),
      s.id,
      s.egasi_id || 'system',
      'workspace_created',
      JSON.stringify({
        startup_name: s.nomi,
        template_key: template?.key || null,
        seeded_tasks: startupTasks.length
      }),
      0,
      nowIso()
    ]
  );
  const created = await get('SELECT * FROM startups WHERE id = ?', [s.id]);
  res.status(201).json(mapStartup(created));
});

app.put('/api/startups/:id', async (req, res) => {
  const { fields, values } = buildUpdate(req.body, ['kerakli_mutaxassislar', 'a_zolar', 'tasks']);
  if (fields.length === 0) return res.status(400).send('Yangilash uchun maydon topilmadi');
  values.push(req.params.id);
  await run(`UPDATE startups SET ${fields.join(', ')} WHERE id = ?`, values);
  const updated = await get('SELECT * FROM startups WHERE id = ?', [req.params.id]);
  res.json(mapStartup(updated));
});

app.put('/api/startups/:id/status', async (req, res) => {
  const status = req.body?.status;
  if (!status) return res.status(400).send('status talab qilinadi');
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
  await run('DELETE FROM workspaces WHERE startup_id = ?', [id]);
  await run('DELETE FROM workspace_activity WHERE startup_id = ?', [id]);
  await run('DELETE FROM peer_reviews WHERE startup_id = ?', [id]);
  await run('DELETE FROM workspace_decisions WHERE startup_id = ?', [id]);
  await run('DELETE FROM decision_votes WHERE startup_id = ?', [id]);
  await run('DELETE FROM member_vote_cases WHERE startup_id = ?', [id]);
  await run('DELETE FROM member_vote_ballots WHERE startup_id = ?', [id]);
  await run('DELETE FROM equity_allocations WHERE startup_id = ?', [id]);
  await run('DELETE FROM safekeeping_agreements WHERE startup_id = ?', [id]);
  await run('DELETE FROM investor_intros WHERE startup_id = ?', [id]);
  await run('DELETE FROM startup_chat_messages WHERE startup_id = ?', [id]);
  await run('DELETE FROM startup_invitations WHERE startup_id = ?', [id]);
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
  if (!status) return res.status(400).send('status talab qilinadi');
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
    rows = await all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [userId]);
  } else {
    rows = await all('SELECT * FROM notifications ORDER BY created_at DESC');
  }
  res.json(rows.map(mapNotification));
});

app.post('/api/notifications', async (req, res) => {
  const n = req.body;
  await run(
    `INSERT INTO notifications (id, user_id, title, text, type, is_read, meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      n.id,
      n.user_id,
      n.title,
      n.text,
      n.type || 'info',
      n.is_read ? 1 : 0,
      n.meta ? JSON.stringify(n.meta) : null,
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
  if (!userId) return res.status(400).send('userId talab qilinadi');
  await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  res.status(204).end();
});

// Startup chat (members only)
app.get('/api/startups/:id/chat', async (req, res) => {
  const startupId = req.params.id;
  const userId = req.query.userId;
  if (!userId) return res.status(400).send('userId talab qilinadi');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  if (!isStartupMember(startup, userId)) return res.status(403).send('Suhbatga faqat startup azolari kira oladi');

  const rows = await all(
    `SELECT * FROM startup_chat_messages WHERE startup_id = ? ORDER BY created_at ASC`,
    [startupId]
  );
  res.json(rows.map(mapStartupChatMessage));
});

app.post('/api/startups/:id/chat', async (req, res) => {
  const startupId = req.params.id;
  const userId = req.body?.user_id;
  const content = (req.body?.content || '').trim();
  const messageType = (req.body?.message_type || 'text').trim().toLowerCase();
  const fileName = (req.body?.file_name || '').trim();
  const fileUrl = req.body?.file_url || '';
  if (!userId) return res.status(400).send('user_id talab qilinadi');
  if (!content && !fileUrl) return res.status(400).send('content yoki file_url talab qilinadi');
  if (!['text', 'image', 'file'].includes(messageType)) return res.status(400).send('message_type notogri');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  if (!isStartupMember(startup, userId)) return res.status(403).send('Suhbatga xabarni faqat startup azolari yubora oladi');

  let senderName = 'Noma\'lum';
  if (userId === 'admin') {
    senderName = 'Admin';
  } else {
    const sender = await get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!sender) return res.status(404).send('Yuboruvchi topilmadi');
    senderName = sender.name || sender.id;
  }

  const id = makeId('sch');
  const createdAt = nowIso();
  await run(
    `INSERT INTO startup_chat_messages (
      id, startup_id, sender_id, sender_name, message_type, content, file_name, file_url, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, startupId, userId, senderName, messageType, content, fileName, fileUrl, createdAt]
  );

  await run(
    `INSERT INTO workspace_activity (id, startup_id, user_id, activity_type, payload, hours_spent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      makeId('act'),
      startupId,
      userId,
      'chat_message_sent',
      JSON.stringify({ message_type: messageType, has_file: !!fileUrl }),
      0,
      createdAt
    ]
  );

  const created = await get('SELECT * FROM startup_chat_messages WHERE id = ?', [id]);
  res.status(201).json(mapStartupChatMessage(created));
});

// Candidate recommendations for startup members
app.get('/api/startups/:id/recommendations', async (req, res) => {
  const startupId = req.params.id;
  const userId = req.query.userId;
  if (!userId) return res.status(400).send('userId talab qilinadi');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  if (!isStartupMember(startup, userId)) return res.status(403).send('Tavsiyalarni faqat startup azolari kora oladi');

  const needed = (startup.kerakli_mutaxassislar || [])
    .map((item) => String(item || '').toLowerCase().trim())
    .filter(Boolean);
  if (needed.length === 0) return res.json([]);

  const memberIds = new Set((startup.a_zolar || []).map((m) => m.user_id));
  memberIds.add(startup.egasi_id);

  const users = await all('SELECT * FROM users WHERE banned = 0');
  const tasks = await all('SELECT * FROM tasks');
  const reviews = await all('SELECT * FROM peer_reviews');
  const pendingInvites = await all(
    `SELECT invitee_id FROM startup_invitations WHERE startup_id = ? AND status = 'pending'`,
    [startupId]
  );
  const pendingInviteIds = new Set(pendingInvites.map((p) => p.invitee_id));
  const today = startOfDay(new Date());

  const normalizeText = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

  const candidates = users
    .map((row) => mapUser(row))
    .filter((u) => u && !memberIds.has(u.id) && !pendingInviteIds.has(u.id))
    .map((u) => {
      const haystack = normalizeText(
        `${u.name || ''} ${(u.skills || []).join(' ')} ${u.bio || ''} ${u.portfolio_url || ''}`
      );
      const matched = needed.filter((spec) => {
        const token = normalizeText(spec);
        if (!token) return false;
        const parts = token.split(/[\s/,+-]+/).filter((p) => p.length >= 2);
        if (parts.length === 0) return false;
        return parts.some((p) => haystack.includes(p));
      });

      if (matched.length === 0) return null;

      const userTasks = tasks.filter((task) => task.assigned_to_id === u.id);
      const doneCount = userTasks.filter((task) => task.status === 'done').length;
      const openTasks = userTasks.filter((task) => task.status !== 'done');
      const nearDeadlineLoad = openTasks.filter((task) => {
        const deadline = safeDate(task.deadline);
        if (!deadline) return false;
        return deadline <= endOfDay(new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000));
      }).length;

      const userReviews = reviews.filter((review) => review.to_user_id === u.id);
      const avgRating = userReviews.length
        ? userReviews.reduce((acc, review) => acc + Number(review.rating || 0), 0) / userReviews.length
        : 0;
      const completionRate = userTasks.length ? doneCount / userTasks.length : 0.5;
      const reputationScore = clamp(Math.round(((avgRating / 5) * 60) + (completionRate * 40)), 0, 100);
      const availabilityScore = clamp(100 - (openTasks.length * 12) - (nearDeadlineLoad * 8), 10, 100);
      const specialtyScore = clamp(Math.round((matched.length / needed.length) * 100), 0, 100);
      const proBonus = u.is_pro ? 8 : 0;
      const finalScore = Math.round(
        clamp(
          specialtyScore * 0.45 +
          reputationScore * 0.30 +
          availabilityScore * 0.25 +
          proBonus,
          1,
          100
        )
      );

      const reasons = [];
      reasons.push(`${matched.length} ta mutaxassislik mos: ${matched.slice(0, 3).join(', ')}`);
      reasons.push(`Reputatsiya ${reputationScore}/100 (baho ${avgRating.toFixed(1)} / 5)`);
      reasons.push(`Bandlik darajasi ${availabilityScore}/100 (ochiq vazifa ${openTasks.length} ta)`);
      if (u.is_pro) reasons.push('Pro foydalanuvchi');

      const confidence =
        specialtyScore >= 70 && reputationScore >= 55 ? 'high'
          : specialtyScore >= 45 ? 'medium'
            : 'low';

      return {
        id: u.id,
        name: u.name,
        avatar: u.avatar || '',
        bio: u.bio || '',
        skills: u.skills || [],
        is_pro: !!u.is_pro,
        matched_specialties: matched,
        match_score: finalScore,
        specialty_score: specialtyScore,
        reputation_score: reputationScore,
        availability_score: availabilityScore,
        confidence,
        reason: reasons.slice(0, 4),
        open_tasks: openTasks.length,
        avg_rating: Number(avgRating.toFixed(2))
      };
    })
    .filter(Boolean)
    .filter((u) => u.match_score > 0)
    .sort((a, b) => {
      if (b.match_score !== a.match_score) return b.match_score - a.match_score;
      if (b.reputation_score !== a.reputation_score) return b.reputation_score - a.reputation_score;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 20);

  res.json(candidates);
});

// Startup invitation flow
app.post('/api/startups/:id/invitations', async (req, res) => {
  const startupId = req.params.id;
  const inviterId = req.body?.inviter_id;
  const inviteeId = req.body?.invitee_id;
  const roleHint = (req.body?.role_hint || '').trim();
  if (!inviterId || !inviteeId) return res.status(400).send('inviter_id va invitee_id talab qilinadi');
  if (inviterId === inviteeId) return res.status(400).send('Ozingizni taklif qila olmaysiz');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  if (!isStartupMember(startup, inviterId)) return res.status(403).send('Taklif yuborish faqat azolarga ruxsat');

  const inviteeRow = await get('SELECT * FROM users WHERE id = ?', [inviteeId]);
  if (!inviteeRow) return res.status(404).send('Taklif qilinuvchi topilmadi');
  if (inviteeRow.banned === 1) return res.status(400).send('Taklif qilinuvchi bloklangan');
  if (isStartupMember(startup, inviteeId)) return res.status(409).send('Foydalanuvchi allaqachon azo');

  const existingPending = await get(
    `SELECT * FROM startup_invitations WHERE startup_id = ? AND invitee_id = ? AND status = 'pending'`,
    [startupId, inviteeId]
  );
  if (existingPending) return res.status(409).send("Kutilayotgan taklif allaqachon mavjud");

  let inviterName = 'Noma\'lum';
  if (inviterId === 'admin') {
    inviterName = 'Admin';
  } else {
    const inviter = await get('SELECT * FROM users WHERE id = ?', [inviterId]);
    if (!inviter) return res.status(404).send('Taklif yuboruvchi topilmadi');
    inviterName = inviter.name || inviter.id;
  }

  const createdAt = nowIso();
  const invitationId = makeId('sinv');
  const notificationId = makeId('n');
  await run(
    `INSERT INTO startup_invitations (
      id, startup_id, startup_name, inviter_id, inviter_name, invitee_id, invitee_name, role_hint, status, notification_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      invitationId,
      startupId,
      startup.nomi,
      inviterId,
      inviterName,
      inviteeId,
      inviteeRow.name || inviteeId,
      roleHint,
      'pending',
      notificationId,
      createdAt
    ]
  );

  await run(
    `INSERT INTO notifications (id, user_id, title, text, type, is_read, meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      notificationId,
      inviteeId,
      'Startup taklifi',
      `${inviterName} sizni "${startup.nomi}" startupiga taklif qildi.`,
      'info',
      0,
      JSON.stringify({
        kind: 'startup_invitation',
        invitation_id: invitationId,
        startup_id: startupId,
        startup_name: startup.nomi,
        inviter_id: inviterId,
        inviter_name: inviterName
      }),
      createdAt
    ]
  );

  const created = await get('SELECT * FROM startup_invitations WHERE id = ?', [invitationId]);
  res.status(201).json(mapStartupInvitation(created));
});

app.get('/api/invitations', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).send('userId talab qilinadi');
  const rows = await all(
    `SELECT * FROM startup_invitations WHERE invitee_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  res.json(rows.map(mapStartupInvitation));
});

app.post('/api/invitations/:id/respond', async (req, res) => {
  const invitationId = req.params.id;
  const userId = req.body?.user_id;
  const action = req.body?.action;
  if (!userId || !['accept', 'reject'].includes(action)) {
    return res.status(400).send('user_id va action(accept|reject) talab qilinadi');
  }

  const invitation = await get('SELECT * FROM startup_invitations WHERE id = ?', [invitationId]);
  if (!invitation) return res.status(404).send('Taklif topilmadi');
  if (invitation.invitee_id !== userId) return res.status(403).send('Faqat taklif qilingan foydalanuvchi javob bera oladi');
  if (invitation.status !== 'pending') return res.status(400).send('Taklif allaqachon korib chiqilgan');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [invitation.startup_id]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);

  const now = nowIso();
  let nextStatus = 'rejected';
  if (action === 'accept') {
    const members = Array.isArray(startup.a_zolar) ? startup.a_zolar : [];
    const alreadyMember = members.some((m) => m.user_id === userId);
    if (!alreadyMember) {
      const nextMembers = [
        ...members,
        {
          user_id: invitation.invitee_id,
          name: invitation.invitee_name,
          role: invitation.role_hint || "A'zo",
          joined_at: now
        }
      ];
      await run('UPDATE startups SET a_zolar = ? WHERE id = ?', [JSON.stringify(nextMembers), startup.id]);
    }
    nextStatus = 'accepted';
    await run(
      `INSERT INTO workspace_activity (id, startup_id, user_id, activity_type, payload, hours_spent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        makeId('act'),
        startup.id,
        userId,
        'invitation_accepted',
        JSON.stringify({ invitation_id: invitationId }),
        0,
        now
      ]
    );
  }

  await run(
    'UPDATE startup_invitations SET status = ?, responded_at = ? WHERE id = ?',
    [nextStatus, now, invitationId]
  );
  if (invitation.notification_id) {
    await run('UPDATE notifications SET is_read = 1 WHERE id = ?', [invitation.notification_id]);
  }

  const inviterTargets = new Set([invitation.inviter_id, startup.egasi_id].filter(Boolean));
  for (const targetId of inviterTargets) {
    await run(
      `INSERT INTO notifications (id, user_id, title, text, type, is_read, meta, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        makeId('n'),
        targetId,
        action === 'accept' ? 'Taklif qabul qilindi' : 'Taklif rad etildi',
        action === 'accept'
          ? `${invitation.invitee_name} "${startup.nomi}" startupiga qo'shildi.`
          : `${invitation.invitee_name} taklifingizni rad etdi.`,
        action === 'accept' ? 'success' : 'danger',
        0,
        JSON.stringify({
          kind: 'startup_invitation_result',
          invitation_id: invitationId,
          startup_id: startup.id,
          startup_name: startup.nomi,
          invitee_id: invitation.invitee_id,
          action
        }),
        now
      ]
    );
  }

  const updated = await get('SELECT * FROM startup_invitations WHERE id = ?', [invitationId]);
  res.json(mapStartupInvitation(updated));
});

// Tasks
app.get('/api/startups/:id/tasks', async (req, res) => {
  const startupId = req.params.id;
  const userId = req.query.userId;
  if (!userId) return res.status(400).send('userId talab qilinadi');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  if (!isStartupMember(startup, userId)) return res.status(403).send('Vazifalarni faqat startup azolari kora oladi');

  const statusFilter = String(req.query.status || '').trim().toLowerCase();
  const q = String(req.query.q || '').toLowerCase().trim();
  const due = String(req.query.due || '').toLowerCase().trim();
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 40)));

  const rows = await all('SELECT * FROM tasks WHERE startup_id = ? ORDER BY created_at DESC', [startupId]);
  const allTasks = rows.map(mapTask);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const weekEnd = endOfDay(new Date(todayStart.getTime() + 6 * 24 * 60 * 60 * 1000));

  const filtered = allTasks.filter((task) => {
    if (statusFilter && task.status !== statusFilter) return false;
    if (q) {
      const text = `${task.title || ''} ${task.description || ''} ${task.assigned_to_name || ''}`.toLowerCase();
      if (!text.includes(q)) return false;
    }
    if (due) {
      const deadline = safeDate(task.deadline);
      if (due === 'overdue' && !(deadline && deadline < todayStart && task.status !== 'done')) return false;
      if (due === 'today' && !(deadline && deadline >= todayStart && deadline <= todayEnd)) return false;
      if (due === 'week' && !(deadline && deadline >= todayStart && deadline <= weekEnd)) return false;
      if (due === 'none' && !!deadline) return false;
    }
    return true;
  });

  const total = filtered.length;
  const offset = (page - 1) * limit;
  const items = filtered.slice(offset, offset + limit);

  res.json({
    total,
    page,
    limit,
    items
  });
});

app.post('/api/tasks', async (req, res) => {
  const t = req.body || {};
  const startupId = t.startup_id;
  const title = String(t.title || '').trim();
  if (!startupId || !title) return res.status(400).send('startup_id va title talab qilinadi');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);

  const actorId = t.actor_id || t.created_by || t.assigned_to_id;
  if (actorId && !isStartupMember(startup, actorId)) {
    return res.status(403).send('Vazifa yaratish faqat startup azolariga ruxsat');
  }

  const createdAt = t.created_at || nowIso();
  const id = t.id || makeId('t');
  const deadline = toDateOnly(t.deadline);
  if (t.deadline && !deadline) return res.status(400).send('deadline formati notogri');

  await run(
    `INSERT INTO tasks (
      id, startup_id, title, description, assigned_to_id, assigned_to_name, deadline, status, created_at,
      priority, estimate_hours, actual_hours, calendar_tag, created_by, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      startupId,
      title,
      t.description || '',
      t.assigned_to_id || actorId || startup.egasi_id,
      t.assigned_to_name || startup.a_zolar.find((m) => m.user_id === (t.assigned_to_id || actorId))?.name || 'Belgilanmagan',
      deadline,
      normalizeTaskStatus(t.status || 'todo'),
      createdAt,
      normalizeTaskPriority(t.priority),
      Number(t.estimate_hours || 0),
      Number(t.actual_hours || 0),
      t.calendar_tag || 'backlog',
      actorId || startup.egasi_id,
      createdAt
    ]
  );

  await syncStartupTasks(startupId);

  await run(
    `INSERT INTO workspace_activity (id, startup_id, user_id, activity_type, payload, hours_spent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      makeId('act'),
      startupId,
      actorId || startup.egasi_id || 'system',
      'task_created',
      JSON.stringify({ task_id: id, title }),
      0,
      createdAt
    ]
  );

  const created = await get('SELECT * FROM tasks WHERE id = ?', [id]);
  res.status(201).json(mapTask(created));
});

app.put('/api/tasks/:id/status', async (req, res) => {
  const taskId = req.params.id;
  const rawStatus = req.body?.status;
  if (!rawStatus) return res.status(400).send('status talab qilinadi');
  const status = normalizeTaskStatus(rawStatus);

  const existing = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!existing) return res.status(404).send('Vazifa topilmadi');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [existing.startup_id]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);

  const actorId = req.body?.actor_id;
  if (actorId && !isStartupMember(startup, actorId)) {
    return res.status(403).send('Vazifa statusini faqat startup azolari ozgartira oladi');
  }

  const updatedAt = nowIso();
  await run(
    'UPDATE tasks SET status = ?, actual_hours = ?, updated_at = ? WHERE id = ?',
    [
      status,
      Number(req.body?.actual_hours ?? existing.actual_hours ?? 0),
      updatedAt,
      taskId
    ]
  );
  await syncStartupTasks(existing.startup_id);

  await run(
    `INSERT INTO workspace_activity (id, startup_id, user_id, activity_type, payload, hours_spent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      makeId('act'),
      existing.startup_id,
      actorId || existing.assigned_to_id || 'system',
      'task_status_changed',
      JSON.stringify({ task_id: taskId, status }),
      0,
      updatedAt
    ]
  );

  const updated = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  res.json(mapTask(updated));
});

app.patch('/api/tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  const patch = req.body || {};
  const existing = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!existing) return res.status(404).send('Vazifa topilmadi');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [existing.startup_id]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);

  const actorId = patch.actor_id;
  if (actorId && !isStartupMember(startup, actorId)) {
    return res.status(403).send('Vazifani faqat startup azolari tahrirlashi mumkin');
  }

  const updates = [];
  const values = [];
  if (Object.prototype.hasOwnProperty.call(patch, 'title')) {
    updates.push('title = ?');
    values.push(String(patch.title || '').trim());
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'description')) {
    updates.push('description = ?');
    values.push(patch.description || '');
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'assigned_to_id')) {
    updates.push('assigned_to_id = ?');
    values.push(patch.assigned_to_id || null);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'assigned_to_name')) {
    updates.push('assigned_to_name = ?');
    values.push(patch.assigned_to_name || '');
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'deadline')) {
    const deadline = patch.deadline ? toDateOnly(patch.deadline) : '';
    if (patch.deadline && !deadline) return res.status(400).send('deadline formati notogri');
    updates.push('deadline = ?');
    values.push(deadline);
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
    updates.push('status = ?');
    values.push(normalizeTaskStatus(patch.status));
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'priority')) {
    updates.push('priority = ?');
    values.push(normalizeTaskPriority(patch.priority));
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'estimate_hours')) {
    updates.push('estimate_hours = ?');
    values.push(Number(patch.estimate_hours || 0));
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'actual_hours')) {
    updates.push('actual_hours = ?');
    values.push(Number(patch.actual_hours || 0));
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'calendar_tag')) {
    updates.push('calendar_tag = ?');
    values.push(String(patch.calendar_tag || 'backlog').trim());
  }

  if (updates.length === 0) return res.status(400).send('Yangilash uchun maydon topilmadi');
  updates.push('updated_at = ?');
  values.push(nowIso());
  values.push(taskId);
  await run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);
  await syncStartupTasks(existing.startup_id);

  const updated = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  res.json(mapTask(updated));
});

app.delete('/api/tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  const existing = await get('SELECT * FROM tasks WHERE id = ?', [taskId]);
  if (!existing) return res.status(204).end();

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [existing.startup_id]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  const actorId = req.query?.actor_id;
  if (actorId && !isStartupMember(startup, actorId)) {
    return res.status(403).send('Vazifani ochirish faqat startup azolariga ruxsat');
  }

  await run('DELETE FROM tasks WHERE id = ?', [taskId]);
  await syncStartupTasks(existing.startup_id);
  res.status(204).end();
});

app.get('/api/startups/:id/calendar', async (req, res) => {
  const startupId = req.params.id;
  const userId = req.query.userId;
  if (!userId) return res.status(400).send('userId talab qilinadi');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  if (!isStartupMember(startup, userId)) return res.status(403).send('Kalendar faqat startup azolari uchun');

  const rows = await all('SELECT * FROM tasks WHERE startup_id = ? ORDER BY deadline ASC', [startupId]);
  const tasks = rows.map(mapTask);
  const calendar = buildCalendarSummary(tasks);
  res.json({
    startup_id: startupId,
    summary: calendar.summary,
    events: calendar.events
  });
});

// Categories
app.get('/api/categories', async (req, res) => {
  const rows = await all('SELECT * FROM categories ORDER BY name ASC');
  res.json(rows);
});

app.post('/api/categories', async (req, res) => {
  const name = (req.body?.name || '').trim();
  if (!name) return res.status(400).send('name talab qilinadi');
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

// Startup workspace snapshot
app.get('/api/startups/:id/workspace', async (req, res) => {
  const startupId = req.params.id;
  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  const members = startup.a_zolar || [];
  const memberNameMap = Object.fromEntries(members.map((m) => [m.user_id, m.name]));

  const workspace = await ensureWorkspace(startupId, startup.egasi_id || 'system');
  const reviews = await all('SELECT * FROM peer_reviews WHERE startup_id = ? ORDER BY created_at DESC', [startupId]);
  const decisions = await all('SELECT * FROM workspace_decisions WHERE startup_id = ? ORDER BY created_at DESC', [startupId]);
  const decisionVotes = await all('SELECT * FROM decision_votes WHERE startup_id = ?', [startupId]);
  const voteCases = await all('SELECT * FROM member_vote_cases WHERE startup_id = ? ORDER BY created_at DESC', [startupId]);
  const caseBallots = await all('SELECT * FROM member_vote_ballots WHERE startup_id = ?', [startupId]);
  const equityRows = await all(
    `SELECT e.*, u.name as user_name
     FROM equity_allocations e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.startup_id = ?
     ORDER BY e.created_at DESC`,
    [startupId]
  );
  const agreements = await all(
    `SELECT * FROM safekeeping_agreements
     WHERE startup_id = ?
     ORDER BY updated_at DESC, created_at DESC`,
    [startupId]
  );
  const investorIntros = await all(
    `SELECT * FROM investor_intros
     WHERE startup_id = ?
     ORDER BY created_at DESC`,
    [startupId]
  );
  const taskRows = await all('SELECT * FROM tasks WHERE startup_id = ? ORDER BY created_at DESC', [startupId]);
  const mappedTasks = taskRows.map(mapTask);
  const activityRows = await all(
    'SELECT * FROM workspace_activity WHERE startup_id = ? ORDER BY created_at DESC',
    [startupId]
  );

  const reputation = await buildStartupReputationGraph(startupId);
  const aiRisk = await buildStartupAiRisk(startupId);
  const insights = buildWorkspaceInsights({
    startup,
    tasks: mappedTasks,
    decisions,
    memberVotes: voteCases,
    activities: activityRows
  });

  const decisionVoteSummary = decisions.map((d) => {
    const votes = decisionVotes.filter((v) => v.decision_id === d.id);
    return {
      id: d.id,
      title: d.title,
      description: d.description,
      proposer_id: d.proposer_id,
      proposer_name: memberNameMap[d.proposer_id] || d.proposer_id,
      status: d.status,
      created_at: d.created_at,
      resolved_at: d.resolved_at || null,
      votes: {
        approve: votes.filter((v) => v.vote === 'approve').length,
        reject: votes.filter((v) => v.vote === 'reject').length
      }
    };
  });

  const memberVoteSummary = voteCases.map((c) => {
    const votes = caseBallots.filter((v) => v.case_id === c.id);
    return {
      id: c.id,
      target_user_id: c.target_user_id,
      target_user_name: memberNameMap[c.target_user_id] || c.target_user_id,
      reason: c.reason,
      proposer_id: c.proposer_id,
      proposer_name: memberNameMap[c.proposer_id] || c.proposer_id,
      status: c.status,
      resolution: c.resolution || null,
      created_at: c.created_at,
      resolved_at: c.resolved_at || null,
      votes: {
        keep: votes.filter((v) => v.vote === 'keep').length,
        remove: votes.filter((v) => v.vote === 'remove').length
      }
    };
  });

  res.json({
    workspace,
    startup: {
      id: startup.id,
      segment: startup.segment,
      template_key: startup.template_key || '',
      template_name: startup.template_name || '',
      lifecycle_status: startup.lifecycle_status,
      success_fee_percent: startup.success_fee_percent,
      registry_notes: startup.registry_notes
    },
    tasks: mappedTasks,
    reviews: reviews.map((r) => ({
      id: r.id,
      startup_id: r.startup_id,
      from_user_id: r.from_user_id,
      from_user_name: memberNameMap[r.from_user_id] || r.from_user_id,
      to_user_id: r.to_user_id,
      to_user_name: memberNameMap[r.to_user_id] || r.to_user_id,
      rating: r.rating,
      task_delivery: r.task_delivery,
      collaboration: r.collaboration,
      reliability: r.reliability,
      comment: r.comment || '',
      created_at: r.created_at
    })),
    reputation,
    decisions: decisionVoteSummary,
    member_votes: memberVoteSummary,
    equity: equityRows.map((e) => ({
      id: e.id,
      startup_id: e.startup_id,
      user_id: e.user_id,
      user_name: e.user_name || memberNameMap[e.user_id] || e.user_id,
      share_percent: Number(e.share_percent || 0),
      vesting_months: Number(e.vesting_months || 0),
      cliff_months: Number(e.cliff_months || 0),
      status: e.status,
      notes: e.notes || '',
      created_at: e.created_at,
      updated_at: e.updated_at
    })),
    agreements: agreements.map((a) => ({
      id: a.id,
      startup_id: a.startup_id,
      title: a.title,
      body: a.body,
      status: a.status,
      signed_by: parseJson(a.signed_by, []),
      created_at: a.created_at,
      updated_at: a.updated_at
    })),
    investor_intros: investorIntros.map((i) => ({
      id: i.id,
      startup_id: i.startup_id,
      investor_name: i.investor_name,
      introduced_by: i.introduced_by,
      introduced_by_name: memberNameMap[i.introduced_by] || i.introduced_by,
      stage: i.stage,
      amount: Number(i.amount || 0),
      status: i.status,
      notes: i.notes || '',
      created_at: i.created_at
    })),
    ai_risk: aiRisk,
    kpi: insights.kpi,
    weekly_report: insights.weekly_report,
    calendar_summary: insights.calendar_summary
  });
});

app.post('/api/startups/:id/activity', async (req, res) => {
  const startupId = req.params.id;
  const userId = req.body?.user_id;
  const activityType = (req.body?.activity_type || '').trim();
  if (!userId || !activityType) return res.status(400).send('user_id va activity_type talab qilinadi');
  await ensureWorkspace(startupId, userId);
  const id = makeId('act');
  const created_at = nowIso();
  await run(
    `INSERT INTO workspace_activity (id, startup_id, user_id, activity_type, payload, hours_spent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      startupId,
      userId,
      activityType,
      JSON.stringify(req.body?.payload || {}),
      Number(req.body?.hours_spent || 0),
      created_at
    ]
  );
  const created = await get('SELECT * FROM workspace_activity WHERE id = ?', [id]);
  res.status(201).json({
    ...created,
    payload: parseJson(created?.payload, {})
  });
});

// Reputation graph and peer reviews
app.get('/api/startups/:id/reputation', async (req, res) => {
  const graph = await buildStartupReputationGraph(req.params.id);
  res.json(graph);
});

app.get('/api/users/:id/reputation', async (req, res) => {
  const summary = await buildUserReputationSummary(req.params.id);
  if (!summary) return res.status(404).send('Foydalanuvchi topilmadi');
  res.json(summary);
});

app.post('/api/startups/:id/reputation/reviews', async (req, res) => {
  const startupId = req.params.id;
  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  const members = startup.a_zolar || [];
  const memberIds = new Set(members.map((m) => m.user_id));

  const fromUserId = req.body?.from_user_id;
  const toUserId = req.body?.to_user_id;
  if (!fromUserId || !toUserId) return res.status(400).send('from_user_id va to_user_id talab qilinadi');
  if (fromUserId === toUserId) return res.status(400).send('Oziga baho berish mumkin emas');
  if (!memberIds.has(fromUserId) || !memberIds.has(toUserId)) {
    return res.status(400).send('Faqat ish maydoni azolari bir-birini baholay oladi');
  }

  const rating = clamp(Number(req.body?.rating || 0), 1, 5);
  const taskDelivery = clamp(Number(req.body?.task_delivery || rating), 1, 5);
  const collaboration = clamp(Number(req.body?.collaboration || rating), 1, 5);
  const reliability = clamp(Number(req.body?.reliability || rating), 1, 5);
  const created_at = nowIso();
  const id = makeId('pr');

  await run(
    `INSERT INTO peer_reviews (
      id, startup_id, from_user_id, to_user_id, rating, task_delivery, collaboration, reliability, comment, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      startupId,
      fromUserId,
      toUserId,
      rating,
      taskDelivery,
      collaboration,
      reliability,
      (req.body?.comment || '').trim(),
      created_at
    ]
  );

  await run(
    `INSERT INTO workspace_activity (id, startup_id, user_id, activity_type, payload, hours_spent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      makeId('act'),
      startupId,
      fromUserId,
      'peer_review_submitted',
      JSON.stringify({ to_user_id: toUserId, rating }),
      0,
      created_at
    ]
  );

  const created = await get('SELECT * FROM peer_reviews WHERE id = ?', [id]);
  res.status(201).json(created);
});

// Governance decisions
app.get('/api/startups/:id/decisions', async (req, res) => {
  const startupId = req.params.id;
  const decisions = await all(
    'SELECT * FROM workspace_decisions WHERE startup_id = ? ORDER BY created_at DESC',
    [startupId]
  );
  const votes = await all('SELECT * FROM decision_votes WHERE startup_id = ?', [startupId]);
  res.json(decisions.map((d) => {
    const relatedVotes = votes.filter((v) => v.decision_id === d.id);
    return {
      ...d,
      votes: {
        approve: relatedVotes.filter((v) => v.vote === 'approve').length,
        reject: relatedVotes.filter((v) => v.vote === 'reject').length
      }
    };
  }));
});

app.post('/api/startups/:id/decisions', async (req, res) => {
  const startupId = req.params.id;
  const title = (req.body?.title || '').trim();
  const description = (req.body?.description || '').trim();
  const proposerId = req.body?.proposer_id;
  if (!title || !proposerId) return res.status(400).send('title va proposer_id talab qilinadi');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  const memberIds = new Set((startup.a_zolar || []).map((m) => m.user_id));
  if (!memberIds.has(proposerId)) return res.status(403).send('Qaror yaratish faqat azolarga ruxsat');

  const id = makeId('dec');
  const created_at = nowIso();
  await run(
    `INSERT INTO workspace_decisions (id, startup_id, title, description, proposer_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, startupId, title, description, proposerId, 'open', created_at]
  );

  await run(
    `INSERT INTO workspace_activity (id, startup_id, user_id, activity_type, payload, hours_spent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      makeId('act'),
      startupId,
      proposerId,
      'decision_created',
      JSON.stringify({ decision_id: id }),
      0,
      created_at
    ]
  );

  const created = await get('SELECT * FROM workspace_decisions WHERE id = ?', [id]);
  res.status(201).json(created);
});

app.post('/api/decisions/:id/vote', async (req, res) => {
  const decisionId = req.params.id;
  const voterId = req.body?.voter_id;
  const vote = req.body?.vote;
  if (!voterId || !['approve', 'reject'].includes(vote)) {
    return res.status(400).send('voter_id va togri vote talab qilinadi');
  }

  const decision = await get('SELECT * FROM workspace_decisions WHERE id = ?', [decisionId]);
  if (!decision) return res.status(404).send('Qaror topilmadi');
  if (decision.status !== 'open') return res.status(400).send('Qaror allaqachon yakunlangan');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [decision.startup_id]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  const memberIds = new Set((startup.a_zolar || []).map((m) => m.user_id));
  if (!memberIds.has(voterId)) return res.status(403).send('Faqat azolar ovoz bera oladi');

  const existing = await get('SELECT * FROM decision_votes WHERE decision_id = ? AND voter_id = ?', [decisionId, voterId]);
  if (existing) {
    await run('UPDATE decision_votes SET vote = ?, created_at = ? WHERE id = ?', [vote, nowIso(), existing.id]);
  } else {
    await run(
      `INSERT INTO decision_votes (id, decision_id, startup_id, voter_id, vote, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [makeId('dv'), decisionId, decision.startup_id, voterId, vote, nowIso()]
    );
  }

  const rows = await all('SELECT vote, COUNT(*) as count FROM decision_votes WHERE decision_id = ? GROUP BY vote', [decisionId]);
  const approve = rows.find((r) => r.vote === 'approve')?.count || 0;
  const reject = rows.find((r) => r.vote === 'reject')?.count || 0;
  const majority = Math.floor(memberIds.size / 2) + 1;

  let status = decision.status;
  if (approve >= majority) status = 'approved';
  if (reject >= majority) status = 'rejected';
  if (status !== decision.status) {
    await run(
      'UPDATE workspace_decisions SET status = ?, resolved_at = ? WHERE id = ?',
      [status, nowIso(), decisionId]
    );
  }

  const updated = await get('SELECT * FROM workspace_decisions WHERE id = ?', [decisionId]);
  res.json({
    ...updated,
    votes: { approve, reject },
    majority_required: majority
  });
});

// Founder member vote (who stays/leaves)
app.get('/api/startups/:id/member-votes', async (req, res) => {
  const startupId = req.params.id;
  const cases = await all('SELECT * FROM member_vote_cases WHERE startup_id = ? ORDER BY created_at DESC', [startupId]);
  const ballots = await all('SELECT * FROM member_vote_ballots WHERE startup_id = ?', [startupId]);
  res.json(cases.map((c) => {
    const related = ballots.filter((b) => b.case_id === c.id);
    return {
      ...c,
      votes: {
        keep: related.filter((b) => b.vote === 'keep').length,
        remove: related.filter((b) => b.vote === 'remove').length
      }
    };
  }));
});

app.post('/api/startups/:id/member-votes', async (req, res) => {
  const startupId = req.params.id;
  const targetUserId = req.body?.target_user_id;
  const reason = (req.body?.reason || '').trim();
  const proposerId = req.body?.proposer_id;
  if (!targetUserId || !reason || !proposerId) {
    return res.status(400).send('target_user_id, reason, proposer_id talab qilinadi');
  }

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  const members = startup.a_zolar || [];
  const memberIds = new Set(members.map((m) => m.user_id));
  if (!memberIds.has(proposerId) || !memberIds.has(targetUserId)) {
    return res.status(400).send('Taklif beruvchi ham, nomzod ham startup azosi bolishi kerak');
  }

  const id = makeId('mvc');
  const created_at = nowIso();
  await run(
    `INSERT INTO member_vote_cases (id, startup_id, target_user_id, reason, proposer_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, startupId, targetUserId, reason, proposerId, 'open', created_at]
  );

  await run(
    `INSERT INTO workspace_activity (id, startup_id, user_id, activity_type, payload, hours_spent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      makeId('act'),
      startupId,
      proposerId,
      'member_vote_opened',
      JSON.stringify({ vote_case_id: id, target_user_id: targetUserId }),
      0,
      created_at
    ]
  );

  const created = await get('SELECT * FROM member_vote_cases WHERE id = ?', [id]);
  res.status(201).json(created);
});

app.post('/api/member-votes/:id/cast', async (req, res) => {
  const caseId = req.params.id;
  const voterId = req.body?.voter_id;
  const vote = req.body?.vote;
  if (!voterId || !['keep', 'remove'].includes(vote)) {
    return res.status(400).send('voter_id va togri vote talab qilinadi');
  }

  const voteCase = await get('SELECT * FROM member_vote_cases WHERE id = ?', [caseId]);
  if (!voteCase) return res.status(404).send('Ovoz holati topilmadi');
  if (voteCase.status !== 'open') return res.status(400).send('Ovoz holati allaqachon yakunlangan');

  const startupRow = await get('SELECT * FROM startups WHERE id = ?', [voteCase.startup_id]);
  if (!startupRow) return res.status(404).send('Startup topilmadi');
  const startup = mapStartup(startupRow);
  const members = startup.a_zolar || [];
  const eligibleVoters = members.filter((m) => m.user_id !== voteCase.target_user_id);
  const eligibleIds = new Set(eligibleVoters.map((m) => m.user_id));
  if (!eligibleIds.has(voterId)) return res.status(403).send('Faqat mos azolar ovoz bera oladi');

  const existing = await get('SELECT * FROM member_vote_ballots WHERE case_id = ? AND voter_id = ?', [caseId, voterId]);
  if (existing) {
    await run('UPDATE member_vote_ballots SET vote = ?, created_at = ? WHERE id = ?', [vote, nowIso(), existing.id]);
  } else {
    await run(
      `INSERT INTO member_vote_ballots (id, case_id, startup_id, voter_id, vote, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [makeId('mvb'), caseId, voteCase.startup_id, voterId, vote, nowIso()]
    );
  }

  const rows = await all(
    'SELECT vote, COUNT(*) as count FROM member_vote_ballots WHERE case_id = ? GROUP BY vote',
    [caseId]
  );
  const keepCount = rows.find((r) => r.vote === 'keep')?.count || 0;
  const removeCount = rows.find((r) => r.vote === 'remove')?.count || 0;
  const majority = Math.floor(eligibleVoters.length / 2) + 1;

  let status = voteCase.status;
  let resolution = voteCase.resolution;
  if (removeCount >= majority) {
    status = 'resolved';
    resolution = 'removed';
    const nextMembers = members.filter((m) => m.user_id !== voteCase.target_user_id);
    await run('UPDATE startups SET a_zolar = ? WHERE id = ?', [JSON.stringify(nextMembers), voteCase.startup_id]);
  } else if (keepCount >= majority) {
    status = 'resolved';
    resolution = 'kept';
  }

  if (status !== voteCase.status) {
    await run(
      'UPDATE member_vote_cases SET status = ?, resolution = ?, resolved_at = ? WHERE id = ?',
      [status, resolution, nowIso(), caseId]
    );
  }

  const updated = await get('SELECT * FROM member_vote_cases WHERE id = ?', [caseId]);
  res.json({
    ...updated,
    votes: { keep: keepCount, remove: removeCount },
    majority_required: majority
  });
});

// Equity ledger
app.get('/api/startups/:id/equity', async (req, res) => {
  const startupId = req.params.id;
  const rows = await all(
    `SELECT e.*, u.name as user_name
     FROM equity_allocations e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.startup_id = ?
     ORDER BY e.created_at DESC`,
    [startupId]
  );
  res.json(rows.map((e) => ({
    ...e,
    share_percent: Number(e.share_percent || 0),
    vesting_months: Number(e.vesting_months || 0),
    cliff_months: Number(e.cliff_months || 0)
  })));
});

app.post('/api/startups/:id/equity', async (req, res) => {
  const startupId = req.params.id;
  const userId = req.body?.user_id;
  const share = Number(req.body?.share_percent);
  if (!userId || !Number.isFinite(share)) return res.status(400).send('user_id va share_percent talab qilinadi');

  const existing = await get(
    `SELECT * FROM equity_allocations WHERE startup_id = ? AND user_id = ? AND status != 'archived'`,
    [startupId, userId]
  );
  const timestamp = nowIso();
  if (existing) {
    await run(
      `UPDATE equity_allocations
       SET share_percent = ?, vesting_months = ?, cliff_months = ?, notes = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [
        share,
        Number(req.body?.vesting_months || existing.vesting_months || 48),
        Number(req.body?.cliff_months || existing.cliff_months || 12),
        (req.body?.notes || existing.notes || '').trim(),
        req.body?.status || existing.status || 'active',
        timestamp,
        existing.id
      ]
    );
    const updated = await get('SELECT * FROM equity_allocations WHERE id = ?', [existing.id]);
    return res.json(updated);
  }

  const id = makeId('eq');
  await run(
    `INSERT INTO equity_allocations (
      id, startup_id, user_id, share_percent, vesting_months, cliff_months, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      startupId,
      userId,
      share,
      Number(req.body?.vesting_months || 48),
      Number(req.body?.cliff_months || 12),
      req.body?.status || 'active',
      (req.body?.notes || '').trim(),
      timestamp,
      timestamp
    ]
  );
  const created = await get('SELECT * FROM equity_allocations WHERE id = ?', [id]);
  res.status(201).json(created);
});

app.put('/api/equity/:id', async (req, res) => {
  const id = req.params.id;
  const { fields, values } = buildUpdate(req.body);
  if (fields.length === 0) return res.status(400).send('Yangilash uchun maydon topilmadi');
  fields.push('updated_at = ?');
  values.push(nowIso());
  values.push(id);
  await run(`UPDATE equity_allocations SET ${fields.join(', ')} WHERE id = ?`, values);
  const updated = await get('SELECT * FROM equity_allocations WHERE id = ?', [id]);
  if (!updated) return res.status(404).send('Ulush yozuvi topilmadi');
  res.json(updated);
});

app.delete('/api/equity/:id', async (req, res) => {
  const id = req.params.id;
  await run('UPDATE equity_allocations SET status = ?, updated_at = ? WHERE id = ?', ['archived', nowIso(), id]);
  res.status(204).end();
});

// Registry + Agreements + Investor flow
app.get('/api/startups/:id/agreements', async (req, res) => {
  const rows = await all(
    `SELECT * FROM safekeeping_agreements WHERE startup_id = ?
     ORDER BY updated_at DESC, created_at DESC`,
    [req.params.id]
  );
  res.json(rows.map((a) => ({ ...a, signed_by: parseJson(a.signed_by, []) })));
});

app.post('/api/startups/:id/agreements', async (req, res) => {
  const startupId = req.params.id;
  const title = (req.body?.title || '').trim();
  const body = (req.body?.body || '').trim();
  if (!title || !body) return res.status(400).send('title va body talab qilinadi');
  const id = makeId('agr');
  const timestamp = nowIso();
  await run(
    `INSERT INTO safekeeping_agreements (id, startup_id, title, body, status, signed_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      startupId,
      title,
      body,
      req.body?.status || 'draft',
      JSON.stringify(req.body?.signed_by || []),
      timestamp,
      timestamp
    ]
  );
  const created = await get('SELECT * FROM safekeeping_agreements WHERE id = ?', [id]);
  res.status(201).json({ ...created, signed_by: parseJson(created?.signed_by, []) });
});

app.put('/api/agreements/:id', async (req, res) => {
  const id = req.params.id;
  const payload = { ...req.body };
  if (payload.signed_by !== undefined) payload.signed_by = JSON.stringify(payload.signed_by || []);
  const { fields, values } = buildUpdate(payload);
  if (fields.length === 0) return res.status(400).send('Yangilash uchun maydon topilmadi');
  fields.push('updated_at = ?');
  values.push(nowIso());
  values.push(id);
  await run(`UPDATE safekeeping_agreements SET ${fields.join(', ')} WHERE id = ?`, values);
  const updated = await get('SELECT * FROM safekeeping_agreements WHERE id = ?', [id]);
  if (!updated) return res.status(404).send('Kelishuv topilmadi');
  res.json({ ...updated, signed_by: parseJson(updated.signed_by, []) });
});

app.get('/api/startups/:id/investor-intros', async (req, res) => {
  const rows = await all(
    `SELECT * FROM investor_intros WHERE startup_id = ? ORDER BY created_at DESC`,
    [req.params.id]
  );
  res.json(rows.map((i) => ({ ...i, amount: Number(i.amount || 0) })));
});

app.post('/api/startups/:id/investor-intros', async (req, res) => {
  const startupId = req.params.id;
  const investorName = (req.body?.investor_name || '').trim();
  const introducedBy = req.body?.introduced_by;
  if (!investorName || !introducedBy) return res.status(400).send('investor_name va introduced_by talab qilinadi');
  const id = makeId('inv');
  await run(
    `INSERT INTO investor_intros (
      id, startup_id, investor_name, introduced_by, stage, amount, status, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      startupId,
      investorName,
      introducedBy,
      req.body?.stage || 'seed',
      Number(req.body?.amount || 0),
      req.body?.status || 'planned',
      (req.body?.notes || '').trim(),
      nowIso()
    ]
  );
  const created = await get('SELECT * FROM investor_intros WHERE id = ?', [id]);
  res.status(201).json({ ...created, amount: Number(created?.amount || 0) });
});

app.put('/api/investor-intros/:id', async (req, res) => {
  const id = req.params.id;
  const { fields, values } = buildUpdate(req.body);
  if (fields.length === 0) return res.status(400).send('Yangilash uchun maydon topilmadi');
  values.push(id);
  await run(`UPDATE investor_intros SET ${fields.join(', ')} WHERE id = ?`, values);
  const updated = await get('SELECT * FROM investor_intros WHERE id = ?', [id]);
  if (!updated) return res.status(404).send('Investor yozuvi topilmadi');
  res.json({ ...updated, amount: Number(updated.amount || 0) });
});

app.put('/api/startups/:id/registry', async (req, res) => {
  const startupId = req.params.id;
  const lifecycleStatus = req.body?.lifecycle_status || 'live';
  const successFee = Number(req.body?.success_fee_percent);
  const notes = req.body?.registry_notes || '';
  await run(
    `UPDATE startups
     SET lifecycle_status = ?, success_fee_percent = ?, registry_notes = ?
     WHERE id = ?`,
    [
      lifecycleStatus,
      Number.isFinite(successFee) ? successFee : 1.5,
      notes,
      startupId
    ]
  );
  const updated = await get('SELECT * FROM startups WHERE id = ?', [startupId]);
  await logAction(req.body?.actor_id, 'update_registry', 'startup', startupId, {
    lifecycle_status: lifecycleStatus,
    success_fee_percent: Number.isFinite(successFee) ? successFee : 1.5
  });
  res.json(mapStartup(updated));
});

// AI Decision Engine
app.get('/api/startups/:id/ai-risk', async (req, res) => {
  const report = await buildStartupAiRisk(req.params.id);
  if (!report) return res.status(404).send('Startup topilmadi');
  res.json(report);
});

const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Topilmadi' });
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const start = async () => {
  await init();
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
};

start();

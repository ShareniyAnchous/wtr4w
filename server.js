/* ============================================================================
 * NebulaMind — server.js
 * Express + express-session + bcryptjs + socket.io + fs
 * Хранение данных: users.json / messages.json / profiles.json рядом с сервером.
 * Запуск: node server.js  →  http://localhost:3000
 * ==========================================================================*/

'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');

const PORT = 3000;
const ROOT = __dirname;

const USERS_FILE = path.join(ROOT, 'users.json');
const MESSAGES_FILE = path.join(ROOT, 'messages.json');
const PROFILES_FILE = path.join(ROOT, 'profiles.json');

const ADMIN_LOGIN = 'Maks';
const ADMIN_PASSWORD = 'simsig228';

const LIMITS = { text: 2000, bio: 500, avatar: 2000, status: 100 };

/* ----------------------------- JSON helpers ------------------------------ */

function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const data = JSON.parse(raw);
    return data === null || data === undefined ? fallback : data;
  } catch (e) {
    return fallback;
  }
}

// Атомарная запись: temp-файл + rename, чтобы не побить файл при сбое.
function writeJson(file, data) {
  const tmp = file + '.tmp-' + Math.random().toString(36).slice(2);
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

/* ------------------------------- Data load ------------------------------- */

let users = readJson(USERS_FILE, null);      // [{username, passwordHash, createdAt, isAdmin}]
let messages = readJson(MESSAGES_FILE, []);  // [{id, user, text, time}]
let profiles = readJson(PROFILES_FILE, {});  // {username: {bio, avatar, status}}

if (!Array.isArray(users)) users = [];
if (!Array.isArray(messages)) messages = [];
if (!profiles || typeof profiles !== 'object' || Array.isArray(profiles)) profiles = {};

// Предустановленный админ (пароль хешируется bcrypt при первом запуске).
function ensureAdmin() {
  const exists = users.some((u) => u.username.toLowerCase() === ADMIN_LOGIN.toLowerCase());
  if (exists) return false;
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  users.push({ username: ADMIN_LOGIN, passwordHash: hash, createdAt: new Date().toISOString(), isAdmin: true });
  writeJson(USERS_FILE, users);
  return true;
}
const adminCreated = ensureAdmin();
writeJson(MESSAGES_FILE, messages);
writeJson(PROFILES_FILE, profiles);

/* ------------------------------- App setup ------------------------------- */

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const SESSION_SECRET = process.env.NEBULAMIND_SECRET || crypto.randomBytes(32).toString('hex');

app.use(
  session({
    name: 'nebula.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 часа
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);

/* -------------------------------- Helpers -------------------------------- */

function findUser(name) {
  if (typeof name !== 'string') return null;
  const low = name.trim().toLowerCase();
  return users.find((u) => u.username.toLowerCase() === low) || null;
}

function isValidUsername(name) {
  return (
    typeof name === 'string' &&
    name.trim().length >= 2 &&
    name.trim().length <= 32 &&
    /^[A-Za-zА-Яа-яЁё0-9_\- ]+$/.test(name.trim())
  );
}

function publicProfile(username) {
  const p = profiles[username] || profiles[Object.keys(profiles).find((k) => k.toLowerCase() === username.toLowerCase())] || {};
  return { username, bio: p.bio || '', avatar: p.avatar || '', status: p.status || '' };
}

function sanitizeText(s, max) {
  if (typeof s !== 'string') return '';
  return s.slice(0, max);
}

function requireLogin(req, res, next) {
  if (req.session && req.session.username) return next();
  return res.status(401).json({ error: 'Требуется вход в аккаунт' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin === true) return next();
  return res.status(403).json({ error: 'Доступ только для администраторов' });
}

/* --------------------------- Auth & session API -------------------------- */

app.post('/api/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!isValidUsername(username)) {
    return res.status(400).json({ error: 'Логин должен содержать минимум 2 символа (буквы/цифры/_)' });
  }
  if (typeof password !== 'string' || password.length < 4) {
    return res.status(400).json({ error: 'Пароль должен содержать минимум 4 символа' });
  }
  const name = String(username).trim();
  if (findUser(name)) {
    return res.status(409).json({ error: 'Такой логин уже занят' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const user = { username: name, passwordHash: hash, createdAt: new Date().toISOString(), isAdmin: false };
  users.push(user);
  writeJson(USERS_FILE, users);
  req.session.username = user.username;
  req.session.isAdmin = !!user.isAdmin;
  console.log(`[NebulaMind] зарегистрирован пользователь: ${user.username}`);
  res.json({ ok: true, username: user.username, isAdmin: user.isAdmin });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = findUser(typeof username === 'string' ? username : '');
  if (!user || typeof password !== 'string' || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  req.session.username = user.username;
  req.session.isAdmin = !!user.isAdmin;
  console.log(`[NebulaMind] вход: ${user.username}`);
  res.json({ ok: true, username: user.username, isAdmin: user.isAdmin });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('nebula.sid');
    res.json({ ok: true });
  });
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.username) {
    return res.json({ loggedIn: true, username: req.session.username, isAdmin: !!req.session.isAdmin });
  }
  res.json({ loggedIn: false, username: null, isAdmin: false });
});

/* ------------------------------ Profile API ------------------------------ */

app.get('/api/profile/:username', (req, res) => {
  const u = findUser(req.params.username);
  if (!u) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(publicProfile(u.username));
});

app.post('/api/profile', requireLogin, (req, res) => {
  const body = req.body || {};
  const uname = req.session.username;
  const cur = profiles[uname] || { bio: '', avatar: '', status: '' };
  const next = {
    bio: Object.prototype.hasOwnProperty.call(body, 'bio') ? sanitizeText(body.bio, LIMITS.bio) : cur.bio,
    avatar: Object.prototype.hasOwnProperty.call(body, 'avatar') ? sanitizeText(body.avatar, LIMITS.avatar) : cur.avatar,
    status: Object.prototype.hasOwnProperty.call(body, 'status') ? sanitizeText(body.status, LIMITS.status) : cur.status,
  };
  // data-URL аватара разрешаем только для картинок.
  if (next.avatar.startsWith('data:') && !/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(next.avatar)) {
    next.avatar = '';
  }
  profiles[uname] = next;
  writeJson(PROFILES_FILE, profiles);
  io.emit('profile_updated', { username: uname });
  res.json({ ok: true, profile: publicProfile(uname) });
});

/* ------------------------------ Message REST ----------------------------- */

app.get('/api/messages', requireLogin, (req, res) => {
  res.json(messages);
});

/* ------------------------------- Admin API ------------------------------- */

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayMessages = messages.filter((m) => String(m.time || '').slice(0, 10) === todayKey).length;
  const filledProfiles = Object.values(profiles).filter(
    (p) => p && ((p.bio && p.bio.trim()) || (p.status && p.status.trim()) || (p.avatar && p.avatar.trim()))
  ).length;
  res.json({
    totalUsers: users.length,
    totalMessages: messages.length,
    todayMessages,
    filledProfiles,
    admins: users.filter((u) => u.isAdmin).map((u) => u.username),
    online: io.engine.clientsCount,
  });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const list = users.map((u) => {
    const msgs = messages.filter((m) => m.user && m.user.toLowerCase() === u.username.toLowerCase());
    const last = msgs.length ? msgs[msgs.length - 1] : null;
    const p = profiles[u.username] || {};
    return {
      username: u.username,
      createdAt: u.createdAt,
      isAdmin: !!u.isAdmin,
      messageCount: msgs.length,
      lastMessage: last ? { id: last.id, text: String(last.text).slice(0, 120), time: last.time } : null,
      status: p.status || '',
      bio: p.bio || '',
    };
  });
  res.json(list);
});

app.get('/api/admin/messages', requireAdmin, (req, res) => {
  const userFilter = typeof req.query.user === 'string' ? req.query.user.trim().toLowerCase() : '';
  const list = userFilter
    ? messages.filter((m) => m.user && m.user.toLowerCase() === userFilter)
    : messages.slice();
  res.json(list);
});

app.delete('/api/admin/message/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Некорректный id сообщения' });
  const idx = messages.findIndex((m) => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Сообщение не найдено' });
  const [removed] = messages.splice(idx, 1);
  writeJson(MESSAGES_FILE, messages);
  io.emit('message_deleted', { id: removed.id });
  res.json({ ok: true, removed });
});

/* ---------------------------- Page protection ---------------------------- */

app.get('/', (req, res, next) => {
  if (req.session && req.session.username) return next();
  return res.redirect('/login.html');
});

app.get('/admin', (req, res) => {
  if (!(req.session && req.session.username)) return res.redirect('/login.html');
  if (!req.session.isAdmin) return res.status(403).sendFile(path.join(ROOT, 'public', 'forbidden.html'));
  return res.sendFile(path.join(ROOT, 'public', 'admin.html'));
});

app.use(express.static(path.join(ROOT, 'public')));

// 404 для неизвестных API-маршрутов
app.use('/api', (req, res) => res.status(404).json({ error: 'Неизвестный эндпоинт' }));

/* -------------------------------- Socket.IO ------------------------------ */

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('==========================================================');
  console.log('  NebulaMind запущен');
  console.log('  Локально:      http://localhost:' + PORT);
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const info of ifaces[name] || []) {
      if (info.family === 'IPv4' && !info.internal) {
        console.log('  Сетевой адрес: http://' + info.address + ':' + PORT + '   (' + name + ')');
      }
    }
  }
  console.log('  ---------------------------------------------------------');
  if (adminCreated) {
    console.log('  Создан предустановленный админ:');
    console.log('    логин:  ' + ADMIN_LOGIN);
    console.log('    пароль: ' + ADMIN_PASSWORD);
  } else {
    console.log('  Админ уже существует в users.json: ' + ADMIN_LOGIN);
  }
  console.log('==========================================================');
});

const io = new Server(server);

io.on('connection', (socket) => {
  function broadcastOnline() {
    const online = [];
    for (const id in io.sockets.sockets) {
      const s = io.sockets.sockets[id];
      if (s.username && !online.includes(s.username)) online.push(s.username);
    }
    io.emit('online', online);
  }

  socket.on('join', (username) => {
    if (typeof username !== 'string' || !username.trim()) return;
    socket.username = username.trim().slice(0, 32);
    socket.join(socket.username);
    socket.emit('history', messages);
    broadcastOnline();
    console.log('[NebulaMind] в сеть: ' + socket.username);
  });

  socket.on('message', (payload) => {
    // Защита: socket.username обязан быть установлен через join.
    if (!socket.username) return;
    let text = payload && typeof payload === 'object' ? payload.text : payload;
    if (typeof text !== 'string') return;
    text = text.trim();
    if (!text) return;
    if (text.length > LIMITS.text) text = text.slice(0, LIMITS.text);

    const msg = {
      id: messages.length ? messages[messages.length - 1].id + 1 : 1,
      user: socket.username,
      text,
      time: new Date().toISOString(),
    };
    messages.push(msg);
    writeJson(MESSAGES_FILE, messages);
    io.emit('message', msg);
  });

  socket.on('disconnect', () => {
    if (socket.username) console.log('[NebulaMind] вышел из сети: ' + socket.username);
    broadcastOnline();
  });
});

module.exports = { app, server, io };

const SUPABASE_URL = 'https://bwvqyldgewxoeyxqooyw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hyC6dy3uyhMUEQZZ7Ysw2g_VzhUdYPC';

const { createClient } = supabase;

// ── Persist session in localStorage for instant auth on reload ────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession:     true,
    storageKey:         'crm-session',
    storage:            window.localStorage,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  }
});

// ── Warm up connection immediately (avoids cold-start delay) ──────────────────
sb.from('users').select('id').limit(1).then(() => {});

// ── AUTH HELPERS ──────────────────────────────────────────────────────────────

async function getSession() {
  // Try localStorage first — instant, no network call
  const { data } = await sb.auth.getSession();
  return data.session;
}

async function getUser() {
  const session = await getSession();
  return session?.user || null;
}

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
    window.location.href = base + 'index.html';
  }
  return session;
}

// ── TOAST ─────────────────────────────────────────────────────────────────────

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ''; }, 3500);
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────

async function doLogout() {
  await sb.auth.signOut();
  const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
  window.location.href = base + 'index.html';
}

// ── SIDEBAR ACTIVE ────────────────────────────────────────────────────────────

function setActiveNav() {
  const path = window.location.pathname.split('/').pop() || window.location.href.split('/').pop().split('?')[0];
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === path);
  });
}

// ── USER INITIALS ─────────────────────────────────────────────────────────────

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ── LOAD SIDEBAR USER INFO ────────────────────────────────────────────────────

async function loadSidebarUser() {
  const user = await getUser();
  if (!user) return;

  // Check cache first
  const cached = sessionStorage.getItem('crm-user-profile');
  if (cached) {
    const p = JSON.parse(cached);
    _applySidebarUser(p.name, user.email);
    return;
  }

  const { data: profile } = await sb.from('users').select('name').eq('auth_id', user.id).maybeSingle();
  const name = profile?.name || user.email;
  sessionStorage.setItem('crm-user-profile', JSON.stringify({ name }));
  _applySidebarUser(name, user.email);
}

function _applySidebarUser(name, email) {
  const el = document.getElementById('sidebar-user-name');
  const em = document.getElementById('sidebar-user-email');
  const av = document.getElementById('sidebar-user-avatar');
  if (el) el.textContent = name;
  if (em) em.textContent = email;
  if (av) av.textContent = initials(name);
}

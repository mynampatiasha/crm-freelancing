const SUPABASE_URL = 'https://bwvqyldgewxoeyxqooyw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hyC6dy3uyhMUEQZZ7Ysw2g_VzhUdYPC';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── AUTH HELPERS ──────────────────────────────────────────────────────────────

async function getSession() {
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
    window.location.href = '/index.html';
  }
  return session;
}

// ── TOAST ─────────────────────────────────────────────────────────────────────

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `show ${type}`;
  setTimeout(() => t.className = '', 3000);
}

// ── LOGOUT ────────────────────────────────────────────────────────────────────

async function doLogout() {
  await sb.auth.signOut();
  window.location.href = '/index.html';
}

// ── SIDEBAR ACTIVE ────────────────────────────────────────────────────────────

function setActiveNav() {
  const path = window.location.pathname.split('/').pop();
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
  const { data: profile } = await sb.from('users').select('name').eq('id', user.id).single();
  const name = profile?.name || user.email;
  const el = document.getElementById('sidebar-user-name');
  const em = document.getElementById('sidebar-user-email');
  const av = document.getElementById('sidebar-user-avatar');
  if (el) el.textContent = name;
  if (em) em.textContent = user.email;
  if (av) av.textContent = initials(name);
}

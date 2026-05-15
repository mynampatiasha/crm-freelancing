// ============================================================================
// firebase.js — drop-in replacement for supabase.js
// Place this file at: js/firebase.js
// All function names match supabase.js so NO changes needed in other pages
// ============================================================================

import { initializeApp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc,
         updateDoc, deleteDoc, query, orderBy, where, serverTimestamp,
         Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDYamYVtOFHujAwWw6ZtB_IH4iCwC08cgk",
  authDomain:        "crm-freelancing.firebaseapp.com",
  projectId:         "crm-freelancing",
  storageBucket:     "crm-freelancing.firebasestorage.app",
  messagingSenderId: "1051327819879",
  appId:             "1:1051327819879:web:89143c48f76120128d64c2"
};

const _app  = initializeApp(firebaseConfig);
const _auth = getAuth(_app);
const _db   = getFirestore(_app);

// ── Expose db shortcuts globally ─────────────────────────────────────────────
window._db          = _db;
window._auth        = _auth;
window.collection   = collection;
window.doc          = doc;
window.getDoc       = getDoc;
window.getDocs      = getDocs;
window.addDoc       = addDoc;
window.updateDoc    = updateDoc;
window.deleteDoc    = deleteDoc;
window.query        = query;
window.orderBy      = orderBy;
window.where        = where;
window.serverTimestamp = serverTimestamp;

// ============================================================================
// sb — Supabase-compatible wrapper so existing page code works unchanged
// Usage: sb.from('clients').select() / .insert() / .update() / .delete()
// ============================================================================
window.sb = {
  from(collectionName) {
    return new FirestoreQueryBuilder(collectionName);
  },
  auth: {
    async signInWithPassword({ email, password }) {
      try {
        const cred = await signInWithEmailAndPassword(_auth, email, password);
        return { data: { user: cred.user, session: cred.user }, error: null };
      } catch(e) {
        return { data: null, error: { message: e.message } };
      }
    },
    async signOut() {
      await signOut(_auth);
      return { error: null };
    },
    async getSession() {
      return new Promise(resolve => {
        onAuthStateChanged(_auth, user => {
          resolve({ data: { session: user ? { user } : null } });
        });
      });
    },
    async signUp({ email, password, options }) {
      // For users.html — we just create the DB record, Firebase auth signup
      const { createUserWithEmailAndPassword } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
      try {
        const cred = await createUserWithEmailAndPassword(_auth, email, password);
        return { data: { user: cred.user }, error: null };
      } catch(e) {
        return { data: null, error: { message: e.message } };
      }
    }
  },
  storage: {
    from(bucket) {
      return {
        async upload(path, file, opts) {
          // Firebase Storage upload
          try {
            const { getStorage, ref, uploadBytes } = await import(
              "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js");
            const storage = getStorage(_app);
            const storageRef = ref(storage, `${bucket}/${path}`);
            await uploadBytes(storageRef, file);
            return { error: null };
          } catch(e) {
            return { error: { message: e.message } };
          }
        },
        getPublicUrl(path) {
          // Return Firebase Storage public URL pattern
          const url = `https://firebasestorage.googleapis.com/v0/b/crm-freelancing.firebasestorage.app/o/${encodeURIComponent(bucket + '/' + path)}?alt=media`;
          return { data: { publicUrl: url } };
        }
      };
    }
  }
};

// ============================================================================
// FirestoreQueryBuilder — mimics Supabase chained query API
// ============================================================================
class FirestoreQueryBuilder {
  constructor(collectionName) {
    this._col     = collectionName;
    this._filters = [];
    this._orderField = null;
    this._orderDir   = 'asc';
    this._selectFields = null;
    this._insertData   = null;
    this._updateData   = null;
    this._deleteMode   = false;
    this._docId        = null;
    this._eqFilters    = [];
  }

  select(fields = '*') {
    this._selectFields = fields;
    return this;
  }

  order(field, opts = {}) {
    this._orderField = field;
    this._orderDir   = opts.ascending === false ? 'desc' : 'asc';
    return this;
  }

  eq(field, value) {
    this._eqFilters.push({ field, value });
    this._docId = value; // keep for single-doc ops
    return this;
  }

  insert(data) {
    this._insertData = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data) {
    this._updateData = data;
    return this;
  }

  delete() {
    this._deleteMode = true;
    return this;
  }

  // .maybeSingle() — return first doc or null
  async maybeSingle() {
    const result = await this._execute();
    if (result.error) return result;
    const data = result.data?.length ? result.data[0] : null;
    return { data, error: null };
  }

  // Thenable — await sb.from(...).select(...)
  then(resolve, reject) {
    this._execute().then(resolve).catch(reject);
  }

  async _execute() {
    try {
      const colRef = collection(_db, this._col);

      // ── INSERT ──
      if (this._insertData) {
        const inserted = [];
        for (const item of this._insertData) {
          const payload = { ...item, created_at: serverTimestamp(), updated_at: serverTimestamp() };
          const ref = await addDoc(colRef, payload);
          inserted.push({ id: ref.id, ...item });
        }
        return { data: inserted, error: null };
      }

      // ── UPDATE ──
      if (this._updateData) {
        const payload = { ...this._updateData, updated_at: serverTimestamp() };
        // find docs matching eq filters
        const ids = await this._resolveIds();
        for (const id of ids) {
          await updateDoc(doc(_db, this._col, id), payload);
        }
        return { data: null, error: null };
      }

      // ── DELETE ──
      if (this._deleteMode) {
        const ids = await this._resolveIds();
        for (const id of ids) {
          await deleteDoc(doc(_db, this._col, id));
        }
        return { data: null, error: null };
      }

      // ── SELECT ──
      let constraints = [];
      for (const f of this._eqFilters) {
        if (f.field !== 'id') constraints.push(where(f.field, '==', f.value));
      }

      // Special case: single doc by Firestore ID
      const idFilter = this._eqFilters.find(f => f.field === 'id');
      if (idFilter) {
        const snap = await getDoc(doc(_db, this._col, idFilter.value));
        if (!snap.exists()) return { data: [], error: null };
        return { data: [{ id: snap.id, ...this._convertDoc(snap.data()) }], error: null };
      }

      if (this._orderField) {
        constraints.push(orderBy(this._orderField, this._orderDir));
      }

      const q    = constraints.length ? query(colRef, ...constraints) : query(colRef);
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...this._convertDoc(d.data()) }));
      return { data, error: null };

    } catch(e) {
      console.error('FirestoreQueryBuilder error:', e);
      return { data: null, error: { message: e.message } };
    }
  }

  // Resolve doc IDs from eq filters (for update/delete)
  async _resolveIds() {
    const idFilter = this._eqFilters.find(f => f.field === 'id');
    if (idFilter) return [idFilter.value];

    // query by other fields
    const colRef = collection(_db, this._col);
    let constraints = this._eqFilters.map(f => where(f.field, '==', f.value));
    const q    = query(colRef, ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => d.id);
  }

  // Convert Firestore Timestamps → ISO strings (matches Supabase format)
  _convertDoc(data) {
    const out = {};
    for (const [k, v] of Object.entries(data)) {
      if (v && typeof v.toDate === 'function') {
        out[k] = v.toDate().toISOString();
      } else {
        out[k] = v;
      }
    }
    return out;
  }
}

// ============================================================================
// AUTH HELPERS — same signatures as supabase.js
// ============================================================================

async function getSession() {
  return new Promise(resolve => {
    onAuthStateChanged(_auth, user => {
      resolve(user ? { user } : null);
    });
  });
}

window.getSession = getSession;

async function getUser() {
  const session = await getSession();
  return session?.user || null;
}
window.getUser = getUser;

window.requireAuth = () => new Promise(resolve => {
  onAuthStateChanged(_auth, user => {
    if (!user) {
      const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
      window.location.href = base + 'index.html';
    } else {
      window.currentUser = user;
      resolve(user);
    }
  });
});

// ============================================================================
// SIDEBAR USER
// ============================================================================

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
window.initials = initials;

window.loadSidebarUser = async () => {
  const user = _auth.currentUser;
  if (!user) return;
  try {
    const colRef = collection(_db, 'users');
    const q      = query(colRef, where('email', '==', user.email));
    const snap   = await getDocs(q);
    let name = user.email.split('@')[0];
    if (!snap.empty) name = snap.docs[0].data().name || name;

    const el = document.getElementById('sidebar-user-name');
    const em = document.getElementById('sidebar-user-email');
    const av = document.getElementById('sidebar-user-avatar');
    if (el) el.textContent = name;
    if (em) em.textContent = user.email;
    if (av) av.textContent = initials(name);
    window.currentUserName = name;
  } catch(e) {
    console.warn('loadSidebarUser:', e);
  }
};

// ============================================================================
// LOGOUT
// ============================================================================

window.doLogout = async () => {
  await signOut(_auth);
  const base = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
  window.location.href = base + 'index.html';
};

// ============================================================================
// ACTIVE NAV
// ============================================================================

window.setActiveNav = () => {
  const path = window.location.pathname.split('/').pop()
    || window.location.href.split('/').pop().split('?')[0];
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === path);
  });
};

// ============================================================================
// TOAST — identical to supabase.js
// ============================================================================

window.showToast = (msg, type = 'success') => {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `show ${type}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = ''; }, 3500);
};
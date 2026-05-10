const SUPABASE_URL = " https://dwqvgptbeucmeutlsign.supabase.co";
const SUPABASE_KEY = " eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cXZncHRiZXVjbWV1dGxzaWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0MjgwNjksImV4cCI6MjA5NDAwNDA2OX0.MwI6D8LMf9S0PK_6L_Hq4xM-Dnmj0R7JhnOjq_4jTuY ";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation"
};

const BASE = `${SUPABASE_URL}/rest/v1/fea_storage`;

window.storage = {
  async get(key) {
    try {
      const res = await fetch(`${BASE}?key=eq.${encodeURIComponent(key)}&limit=1`, { headers });
      const data = await res.json();
      if (data && data.length > 0) return { key, value: data[0].value };
      return null;
    } catch (e) {
      const v = localStorage.getItem(key);
      return v ? { key, value: v } : null;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(key, value);
      await fetch(BASE, {
        method: "POST",
        headers: { ...headers, "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify({ key, value, updated_at: Date.now() })
      });
      return { key, value };
    } catch (e) {
      localStorage.setItem(key, value);
      return { key, value };
    }
  },
  async delete(key) {
    try {
      localStorage.removeItem(key);
      await fetch(`${BASE}?key=eq.${encodeURIComponent(key)}`, { method: "DELETE", headers });
      return { key, deleted: true };
    } catch (e) {
      return { key, deleted: true };
    }
  },
  async list(prefix = "") {
    try {
      const res = await fetch(`${BASE}?key=like.${encodeURIComponent(prefix + "%")}&select=key`, { headers });
      const data = await res.json();
      return { keys: (data || []).map(r => r.key) };
    } catch (e) {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
      return { keys };
    }
  }
};

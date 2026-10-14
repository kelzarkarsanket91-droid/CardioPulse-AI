const envUrl = import.meta.env.VITE_API_URL;
const isRemote =
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";

// On remote hosts (like Vercel), use relative path "" if VITE_API_URL is unset or contains localhost to prevent Mixed Content / connection failures
const BASE_URL =
  isRemote && (!envUrl || envUrl.includes("localhost"))
    ? ""
    : (envUrl || "");

let currentAuthToken = null;

function setAuthToken(token) {
  currentAuthToken = token;
}

function getToken() {
  return currentAuthToken;
}



async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

export const api = {
  register: (payload) => request("/api/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload, auth: false }),
  requestOtp: (payload) => request("/api/auth/forgot-password/request-otp", { method: "POST", body: payload, auth: false }),
  resetPassword: (payload) => request("/api/auth/forgot-password/reset", { method: "POST", body: payload, auth: false }),
  me: () => request("/api/auth/me"),
  updateProfile: (payload) => request("/api/auth/me", { method: "PUT", body: payload }),

  listPatients: () => request("/api/patients"),
  addPatient: (payload) => request("/api/patients", { method: "POST", body: payload }),
  getPatient: (id) => request(`/api/patients/${id}`),
  deletePatient: (id) => request(`/api/patients/${id}`, { method: "DELETE" }),

  saveSession: (payload) => request("/api/sessions", { method: "POST", body: payload }),
  getSession: (id) => request(`/api/sessions/${id}`),

  listReports: () => request("/api/reports"),
  saveReport: (payload) => request("/api/reports", { method: "POST", body: payload }),
};

export { getToken, setAuthToken };

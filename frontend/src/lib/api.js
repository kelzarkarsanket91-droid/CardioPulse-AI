const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken() {
  return sessionStorage.getItem("cp-token") || localStorage.getItem("cp-token");
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

export { getToken };

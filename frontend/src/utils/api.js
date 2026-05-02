const DEFAULT_API_BASE_URL = "http://localhost:8000";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

// ============= TOKEN MANAGEMENT =============

export function getAccessToken() {
  return localStorage.getItem("access_token");
}

export function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem("access_token", accessToken);
  if (refreshToken) {
    localStorage.setItem("refresh_token", refreshToken);
  }
}

export function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

function getAuthHeaders() {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ============= HELPER FUNCTIONS =============

async function apiCall(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  // Handle token refresh on 401
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Retry with new token
      return apiCall(url, options);
    } else {
      throw new Error("Session expired. Please login again.");
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export function normalizeAnalysis(raw) {
  if (!raw) return null;

  const verdictValue = String(raw.verdict ?? raw.label ?? raw.status ?? "").trim();
  const verdict = verdictValue ? verdictValue.toUpperCase() : "UNVERIFIABLE";

  const confidenceValue = raw.score ?? raw.confidence ?? raw.credibility_score ?? null;
  const confidence =
    confidenceValue === null || confidenceValue === undefined
      ? null
      : Number(confidenceValue) <= 1
        ? Math.round(Number(confidenceValue) * 100)
        : Math.round(Number(confidenceValue));

  const summary = String(raw.summary ?? raw.explanation ?? raw.assessment ?? raw.message ?? "").trim();
  const assessment = String(raw.assessment ?? raw.explanation ?? "").trim();

  const sources = extractSources(raw);

  return {
    verdict,
    confidence,
    summary,
    assessment,
    sources,
    raw,
  };
}

export function formatAnalysisText(analysis) {
  if (!analysis) return "";

  const lines = [];
  if (analysis.verdict) lines.push(`Verdict: ${analysis.verdict}`);
  if (analysis.confidence !== null && analysis.confidence !== undefined) {
    lines.push(`Confidence: ${analysis.confidence}/100`);
  }
  if (analysis.summary) {
    lines.push("");
    lines.push(analysis.summary);
  }
  if (analysis.assessment && analysis.assessment !== analysis.summary) {
    lines.push("");
    lines.push(analysis.assessment);
  }
  return lines.join("\n").trim();
}

export function extractSources(raw) {
  const collected = [];
  const seen = new Set();

  const pushValue = (value) => {
    const text = String(value ?? "").trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    collected.push(text);
  };

  const sources = raw.sources ?? raw.suggested_sources ?? raw.evidence ?? raw.references ?? [];
  if (Array.isArray(sources)) {
    for (const item of sources) {
      if (typeof item === "string") {
        pushValue(item);
        continue;
      }
      if (!item || typeof item !== "object") continue;
      if (item.source && item.excerpt) {
        pushValue(`${item.source}${item.excerpt ? ` - ${item.excerpt}` : ""}`);
        continue;
      }
      pushValue(item.source ?? item.url ?? item.title ?? item.name ?? item.link);
    }
  } else if (typeof sources === "string") {
    pushValue(sources);
  }

  return collected;
}

// ============= AUTH ENDPOINTS =============

export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Login failed");
  }

  const data = await response.json();
  setTokens(data.access_token, data.refresh_token);
  return data;
}

// Register / create account (backend may not provide this; if absent it will return 404)
export async function register(username, password) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Registration failed (${response.status})`);
  }

  return response.json();
}

export async function logout() {
  try {
    await apiCall("/api/v1/auth/logout", { method: "POST" });
  } finally {
    clearTokens();
  }
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = await response.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    clearTokens();
    return false;
  }
}

export async function changePassword(currentPassword, newPassword) {
  return apiCall("/api/v1/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function getMe() {
  return apiCall("/api/v1/auth/me", { method: "GET" });
}

// ============= ANALYZE ENDPOINT =============

export async function analyzeText(text) {
  return apiCall("/api/analyze/text", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function analyzeUrl(url) {
  return apiCall("/api/analyze/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

// ============= CLAIMS ENDPOINTS =============

export async function submitClaim(text) {
  return apiCall("/api/v1/claims/", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function listClaims(options = {}) {
  const { status, page = 1, pageSize = 20, sortBy = "created_at", order = "desc" } = options;
  const params = new URLSearchParams({
    page: page.toString(),
    page_size: pageSize.toString(),
    sort_by: sortBy,
    order,
  });

  if (status) {
    params.append("status", status);
  }

  return apiCall(`/api/v1/claims/?${params.toString()}`, { method: "GET" });
}

export async function searchClaims(query, options = {}) {
  const { page = 1, pageSize = 20 } = options;
  const params = new URLSearchParams({
    q: query,
    page: page.toString(),
    page_size: pageSize.toString(),
  });

  return apiCall(`/api/v1/claims/search?${params.toString()}`, { method: "GET" });
}

export async function getClaim(claimId) {
  return apiCall(`/api/v1/claims/${claimId}`, { method: "GET" });
}

export async function updateClaim(claimId, data) {
  return apiCall(`/api/v1/claims/${claimId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteClaim(claimId) {
  return apiCall(`/api/v1/claims/${claimId}`, { method: "DELETE" });
}

// ============= VERDICTS ENDPOINTS =============

export async function getClaimVerdicts(claimId) {
  return apiCall(`/api/v1/verdicts/claim/${claimId}`, { method: "GET" });
}

export async function createVerdict(data) {
  return apiCall("/api/v1/verdicts/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getVerdict(verdictId) {
  return apiCall(`/api/v1/verdicts/${verdictId}`, { method: "GET" });
}

export async function updateVerdict(verdictId, data) {
  return apiCall(`/api/v1/verdicts/${verdictId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteVerdict(verdictId) {
  return apiCall(`/api/v1/verdicts/${verdictId}`, { method: "DELETE" });
}

// ============= ADMIN ENDPOINTS =============

export async function getAdminStats() {
  return apiCall("/api/v1/admin/stats", { method: "GET" });
}

export async function getQueue(options = {}) {
  const { status = "pending", limit = 50 } = options;
  const params = new URLSearchParams({
    status,
    limit: limit.toString(),
  });

  return apiCall(`/api/v1/admin/queue?${params.toString()}`, { method: "GET" });
}

export async function reprocessClaim(claimId) {
  return apiCall("/api/v1/admin/reprocess", {
    method: "POST",
    body: JSON.stringify({ claim_id: claimId }),
  });
}

export async function getActivity(options = {}) {
  const { limit = 50 } = options;
  const params = new URLSearchParams({
    limit: limit.toString(),
  });

  return apiCall(`/api/v1/admin/activity?${params.toString()}`, { method: "GET" });
}

export async function revokeSessions() {
  return apiCall("/api/v1/admin/revoke-sessions", { method: "DELETE" });
}

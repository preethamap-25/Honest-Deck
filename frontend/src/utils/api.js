/**
 * API configuration and helper functions
 * Communicates with SEETHRU backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Generic fetch wrapper with error handling
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    "Content-Type": "application/json",
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
      credentials: "include", // Include cookies for session
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `API error: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed (${endpoint}):`, error);
    throw error;
  }
}

/**
 * Analyze a text claim
 */
export async function analyzeClaim(text) {
  return apiCall("/api/analyze/text", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

/**
 * Analyze a URL
 */
export async function analyzeUrl(url) {
  return apiCall("/api/analyze/url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}

/**
 * Auto-detect and analyze (text or URL)
 */
export async function analyzeAuto(content) {
  return apiCall("/api/analyze/auto", {
    method: "POST",
    body: JSON.stringify({ text: content }),
  });
}

/**
 * Analyze an image
 */
export async function analyzeImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  return fetch(`${API_BASE_URL}/api/analyze/image`, {
    method: "POST",
    body: formData,
    credentials: "include",
  }).then(async (response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `API error: ${response.status} ${response.statusText}`
      );
    }
    return response.json();
  });
}

/**
 * Get analysis history
 */
export async function getAnalysisHistory(limit = 50) {
  return apiCall(`/api/analyze/history?limit=${limit}`);
}

/**
 * Get alerts
 */
export async function getAlerts(limit = 20) {
  return apiCall(`/alerts?limit=${limit}`);
}

/**
 * Dismiss an alert
 */
export async function dismissAlert(alertId) {
  return apiCall(`/alerts/${alertId}`, {
    method: "DELETE",
  });
}

/**
 * Get news
 */
export async function getNews(category = "latest news", pageSize = 10) {
  return apiCall(`/news?category=${encodeURIComponent(category)}&page_size=${pageSize}`);
}

/**
 * Get watchlist
 */
export async function getWatchlist() {
  return apiCall("/monitor/watchlist");
}

/**
 * Add to watchlist
 */
export async function addToWatchlist(inputType, content, label) {
  return apiCall("/monitor/watchlist", {
    method: "POST",
    body: JSON.stringify({ input_type: inputType, content, label }),
  });
}

/**
 * Remove from watchlist
 */
export async function removeFromWatchlist(watchId) {
  return apiCall(`/monitor/watchlist/${watchId}`, {
    method: "DELETE",
  });
}

/**
 * Check watchlist item
 */
export async function checkWatchlistItem(watchId) {
  return apiCall(`/monitor/watchlist/${watchId}/check`, {
    method: "POST",
  });
}

/**
 * Health check
 */
export async function healthCheck() {
  return apiCall("/health");
}

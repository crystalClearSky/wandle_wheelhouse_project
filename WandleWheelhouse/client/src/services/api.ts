// Location: src/services/apiClient.ts (or api.ts)
import axios from "axios";

// For API calls, use a relative path.
// Nginx Proxy Manager will route requests to https://yourdomain.com/api/...
// directly to your API service.
// const API_BASE_URL = "/api";

const connection = `${import.meta.env.VITE_API_ORIGIN}/api`
const API_BASE_URL = connection || "https://localhost:7136/api";

// For constructing URLs to static assets served directly by the API (e.g., avatars)
// This will be baked in during the client build.
export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || ""; // e.g., "https://wandlewheelhouse.duckdns.org"

// console.log(`apiClient: API_BASE_URL for dynamic calls set to: ${API_BASE_URL}`);
// console.log(`apiClient: API_ORIGIN for static assets: ${API_ORIGIN}`);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    // "Content-Type": "application/json", // Axios sets this by default for objects
  },
  // timeout: 10000, // Optional
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config) => {
    // console.log(`AXIOS INTERCEPTOR Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Axios request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(
        `Axios response error: Status ${error.response.status} for ${error.config.method?.toUpperCase()} ${error.config.url}`,
        error.response.data
      );
      if (error.response.status === 401) {
        console.warn("Unauthorized (401) detected by interceptor. Clearing token and user.");
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        // Consider a more robust way to trigger a global logout state update
        // For now, simple redirect if not on a public/login page could be:
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register') && window.location.pathname !== '/') {
           // window.location.href = '/login'; // Or trigger context logout
        }
      }
    } else if (error.request) {
      console.error(`Axios network error (no response received) for ${error.config.method?.toUpperCase()} ${error.config.url}:`, error.request);
    } else {
      console.error("Axios setup error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
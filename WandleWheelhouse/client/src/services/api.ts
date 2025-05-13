// Location: src/services/api.ts

import axios from "axios";

// 1. Get Base URL from environment variables (Vite convention)
// Access variables defined in .env files (e.g., .env.development)
const connection = `${import.meta.env.VITE_API_ORIGIN}/api`
const API_BASE_URL = 
// "/api";
connection || "https://localhost:7136/api"; // Fallback URL
// console.log(`API Base URL set to: ${API_BASE_URL}`); // Log the base URL being used

// 2. Create a reusable Axios instance with default settings
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    //"Content-Type": "application/json",
  },
  // Optional: Set a default timeout for requests (e.g., 10 seconds)
  // timeout: 10000,
});

// 3. Request Interceptor: Runs before each request is sent
apiClient.interceptors.request.use(
  (config) => {
    // --- Debug Logs ---
    console.log(`AXIOS INTERCEPTOR: Running for URL: ${config.url}`);
    const token = localStorage.getItem("authToken"); // Retrieve token from storage
    console.log(
      `AXIOS INTERCEPTOR: Token from localStorage: ${
        token ? `FOUND (ends with ...${token.slice(-6)})` : "MISSING!"
      }`
    ); // Log token presence (partially masked)
    // --- End Debug Logs ---

    // If a token exists, add the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // --- Debug Log ---
      console.log("AXIOS INTERCEPTOR: Authorization header ADDED.");
      // --- End Debug Log ---
    } else {
      // --- Debug Log ---
      console.warn(
        "AXIOS INTERCEPTOR: No token found, Authorization header NOT added."
      );
      // --- End Debug Log ---
      // Remove header if it somehow exists but token is null (edge case)
      delete config.headers.Authorization;
    }
    // Log final headers (optional, be careful logging full tokens)
    // console.log('AXIOS INTERCEPTOR Outgoing headers:', config.headers);
    return config; // Return the modified config
  },
  (error) => {
    // Handle request configuration errors
    console.error("Axios request interceptor error:", error);
    return Promise.reject(error);
  }
);

// 4. Response Interceptor: Runs when a response is received
apiClient.interceptors.response.use(
  (response) => {
    // If the response status is within 2xx range, just return it
    return response;
  },
  (error) => {
    // Handle errors for status codes outside the 2xx range
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error(
        `Axios response error: Status ${error.response.status}`,
        error.response.data
      );

      if (error.response.status === 401) {
        // Unauthorized: Token might be invalid or expired
        console.warn(
          "Unauthorized (401) detected by interceptor. Clearing token."
        );
        // Clear the potentially invalid token from storage
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        // Optional: Trigger a logout state change or redirect
        // NOTE: Directly redirecting here can be jarring. Often better handled
        // by the component that made the call based on the caught error.
        // if (!window.location.pathname.toLowerCase().includes('/login')) { // Avoid redirect loop
        //    console.error("Redirect to login may be needed (implement via state/routing)");
        //    // window.location.href = '/'; // Example simple redirect
        // }
      }
      // Could add specific handling for 403, 404, 500 etc. here if needed globally
    } else if (error.request) {
      // The request was made but no response was received (e.g., network error, server down)
      console.error(
        "Axios network error (no response received):",
        error.request
      );
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Axios setup error:", error.message);
    }

    // Return a rejected Promise with the error object
    // This allows components calling the API to use .catch()
    return Promise.reject(error);
  }
);

// Export the configured Axios instance for use in other service files
export default apiClient;

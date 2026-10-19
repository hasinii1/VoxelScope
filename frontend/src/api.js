const env = import.meta.env.VITE_API_URL;
// "same" = the page and the API share one address (Docker). Otherwise use the local dev server.
export const API = env === "same" ? "" : env || "http://127.0.0.1:8000";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const get = async (path) => (await fetch(API + path)).json();
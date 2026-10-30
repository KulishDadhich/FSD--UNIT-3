import { store, logout } from "../store";
import axios from "axios";
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080/api",
  timeout: 15000,
});
export const get = async (path) => (await api.get(path)).data.data;
export const post = async (path, data) =>
  (await api.post(path, data)).data.data;
export const errorText = (e) =>
  e.response?.status === 403
    ? "Your role does not allow this action. Ask an administrator for editor access."
    : e.response?.status === 401
      ? "Your session expired. Please sign in again."
      : e.response?.data?.error ||
        "Backend unavailable. Check the backend service.";

api.interceptors.request.use((config) => {
  const token = store.getState().auth.user?.token;
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});
api.interceptors.response.use(
  (r) => r,
  (e) => {
    if (e.response?.status === 401) store.dispatch(logout());
    return Promise.reject(e);
  },
);

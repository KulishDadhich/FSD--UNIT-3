import { configureStore, createSlice } from "@reduxjs/toolkit";
const slice = createSlice({
  name: "auth",
  initialState: { user: null },
  reducers: {
    login: (s, a) => {
      s.user = a.payload;
    },
    logout: (s) => {
      s.user = null;
    },
  },
});
export const { login, logout } = slice.actions;
export const store = configureStore({ reducer: { auth: slice.reducer } });

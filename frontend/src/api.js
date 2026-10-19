export const API = "https://voxelscope-backend.onrender.com/";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const get = async (path) => (await fetch(API + path)).json();
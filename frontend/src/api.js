export const API = "";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const get = async (path) => (await fetch(API + path)).json();
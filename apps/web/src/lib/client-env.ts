console.log(" VITEURL =", import.meta.env.VITE_API_URL);

export const clientEnv = {
  VITE_API_URL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
};

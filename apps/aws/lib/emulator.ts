/** Emulators such as Floci set `AWS_ENDPOINT_URL` (`eval "$(floci env)"`). */
export const isEmulator = Boolean(process.env.AWS_ENDPOINT_URL);

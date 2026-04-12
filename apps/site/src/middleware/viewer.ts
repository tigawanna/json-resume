// import { createMiddleware } from "@tanstack/react-start";
// import { getRequestHeaders } from "@tanstack/react-start/server";

// export const viewerMiddleware = createMiddleware().server(async ({ next }) => {
//   const headers = getRequestHeaders();
//   const session = await auth.api.getSession({ headers });

//   return next({
//     context: {
//       viewer: session ?? undefined,
//     },
//   });
// });

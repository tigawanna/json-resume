import type { AuthSession } from "@api/auth/auth";

export class ViewerService {
  toViewer({ session }: { session: AuthSession }) {
    return {
      user: session.user,
      session: session.session,
    };
  }
}

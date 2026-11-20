export class HealthService {
  status() {
    return { status: "ok" as const, service: "agentic-json-resume-api" };
  }
}

import { matchesAdminBypassHeader } from "./dev-admin-bypass.js";

describe("matchesAdminBypassHeader", () => {
  it("accepts a matching header", () => {
    expect(
      matchesAdminBypassHeader({ header: "local-admin", secret: "local-admin" }),
    ).toBe(true);
  });

  it("rejects a wrong key", () => {
    expect(matchesAdminBypassHeader({ header: "nope", secret: "local-admin" })).toBe(false);
  });

  it("rejects when the secret is unset", () => {
    expect(matchesAdminBypassHeader({ header: "local-admin", secret: undefined })).toBe(
      false,
    );
  });
});

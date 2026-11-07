import { describe, expect, it } from "vitest";
import { companyGroupKey, splitCompanyHint } from "./split-company";

describe("splitCompanyHint", () => {
  it("strips parenthesized hints and keeps the base name", () => {
    expect(splitCompanyHint("CloudScale Systems (US - Remote)")).toEqual({
      name: "CloudScale Systems",
      hint: "US - Remote",
    });
    expect(splitCompanyHint("FlowState (Remote)")).toEqual({
      name: "FlowState",
      hint: "Remote",
    });
  });

  it("splits dash-separated hints", () => {
    expect(splitCompanyHint("Acme - Remote")).toEqual({ name: "Acme", hint: "Remote" });
    expect(splitCompanyHint("Acme — US Remote")).toEqual({ name: "Acme", hint: "US Remote" });
  });

  it("keeps clean names intact", () => {
    expect(splitCompanyHint("Global Data Systems")).toEqual({
      name: "Global Data Systems",
      hint: "",
    });
  });

  it("groups by base name so hinted and clean companies share a period", () => {
    expect(companyGroupKey("Acme (Remote)", "2022-01", "2024-12")).toBe(
      companyGroupKey("Acme", "2022-01", "2024-12"),
    );
    expect(companyGroupKey("Acme", "2022-01", "2024-12")).not.toBe(
      companyGroupKey("Acme", "2023-01", "2024-12"),
    );
  });
});

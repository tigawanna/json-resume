import { describe, expect, it } from "vitest";
import { quotePayRate } from "./pay-quote";

const PAGE = `YO AI Labs
Sr. Full-Stack Software Engineer - Remote
Mombasa, Kenya
Contractor
Remote
50-100 USD / Month
Job Type: Contractor | ~15 hours/week`;

describe("quotePayRate", () => {
  it("keeps the page text and converts a monthly range with the stated week", () => {
    const quote = quotePayRate(PAGE);

    expect(quote.source).toBe("50-100 USD / Month");
    expect(quote.hourlyMinCents).toBe(77);
    expect(quote.hourlyMaxCents).toBe(154);
    expect(quote.basis).toContain("15 hours/week stated on the page");
    expect(quote.basis).toContain(quote.source);
  });

  it("returns an empty quote when the page has no compensation", () => {
    expect(quotePayRate("Contractor\nRemote\n~15 hours/week")).toEqual({
      source: "",
      basis: "",
      hourlyMinCents: null,
      hourlyMaxCents: null,
    });
  });

  it("converts an hourly range without assuming a work week", () => {
    expect(quotePayRate("Pay: $80-120/hour, flexible")).toMatchObject({
      source: "$80-120/hour",
      hourlyMinCents: 8000,
      hourlyMaxCents: 12000,
    });
  });
});

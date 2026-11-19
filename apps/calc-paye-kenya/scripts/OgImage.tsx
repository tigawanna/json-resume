import * as React from "react";

export interface OgImageProps {
  title: string;
  description?: string;
  siteLabel?: string;
  iconDataUrl?: string;
}

/** 1200x630 OG card, rendered to PNG with Takumi by scripts/og.tsx. */
export function OgImage({ title, description, siteLabel = "calc paye kenya", iconDataUrl }: OgImageProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        backgroundImage: "linear-gradient(145deg, #0b0d0c 0%, #101310 52%, #0b0d0c 100%)",
        color: "#e9ece6",
        fontFamily: "Inter",
      }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            fontSize: "30px",
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: "#cbd4c8",
          }}>
          {iconDataUrl ? (
            <img src={iconDataUrl} width={48} height={48} style={{ borderRadius: "12px" }} alt="" />
          ) : null}
          {siteLabel}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 18px",
            border: "1px solid rgba(86, 188, 125, 0.4)",
            borderRadius: "999px",
            fontSize: "20px",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#86dcaa",
          }}>
          Rate · Currency · Tax
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1000px" }}>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 48 ? "56px" : "72px",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "#e9ece6",
          }}>
          {title}
        </div>
        {description ? (
          <div
            style={{
              display: "flex",
              fontSize: "30px",
              fontWeight: 400,
              lineHeight: 1.35,
              color: "rgba(203, 212, 200, 0.82)",
            }}>
            {description}
          </div>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "22px",
          color: "#cbd4c8",
        }}>
        <span>Kenyan statutory deductions, made clear</span>
        <span>Calc Paye Kenya</span>
      </div>
    </div>
  );
}

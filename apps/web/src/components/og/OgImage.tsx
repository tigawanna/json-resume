export interface OgImageProps {
  title: string;
  description?: string;
  siteLabel?: string;
  iconDataUrl?: string;
}

/**
 * Reusable OG image template (1200x630).
 * Render with Takumi (`takumi-js`) to produce a PNG.
 */
export function OgImage({ title, description, siteLabel = "Whiskers", iconDataUrl }: OgImageProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        backgroundImage: "linear-gradient(145deg, #0f100f 0%, #0a0b0a 48%, #151715 100%)",
        color: "#f5f5f0",
        fontFamily: "Inter",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            fontSize: "30px",
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: "#cfd3c8",
          }}
        >
          {iconDataUrl ? (
            <img src={iconDataUrl} width={48} height={48} style={{ borderRadius: "12px" }} />
          ) : null}
          {siteLabel}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 18px",
            border: "1px solid rgba(207, 211, 200, 0.28)",
            borderRadius: "999px",
            fontSize: "20px",
            fontWeight: 500,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#d8deca",
          }}
        >
          JSON Resume
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          maxWidth: "980px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: title.length > 48 ? "56px" : "72px",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            color: "#f5f5f0",
          }}
        >
          {title}
        </div>
        {description ? (
          <div
            style={{
              display: "flex",
              fontSize: "30px",
              fontWeight: 400,
              lineHeight: 1.35,
              color: "rgba(207, 211, 200, 0.82)",
            }}
          >
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
          color: "#cfd3c8",
        }}
      >
        <span>whiskers.app</span>
        <span>Whiskers</span>
      </div>
    </div>
  );
}

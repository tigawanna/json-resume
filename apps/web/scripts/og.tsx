import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "takumi-js";
import { googleFonts } from "takumi-js/helpers";

import { OgImage } from "../src/components/og/OgImage";

const root = join(process.cwd());
const out = join(root, "public", "og.png");

const iconSvg = readFileSync(join(root, "public", "logo.svg"), "utf8");
const iconDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(iconSvg)}`;

const fonts = await googleFonts([{ name: "Inter", weight: [400, 600, 700] }]);

const buf = await render(
  <OgImage
    title="CraVfted"
    description="Turn your résumé into JSON, tailor it with any LLM using a job description, and export a clean PDF."
    siteLabel="CraVfted"
    iconDataUrl={iconDataUrl}
  />,
  { width: 1200, height: 630, fonts },
);

writeFileSync(out, buf);
console.log(`wrote public/og.png (${buf.length} bytes)`);

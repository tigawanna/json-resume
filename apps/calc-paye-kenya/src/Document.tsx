import { HydrationScript, type JSX } from "@solidjs/web";

const BOOT_THEME = `(() => {
  const root = document.documentElement;
  try {
    const theme = localStorage.getItem("calcpayekenya:theme") === "light" ? "light" : "dark";
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0b0d0c" : "#fbfbf9");
  } catch {
    root.classList.add("dark");
  }
})();`;

export default function Document(props: { children: JSX.Element }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0b0d0c" />
        <title>Calc Paye Kenya — Rate & KRA calculator</title>
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script innerHTML={BOOT_THEME} />
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}

import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";

const FOOTER_LINKS = ["Privacy", "Terms", "Support", "Contact"] as const;

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-base-200 py-12">
      <div className="container">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <Link to="/" className="font-serif text-2xl tracking-tight text-base-content">
            {AppConfig.name.toLowerCase()}
            <span className="text-primary">.</span>
          </Link>

          <div className="flex gap-8 text-sm text-base-content/50">
            {FOOTER_LINKS.map((link) => (
              <a key={link} href="#" className="transition-colors hover:text-base-content">
                {link}
              </a>
            ))}
          </div>

          <p className="text-sm text-base-content/40">
            &copy; {currentYear} {AppConfig.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

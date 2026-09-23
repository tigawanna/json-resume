import { TigawannaCredit } from "@tigawanna/credit";
import "@tigawanna/credit/styles.css";
import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";

export function LandingFooter() {
  return (
    <footer className="mx-auto max-w-360 border-x border-t border-border/50">
      <div className="flex flex-col items-center justify-between gap-6 px-8 py-12 font-mono text-xs text-muted-foreground md:flex-row md:px-16">
        <Link to="/" className="transition-colors hover:text-base-content">
          {AppConfig.wordmark}
          <span className="text-primary">.</span>
          <span className="ml-2">Parts stored locally. Sync is optional.</span>
        </Link>
        <div className="flex gap-6">
          <a href="#parts" className="transition-colors hover:text-base-content">
            Parts
          </a>
          <a href="#agents" className="transition-colors hover:text-base-content">
            Agents
          </a>
          <a href="#sync" className="transition-colors hover:text-base-content">
            Sync
          </a>
          <a
            href={AppConfig.links.github}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-base-content"
          >
            GitHub
          </a>
        </div>
      </div>
      <div className="flex justify-center border-x border-border/50 px-8 pb-8 md:px-16">
        <TigawannaCredit position="inline" />
      </div>
    </footer>
  );
}

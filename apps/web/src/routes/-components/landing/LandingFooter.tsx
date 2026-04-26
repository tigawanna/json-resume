import { AppConfig } from "@/utils/system";
import { Link } from "@tanstack/react-router";

export function LandingFooter() {
  return (
    <footer className="mx-auto max-w-360 border-x border-t border-border/50">
      <div className="flex flex-col items-center justify-between gap-6 px-8 py-12 font-mono text-xs text-muted-foreground md:flex-row md:px-16">
        <Link to="/" className="transition-colors hover:text-base-content">
          {AppConfig.wordmark}
          <span className="text-primary">.</span>
          <span className="ml-2">— JSON in · LLM in the middle · PDF out</span>
        </Link>
        <div className="flex gap-6">
          <a href="#pipeline" className="transition-colors hover:text-base-content">
            Pipeline
          </a>
          <a href="#features" className="transition-colors hover:text-base-content">
            Features
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
    </footer>
  );
}

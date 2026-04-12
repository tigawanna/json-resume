import { AppConfig } from "@/utils/system";
import { Link, useLocation } from "@tanstack/react-router";
import { Github, Mail, Twitter } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { pathname } = useLocation();

  return (
    <footer className="bg-base-200 text-base-content">
      <div className="px-4 py-8 sm:px-6 md:px-10 md:py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 mb-8">
            <div className="flex flex-col items-center md:items-start gap-3 text-center md:text-left">
              {(() => {
                const Icon = AppConfig.icon as any;
                return <Icon className="text-primary size-10 md:size-12" />;
              })()}
              <div>
                <h3 className="text-lg md:text-xl font-bold">{AppConfig.name}</h3>
                <p className="text-xs md:text-sm text-base-content/70 leading-relaxed max-w-xs">
                  {AppConfig.brief}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <a
                href={AppConfig.links.github}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-square btn-sm md:btn-md"
                aria-label="GitHub"
              >
                <Github className="size-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-square btn-sm md:btn-md"
                aria-label="Twitter"
              >
                <Twitter className="size-5" />
              </a>
              <a
                href={AppConfig.links.mail}
                className="btn btn-ghost btn-square btn-sm md:btn-md"
                aria-label="Email"
              >
                <Mail className="size-5" />
              </a>
            </div>

            <nav aria-label="footer-navigation" className="flex justify-center md:justify-end">
              <ul className="flex flex-col items-center md:items-end gap-2 text-sm md:text-base">
                <li>
                  <Link to="/" className="link link-hover">
                    Home
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="link link-hover">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="link link-hover">
                    Profile
                  </Link>
                </li>
                <li>
                  <Link to="/auth" search={{ returnTo: pathname }} className="link link-hover">
                    Sign In
                  </Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Divider */}
          <div className="divider my-0" />

          {/* Copyright */}
          <div className="text-center text-xs md:text-sm text-base-content/60 py-4">
            <p>
              Copyright © {currentYear} {AppConfig.name}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

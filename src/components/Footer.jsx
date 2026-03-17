import { BRAND } from "../config";

export default function Footer() {
  return (
    <footer className="px-6 py-16 bg-brand">
      <div className="max-w-site mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-1">
            <span className="block text-lg font-semibold mb-2 text-white">
              {BRAND.name}
            </span>
            <p className="text-sm text-white/40 leading-relaxed">
              {BRAND.tagline}
            </p>
          </div>

          <div>
            <span className="block mb-4 text-xs uppercase tracking-wider text-white/30 font-mono">
              Services
            </span>
            {[
              "AI Strategy & Audits",
              "Copilot Masterclasses",
              "AI Development",
              "Change Management",
            ].map((l) => (
              <a
                key={l}
                href="/#services"
                className="block py-1.5 text-sm text-white/50 hover:text-white transition-colors duration-200"
              >
                {l}
              </a>
            ))}
          </div>

          <div>
            <span className="block mb-4 text-xs uppercase tracking-wider text-white/30 font-mono">
              Company
            </span>
            {[
              { label: "About", href: "/#" },
              { label: "Pricing", href: "/#pricing" },
              { label: "FAQ", href: "/#faq" },
              { label: "Blog", href: "/blog" },
              { label: "Contact", href: "/#book" },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="block py-1.5 text-sm text-white/50 hover:text-white transition-colors duration-200"
              >
                {l.label}
              </a>
            ))}
          </div>

          <div>
            <span className="block mb-4 text-xs uppercase tracking-wider text-white/30 font-mono">
              Connect
            </span>
            <div className="flex gap-4">
              <a
                href={BRAND.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors duration-200"
                aria-label="LinkedIn"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href={BRAND.social.x}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/40 hover:text-white transition-colors duration-200"
                aria-label="X (Twitter)"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
            <a
              href={`mailto:${BRAND.email}`}
              className="block mt-4 text-sm text-white/50 hover:text-white transition-colors duration-200"
            >
              {BRAND.email}
            </a>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/[0.08]">
          <span className="text-xs text-white/25 font-mono">
            &copy; {new Date().getFullYear()} StaffxAI Australia. All rights
            reserved.
          </span>
          <div className="flex gap-6 mt-4 md:mt-0">
            {["Privacy Policy", "Terms of Service"].map((l) => (
              <a
                key={l}
                href="#"
                className="text-xs text-white/25 hover:text-white/50 transition-colors duration-200 font-mono"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

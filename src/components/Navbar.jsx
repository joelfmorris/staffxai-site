import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { BRAND, NAV_LINKS } from "../config";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) {
      setScrolled(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? "rgba(255,255,255,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled
          ? "1px solid #F0F0F0"
          : "1px solid transparent",
      }}
    >
      <div className="max-w-site mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-brand"
        >
          {BRAND.name}
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((l) =>
            l.href.startsWith("/") && !l.href.startsWith("/#") ? (
              <Link
                key={l.label}
                to={l.href}
                className="text-sm text-brand opacity-60 hover:opacity-100 transition-opacity duration-200"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="text-sm text-brand opacity-60 hover:opacity-100 transition-opacity duration-200"
              >
                {l.label}
              </a>
            )
          )}
          <a
            href="/#book"
            className="text-sm px-5 py-2 rounded-pill bg-brand text-white hover:bg-[#333] transition-all duration-200 hover:-translate-y-px"
          >
            {BRAND.cta}
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span
            className="block w-5 h-0.5 bg-gray-800 transition-transform"
            style={
              mobileOpen
                ? { transform: "rotate(45deg) translate(2px, 2px)" }
                : {}
            }
          />
          <span
            className="block w-5 h-0.5 bg-gray-800 transition-opacity"
            style={{ opacity: mobileOpen ? 0 : 1 }}
          />
          <span
            className="block w-5 h-0.5 bg-gray-800 transition-transform"
            style={
              mobileOpen
                ? { transform: "rotate(-45deg) translate(2px, -2px)" }
                : {}
            }
          />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden px-6 pb-6 pt-2 bg-white/95 backdrop-blur-xl">
          {NAV_LINKS.map((l) =>
            l.href.startsWith("/") && !l.href.startsWith("/#") ? (
              <Link
                key={l.label}
                to={l.href}
                className="block py-3 text-sm text-brand border-b border-brand-border-subtle"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.label}
                href={l.href}
                className="block py-3 text-sm text-brand border-b border-brand-border-subtle"
              >
                {l.label}
              </a>
            )
          )}
          <a
            href="/#book"
            className="mt-4 block text-center text-sm px-5 py-3 rounded-pill bg-brand text-white"
          >
            {BRAND.cta}
          </a>
        </div>
      )}
    </nav>
  );
}

import { Link, useLocation } from "react-router";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

const routeBreadcrumbs: Record<string, BreadcrumbItem[]> = {
  "/architecture": [
    { label: "Home", href: "/" },
    { label: "Architecture", current: true },
  ],
  "/craftsmanship": [
    { label: "Home", href: "/" },
    { label: "Craftsmanship", current: true },
  ],
  "/use-cases": [
    { label: "Home", href: "/" },
    { label: "Use Cases", current: true },
  ],
  "/about": [
    { label: "Home", href: "/" },
    { label: "About openIndu", current: true },
  ],
  "/developers": [
    { label: "Home", href: "/" },
    { label: "Developers", current: true },
  ],
  "/team": [
    { label: "Home", href: "/" },
    { label: "Team", current: true },
  ],
  "/edge-computing": [
    { label: "Home", href: "/" },
    { label: "openIndu-cim", current: true },
  ],
  "/forum": [
    { label: "Home", href: "/" },
    { label: "Forum", current: true },
  ],
  "/motion-control": [],
  "/motion-control/studio": [
    { label: "Home", href: "/" },
    { label: "Motion Control", href: "/motion-control" },
    { label: "openIndu-studio", current: true },
  ],
  "/vision": [],
  "/vision/station": [
    { label: "Home", href: "/" },
    { label: "Industrial Vision", href: "/vision" },
    { label: "openIndu-station", current: true },
  ],
  "/iiot-platform": [],
  "/resources": [],
  "/privacy": [
    { label: "Home", href: "/" },
    { label: "Privacy Policy", current: true },
  ],
  "/legal": [
    { label: "Home", href: "/" },
    { label: "Legal", current: true },
  ],
  "/cookies": [
    { label: "Home", href: "/" },
    { label: "Cookies Policy", current: true },
  ],
};

export function Breadcrumb() {
  const location = useLocation();
  const items = routeBreadcrumbs[location.pathname] || [];

  if (items.length <= 1) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-100" aria-label="Breadcrumb">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
        <ol className="flex items-center gap-2 text-sm text-gray-600">
          {items.map((item, index) => (
            <li key={item.label} className="flex items-center gap-2">
              {item.href ? (
                <Link to={item.href} className="hover:text-sky-700 transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="text-sky-700 font-medium">{item.label}</span>
              )}
              {index < items.length - 1 && (
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

export default Breadcrumb;

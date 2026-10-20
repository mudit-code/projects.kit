"use client";

import Link from "next/link";

export function Logo({ 
  className = "", 
  collapsed = false,
  href,
  onClick,
}: { 
  className?: string; 
  collapsed?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className={`flex items-center group transition-all select-none ${collapsed ? "justify-center" : "gap-2.5"} ${className}`}>
      {collapsed ? (
        <div className="relative w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shrink-0" title="projects.kit">
          <svg
            viewBox="0 0 1930 1930"
            role="img"
            aria-label="projects.kit logo"
            className="w-8 h-8 object-contain shrink-0"
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            <defs>
              <mask id="cut-sidebar-logo-c" maskUnits="userSpaceOnUse" x="0" y="0" width="1930" height="1930">
                <rect width="1930" height="1930" fill="#fff" />
                <g fill="none" stroke="#000" strokeWidth="105">
                  <line x1="928" y1="585" x2="770" y2="1135" />
                  <line x1="928" y1="585" x2="1345" y2="1005" />
                  <line x1="770" y1="1135" x2="1345" y2="1005" />
                  <line x1="770" y1="1135" x2="587" y2="1732" />
                </g>
                <g fill="#000">
                  <circle cx="928" cy="585" r="165" />
                  <circle cx="1345" cy="1005" r="165" />
                  <circle cx="770" cy="1135" r="165" />
                </g>
              </mask>
            </defs>
            <polygon
              points="965,413.5 1516.5,965 965,1516.5 413.5,965"
              fill="#1C3A7F"
              stroke="#1C3A7F"
              strokeWidth="600"
              strokeLinejoin="round"
              mask="url(#cut-sidebar-logo-c)"
            />
          </svg>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative h-8 w-8 flex items-center shrink-0 group-hover:scale-105 transition-transform">
            <svg
              viewBox="0 0 1930 1930"
              role="img"
              aria-label="projects.kit logo"
              className="w-8 h-8 object-contain shrink-0"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              <defs>
                <mask id="cut-sidebar-logo" maskUnits="userSpaceOnUse" x="0" y="0" width="1930" height="1930">
                  <rect width="1930" height="1930" fill="#fff" />
                  <g fill="none" stroke="#000" strokeWidth="105">
                    <line x1="928" y1="585" x2="770" y2="1135" />
                    <line x1="928" y1="585" x2="1345" y2="1005" />
                    <line x1="770" y1="1135" x2="1345" y2="1005" />
                    <line x1="770" y1="1135" x2="587" y2="1732" />
                  </g>
                  <g fill="#000">
                    <circle cx="928" cy="585" r="165" />
                    <circle cx="1345" cy="1005" r="165" />
                    <circle cx="770" cy="1135" r="165" />
                  </g>
                </mask>
              </defs>
              <polygon
                points="965,413.5 1516.5,965 965,1516.5 413.5,965"
                fill="#1C3A7F"
                stroke="#1C3A7F"
                strokeWidth="600"
                strokeLinejoin="round"
                mask="url(#cut-sidebar-logo)"
              />
            </svg>
          </div>
          <span className="text-base font-extrabold tracking-tight text-[#10334A] whitespace-nowrap">
            projects<span className="text-[#0D3481]">.kit</span>
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="flex items-center shrink-0">
        {content}
      </Link>
    );
  }

  return content;
}

export default Logo;

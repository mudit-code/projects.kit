import React, { useId } from "react";
import Link from "next/link";

export function Logo({ 
  className = "", 
  collapsed = false,
  size = "md",
  href,
  onClick,
}: { 
  className?: string; 
  collapsed?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
  onClick?: () => void;
}) {
  const maskId = useId();

  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
    xl: "text-2xl",
  };

  const iconClass = iconSizes[size] || iconSizes.md;
  const textClass = textSizes[size] || textSizes.md;

  const content = (
    <div className={`flex items-center group transition-all select-none ${collapsed ? "justify-center" : "gap-1.5"} ${className}`}>
      {collapsed ? (
        <div className={`relative ${iconClass} rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shrink-0`} title="projects.kit">
          <svg
            viewBox="0 0 1930 1930"
            role="img"
            aria-label="projects.kit logo"
            className={`${iconClass} object-contain shrink-0`}
            style={{ pointerEvents: "none", userSelect: "none" }}
          >
            <defs>
              <mask id={`cut-logo-c-${maskId}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1930" height="1930">
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
              mask={`url(#cut-logo-c-${maskId})`}
            />
          </svg>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`relative ${iconClass} flex items-center shrink-0 group-hover:scale-105 transition-transform`}>
            <svg
              viewBox="0 0 1930 1930"
              role="img"
              aria-label="projects.kit logo"
              className={`${iconClass} object-contain shrink-0`}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              <defs>
                <mask id={`cut-logo-${maskId}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1930" height="1930">
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
                mask={`url(#cut-logo-${maskId})`}
              />
            </svg>
          </div>
          <span className={`${textClass} font-extrabold tracking-tight text-[#10334A] whitespace-nowrap`}>
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

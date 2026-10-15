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
        <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-xs flex items-center justify-center p-1.5 bg-white border border-slate-200 group-hover:scale-105 transition-transform shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/kit.png"
            alt="KIT Logo"
            className="w-full h-full object-contain"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 max-w-[160px] flex items-center shrink-0 group-hover:scale-105 transition-transform">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/kit.png"
              alt="KIT Logo"
              className="h-9 w-auto max-h-9 object-contain"
            />
          </div>
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

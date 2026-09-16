import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { authLinkStyle } from "./authStyles";

interface AuthLinkProps {
  href: string;
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  fontSize?: string;
}

/** next/link styled with the pages' indigo text-link accent (`#6366f1`). */
export function AuthLink({ href, children, onClick, fontSize }: AuthLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={fontSize ? { ...authLinkStyle, fontSize } : authLinkStyle}
    >
      {children}
    </Link>
  );
}

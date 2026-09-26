"use client";

import {
  ServerErrorPage,
  type ServerErrorPageProps,
} from "@/components/errors/ErrorPages";

export default function GameError(props: ServerErrorPageProps) {
  return <ServerErrorPage {...props} />;
}

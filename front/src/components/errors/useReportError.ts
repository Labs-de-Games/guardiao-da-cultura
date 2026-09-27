"use client";

import { useEffect } from "react";
import {
  type ErrorPageContext,
  type ErrorPageType,
  reportErrorPage,
} from "@/lib/errors/reportError";

export function useReportError(
  type: ErrorPageType,
  error?: unknown,
  context?: ErrorPageContext,
): void {
  // Context is read once per error so a fresh object each render doesn't
  // re-report.
  useEffect(() => {
    reportErrorPage(type, error, context);
  }, [type, error]);
}

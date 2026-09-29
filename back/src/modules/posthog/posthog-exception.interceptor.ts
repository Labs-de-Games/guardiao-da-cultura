import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";
import { readAnalyticsConsent } from "../../shared/consent/analytics-consent";
import type { PostHogService } from "./posthog.service";

interface HttpArgumentsHost {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
}

interface ExceptionCaptureOptions {
  minStatusToCapture?: number;
}

interface PostHogInterceptorOptions {
  captureExceptions?: boolean | ExceptionCaptureOptions;
}

function getFirstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function getPostHogTracingHeaderValues(
  headers?: Record<string, string | string[] | undefined>,
): { sessionId?: string; distinctId?: string } {
  return {
    sessionId: getFirstHeaderValue(headers?.["x-posthog-session-id"]),
    distinctId: getFirstHeaderValue(headers?.["x-posthog-distinct-id"]),
  };
}

function getClientIp(
  headers: Record<string, string | string[] | undefined>,
  request: any,
): string | undefined {
  const forwarded = getFirstHeaderValue(headers["x-forwarded-for"]);
  if (forwarded) {
    const ip = forwarded.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return request?.socket?.remoteAddress;
}

function getExceptionStatus(exception: unknown): number | undefined {
  if (
    exception &&
    typeof exception === "object" &&
    "getStatus" in exception &&
    typeof (exception as any).getStatus === "function"
  ) {
    const status = (exception as any).getStatus();
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

function isPreviouslyCapturedError(error: unknown): boolean {
  return error instanceof Error && (error as any).__posthog_captured === true;
}

export class PostHogExceptionInterceptor implements NestInterceptor {
  private captureExceptions: boolean;
  private minStatusToCapture: number;

  constructor(
    private readonly posthogService: PostHogService,
    options?: PostHogInterceptorOptions,
  ) {
    const capture = options?.captureExceptions;
    this.captureExceptions = !!capture;
    this.minStatusToCapture =
      (typeof capture === "object" ? capture.minStatusToCapture : undefined) ??
      500;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpHost = context.switchToHttp() as HttpArgumentsHost;
    const request = httpHost.getRequest();
    const response = httpHost.getResponse();

    const headers = (request?.headers ?? {}) as Record<
      string,
      string | string[] | undefined
    >;
    const { sessionId, distinctId } = getPostHogTracingHeaderValues(headers);

    // Issue #864: the consent text names "erros" explicitly, so error
    // telemetry is part of what a player authorises. Fails closed — an absent
    // cookie means no capture.
    const analyticsConsent = readAnalyticsConsent(request);

    const properties: Record<string, any> = {};
    const addProperty = (key: string, value: unknown) => {
      if (value !== undefined && value !== null) {
        properties[key] = value;
      }
    };

    addProperty("$current_url", request?.url);
    addProperty("$request_method", request?.method);
    addProperty("$request_path", request?.path ?? request?.url);
    addProperty("$user_agent", getFirstHeaderValue(headers["user-agent"]));
    addProperty("$ip", getClientIp(headers, request));

    const client = this.posthogService.getClient();
    if (client) {
      client.enterContext({
        ...(sessionId !== undefined ? { sessionId } : {}),
        ...(distinctId !== undefined ? { distinctId } : {}),
        properties,
      });
    }

    let source = next.handle();

    if (this.captureExceptions) {
      source = source.pipe(
        catchError((exception: unknown) => {
          if (isPreviouslyCapturedError(exception)) {
            return throwError(() => exception);
          }
          const status = getExceptionStatus(exception);
          if (status !== undefined && status < this.minStatusToCapture) {
            return throwError(() => exception);
          }
          const responseStatus = status ?? response?.statusCode;
          const additionalProperties: Record<string, any> | undefined =
            responseStatus !== undefined
              ? { $response_status_code: responseStatus }
              : undefined;

          this.posthogService.captureException(
            exception instanceof Error
              ? exception
              : new Error(String(exception)),
            distinctId,
            additionalProperties,
            analyticsConsent,
          );
          return throwError(() => exception);
        }),
      );
    }

    return source;
  }
}

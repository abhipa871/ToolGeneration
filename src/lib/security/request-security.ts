import "server-only";

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(request.url).origin;
}

export function hasSmallJsonBody(request: Request, maxBytes: number) {
  const length = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(length) && length >= 0 && length <= maxBytes;
}

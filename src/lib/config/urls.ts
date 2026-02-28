const LOCAL_APP_URL = "http://localhost:3000";
const LOCAL_SOCKET_URL = "http://localhost:3001";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeUrl = (value: string, fallback: string): string => {
  const candidate = value.trim();
  if (!candidate) {
    return fallback;
  }

  try {
    return trimTrailingSlash(new URL(candidate).toString());
  } catch {
    return fallback;
  }
};

export const getAppBaseUrl = (): string => {
  const configured =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL;

  if (configured) {
    return normalizeUrl(configured, LOCAL_APP_URL);
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeUrl(window.location.origin, LOCAL_APP_URL);
  }

  return LOCAL_APP_URL;
};

export const buildAppUrl = (path = ""): string => {
  const base = getAppBaseUrl();
  if (!path) {
    return base;
  }

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

export const getSocketServerUrl = (): string => {
  const configured =
    process.env.NEXT_PUBLIC_SOCKET_URL || process.env.SOCKET_URL;
  if (configured) {
    return normalizeUrl(configured, LOCAL_SOCKET_URL);
  }

  if (process.env.NODE_ENV === "development") {
    return LOCAL_SOCKET_URL;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeUrl(window.location.origin, LOCAL_SOCKET_URL);
  }

  return getAppBaseUrl();
};

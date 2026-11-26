const THUMBNAIL_PREFIX = "_$flaredrive$/thumbnails/";

function parseAllowList(value, writeOnly = false) {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .filter((entry) => !(writeOnly && entry.startsWith("ro:")))
    .map((entry) => (entry.startsWith("ro:") ? entry.slice(3) : entry));
}

function matchesAllowList(targetPath, allowList) {
  if (allowList.includes("*")) return true;
  return allowList.some((allow) => targetPath.startsWith(allow));
}

function getAllowListForRequest(context, writeOnly = false) {
  const headers = new Headers(context.request.headers);
  const authorization = headers.get("Authorization");
  if (authorization && authorization.startsWith("Basic ")) {
    const account = atob(authorization.split("Basic ")[1]);
    if (account && context.env[account]) {
      return parseAllowList(context.env[account], writeOnly);
    }
  }
  if (context.env["GUEST"]) {
    return parseAllowList(context.env["GUEST"], writeOnly);
  }
  return null;
}

export function get_current_user(context) {
  const headers = new Headers(context.request.headers);
  const authorization = headers.get("Authorization");
  if (authorization && authorization.startsWith("Basic ")) {
    try {
      const account = atob(authorization.split("Basic ")[1]);
      if (account && context.env[account]) {
        return account.split(":")[0];
      }
    } catch {
      return null;
    }
  }
  if (context.env["GUEST"]) {
    return "guest";
  }
  return null;
}

export function can_access_path(context, targetPath) {
  if (targetPath.startsWith(THUMBNAIL_PREFIX)) return true;
  const allowList = getAllowListForRequest(context, false);
  if (!allowList) return false;
  return matchesAllowList(targetPath, allowList);
}

export function get_allow_list(context) {
  return getAllowListForRequest(context, false);
}

export function can_write_path(context, targetPath) {
  const allowList = getAllowListForRequest(context, true);
  if (!allowList || allowList.length === 0) return false;
  return matchesAllowList(targetPath, allowList);
}

export function get_auth_status(context) {
  const url = context.request.url;
  const dopath = url.includes("/api/write/items/")
    ? url.split("/api/write/items/")[1].split("?")[0]
    : url.includes("/api/write/test/")
    ? url.split("/api/write/test/")[1].split("?")[0]
    : null;
  if (dopath === null) return false;
  return can_write_path(context, dopath);
}

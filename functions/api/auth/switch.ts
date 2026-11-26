import { get_current_user } from "@/utils/auth";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const from = url.searchParams.get("from") || "";
  const rawRedirect = url.searchParams.get("redirect") || "/";
  const safeRedirect =
    rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")
      ? rawRedirect
      : "/";

  const currentUser = get_current_user(context);
  if (currentUser && currentUser !== from) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: safeRedirect,
        "Cache-Control": "no-store",
      },
    });
  }

  const headers = new Headers();
  headers.set("WWW-Authenticate", 'Basic realm="需要登录"');
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "text/html; charset=utf-8");

  const escapedRedirect = safeRedirect
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return new Response(
    `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>切换用户</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f5f5f5; color: #333; }
    .card { background: #fff; padding: 28px 32px; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); text-align: center; }
    a { display: inline-block; margin-top: 16px; padding: 8px 20px; background: #2c2c2c; color: #fff; text-decoration: none; border-radius: 6px; }
  </style>
</head>
<body>
  <div class="card">
    <p>已取消切换用户，或账号密码不正确。</p>
    <a href="${escapedRedirect}">返回网盘</a>
  </div>
</body>
</html>`,
    { status: 401, headers }
  );
}

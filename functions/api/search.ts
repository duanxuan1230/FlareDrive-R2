import { can_access_path, get_allow_list } from "@/utils/auth";

const MAX_PAGES = 5;

export async function onRequestGet(context) {
  try {
    const allowList = get_allow_list(context);
    if (!allowList) {
      const headers = new Headers();
      headers.set("WWW-Authenticate", 'Basic realm="需要登录"');
      return new Response("没有读取权限", { status: 401, headers });
    }

    const bucket = context.env.BUCKET;
    if (!bucket) {
      return new Response("Bucket not configured", { status: 500 });
    }

    const url = new URL(context.request.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    if (!q) {
      return new Response(JSON.stringify({ value: [], folders: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const matchedFiles = [];
    const folderSet = new Set();
    let cursor = undefined;
    let pages = 0;

    do {
      const objList = await bucket.list({
        cursor,
        include: ["httpMetadata", "customMetadata"],
      });

      for (const obj of objList.objects) {
        const key = obj.key;
        if (key.startsWith("_$flaredrive$/")) continue;
        if (!can_access_path(context, key)) continue;

        const parts = key.split("/");
        let prefix = "";
        for (let i = 0; i < parts.length - 1; i++) {
          prefix += `${parts[i]}/`;
          if (parts[i].toLowerCase().includes(q)) {
            folderSet.add(prefix);
          }
        }

        if (key.endsWith("/_$folder$")) continue;

        if (key.toLowerCase().includes(q)) {
          const { size, uploaded, httpMetadata, customMetadata } = obj;
          matchedFiles.push({ key, size, uploaded, httpMetadata, customMetadata });
        }
      }

      cursor = objList.truncated ? objList.cursor : undefined;
      pages++;
    } while (cursor && pages < MAX_PAGES);

    const matchedFolders = Array.from(folderSet).sort();

    return new Response(
      JSON.stringify({ value: matchedFiles, folders: matchedFolders }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(e.toString(), { status: 500 });
  }
}

const KV_KEY = "reviews_data";
const DEFAULT_ADMIN_PASSWORD = "MeadsCabin2026!";

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store"
        }
    });
}

async function readStore(kv) {
    if (!kv) return null;
    const raw = await kv.get(KV_KEY, "json");
    if (!raw || typeof raw !== "object") {
        return { customReviews: [], hiddenDefaultIds: [] };
    }
    return {
        customReviews: Array.isArray(raw.customReviews) ? raw.customReviews : [],
        hiddenDefaultIds: Array.isArray(raw.hiddenDefaultIds) ? raw.hiddenDefaultIds : []
    };
}

function getSecrets(env) {
    const password = env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
    const signingSecret = env.ADMIN_SECRET || `${password}::meads_cabin_signing_v1`;
    return {
        password,
        signingSecret,
        usingDefaultPassword: !env.ADMIN_PASSWORD
    };
}

async function getHmacKey(secret) {
    const enc = new TextEncoder();
    return crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
}

function toBase64Url(bytes) {
    let str = "";
    for (let i = 0; i < bytes.length; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64url) {
    const padded = b64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64url.length % 4)) % 4);
    const bin = atob(padded);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
}

async function createToken(signingSecret) {
    const payload = {
        role: "admin",
        exp: Date.now() + 24 * 60 * 60 * 1000
    };
    const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
    const key = await getHmacKey(signingSecret);
    const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
    const sigB64 = toBase64Url(new Uint8Array(sigBuf));
    return `${payloadB64}.${sigB64}`;
}

async function verifyToken(token, signingSecret) {
    if (!token || typeof token !== "string" || !token.includes(".")) return false;
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return false;

    try {
        const key = await getHmacKey(signingSecret);
        const sigBytes = fromBase64Url(sigB64);
        const valid = await crypto.subtle.verify(
            "HMAC",
            key,
            sigBytes,
            new TextEncoder().encode(payloadB64)
        );
        if (!valid) return false;

        const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64));
        const payload = JSON.parse(payloadJson);
        return payload.role === "admin" && typeof payload.exp === "number" && payload.exp > Date.now();
    } catch {
        return false;
    }
}

async function requireAdmin(request, env) {
    const auth = request.headers.get("Authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const { signingSecret } = getSecrets(env);
    return verifyToken(token, signingSecret);
}

export async function onRequestGet(context) {
    const authorized = await requireAdmin(context.request, context.env);
    if (!authorized) {
        return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const kv = context.env.REVIEWS_KV;
    if (!kv) {
        return jsonResponse({
            customReviews: [],
            hiddenDefaultIds: [],
            kvConfigured: false
        });
    }

    const store = await readStore(kv);
    return jsonResponse({
        customReviews: store.customReviews,
        hiddenDefaultIds: store.hiddenDefaultIds,
        kvConfigured: true
    });
}

export async function onRequestPost(context) {
    let body;
    try {
        body = await context.request.json();
    } catch {
        return jsonResponse({ error: "Invalid JSON payload." }, 400);
    }

    const { password, signingSecret, usingDefaultPassword } = getSecrets(context.env);

    if (body.action === "login") {
        const submitted = typeof body.password === "string" ? body.password : "";
        if (!submitted || submitted !== password) {
            return jsonResponse({ error: "Incorrect admin password." }, 401);
        }
        const token = await createToken(signingSecret);
        return jsonResponse({
            token,
            usingDefaultPassword
        });
    }

    const authorized = await requireAdmin(context.request, context.env);
    if (!authorized) {
        return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const kv = context.env.REVIEWS_KV;
    if (!kv) {
        return jsonResponse({ error: "KV_NOT_CONFIGURED" }, 503);
    }

    const store = await readStore(kv);
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
        return jsonResponse({ error: "Missing review id." }, 400);
    }

    if (body.action === "delete_custom") {
        store.customReviews = store.customReviews.filter(r => r.id !== id);
        await kv.put(KV_KEY, JSON.stringify(store));
        return jsonResponse({ ok: true, customReviews: store.customReviews, hiddenDefaultIds: store.hiddenDefaultIds });
    }

    if (body.action === "hide_default") {
        if (!store.hiddenDefaultIds.includes(id)) {
            store.hiddenDefaultIds.push(id);
            await kv.put(KV_KEY, JSON.stringify(store));
        }
        return jsonResponse({ ok: true, customReviews: store.customReviews, hiddenDefaultIds: store.hiddenDefaultIds });
    }

    if (body.action === "restore_default") {
        store.hiddenDefaultIds = store.hiddenDefaultIds.filter(hiddenId => hiddenId !== id);
        await kv.put(KV_KEY, JSON.stringify(store));
        return jsonResponse({ ok: true, customReviews: store.customReviews, hiddenDefaultIds: store.hiddenDefaultIds });
    }

    return jsonResponse({ error: "Unknown action." }, 400);
}

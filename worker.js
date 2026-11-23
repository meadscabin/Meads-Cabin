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

function normalizeStore(raw) {
    if (!raw || typeof raw !== "object") {
        return { customReviews: [], hiddenDefaultIds: [] };
    }
    return {
        customReviews: Array.isArray(raw.customReviews) ? raw.customReviews : [],
        hiddenDefaultIds: Array.isArray(raw.hiddenDefaultIds) ? raw.hiddenDefaultIds : []
    };
}

function hasStorageBinding(env) {
    return Boolean(env.REVIEWS_KV || env.REVIEWS_DO);
}

async function readStore(env) {
    if (env.REVIEWS_KV) {
        const raw = await env.REVIEWS_KV.get(KV_KEY, "json");
        return normalizeStore(raw);
    }
    if (env.REVIEWS_DO) {
        const id = env.REVIEWS_DO.idFromName("global");
        const stub = env.REVIEWS_DO.get(id);
        const res = await stub.fetch("https://do.internal/store");
        const raw = await res.json();
        return normalizeStore(raw);
    }
    return null;
}

async function writeStore(env, store) {
    if (env.REVIEWS_KV) {
        await env.REVIEWS_KV.put(KV_KEY, JSON.stringify(store));
        return true;
    }
    if (env.REVIEWS_DO) {
        const id = env.REVIEWS_DO.idFromName("global");
        const stub = env.REVIEWS_DO.get(id);
        await stub.fetch("https://do.internal/store", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(store)
        });
        return true;
    }
    return false;
}

function formatMonthYear(dateObj) {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const month = months[dateObj.getUTCMonth()];
    const year = String(dateObj.getUTCFullYear()).slice(-2);
    return `${month} ${year}`;
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

async function handleReviewsApi(request, env) {
    if (!hasStorageBinding(env)) {
        return jsonResponse({ error: "STORAGE_NOT_CONFIGURED" }, 503);
    }

    if (request.method === "GET") {
        const store = await readStore(env);
        return jsonResponse({
            reviews: store.customReviews,
            hiddenDefaultIds: store.hiddenDefaultIds
        });
    }

    if (request.method === "POST") {
        let body;
        try {
            body = await request.json();
        } catch {
            return jsonResponse({ error: "Invalid JSON payload." }, 400);
        }

        const name = typeof body.name === "string" ? body.name.trim() : "";
        const rating = Number(body.rating);
        const text = typeof body.text === "string" ? body.text.trim() : "";
        const photo = typeof body.photo === "string" ? body.photo.trim() : "";

        if (!name || name.length > 80) {
            return jsonResponse({ error: "Please enter your name (up to 80 characters)." }, 400);
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return jsonResponse({ error: "Please select a star rating between 1 and 5." }, 400);
        }

        if (text.length > 1000) {
            return jsonResponse({ error: "Review text must be 1000 characters or fewer." }, 400);
        }

        if (photo && (!photo.startsWith("data:image/") || photo.length > 600000)) {
            return jsonResponse({ error: "Uploaded photo is invalid or too large." }, 400);
        }

        const now = new Date();
        const review = {
            id: `guest-${crypto.randomUUID()}`,
            name,
            rating,
            text,
            photo,
            date: formatMonthYear(now),
            createdAt: now.toISOString()
        };

        const store = await readStore(env);
        store.customReviews.unshift(review);
        await writeStore(env, store);

        return jsonResponse({ review }, 201);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
}

async function handleAdminApi(request, env) {
    if (request.method === "GET") {
        const authorized = await requireAdmin(request, env);
        if (!authorized) {
            return jsonResponse({ error: "Unauthorized" }, 401);
        }

        if (!hasStorageBinding(env)) {
            return jsonResponse({
                customReviews: [],
                hiddenDefaultIds: [],
                kvConfigured: false
            });
        }

        const store = await readStore(env);
        return jsonResponse({
            customReviews: store.customReviews,
            hiddenDefaultIds: store.hiddenDefaultIds,
            kvConfigured: true
        });
    }

    if (request.method === "POST") {
        let body;
        try {
            body = await request.json();
        } catch {
            return jsonResponse({ error: "Invalid JSON payload." }, 400);
        }

        const { password, signingSecret, usingDefaultPassword } = getSecrets(env);

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

        const authorized = await requireAdmin(request, env);
        if (!authorized) {
            return jsonResponse({ error: "Unauthorized" }, 401);
        }

        if (!hasStorageBinding(env)) {
            return jsonResponse({ error: "STORAGE_NOT_CONFIGURED" }, 503);
        }

        const store = await readStore(env);
        const id = typeof body.id === "string" ? body.id.trim() : "";

        if (!id) {
            return jsonResponse({ error: "Missing review id." }, 400);
        }

        if (body.action === "delete_custom") {
            store.customReviews = store.customReviews.filter(r => r.id !== id);
            await writeStore(env, store);
            return jsonResponse({ ok: true, customReviews: store.customReviews, hiddenDefaultIds: store.hiddenDefaultIds });
        }

        if (body.action === "hide_default") {
            if (!store.hiddenDefaultIds.includes(id)) {
                store.hiddenDefaultIds.push(id);
                await writeStore(env, store);
            }
            return jsonResponse({ ok: true, customReviews: store.customReviews, hiddenDefaultIds: store.hiddenDefaultIds });
        }

        if (body.action === "restore_default") {
            store.hiddenDefaultIds = store.hiddenDefaultIds.filter(hiddenId => hiddenId !== id);
            await writeStore(env, store);
            return jsonResponse({ ok: true, customReviews: store.customReviews, hiddenDefaultIds: store.hiddenDefaultIds });
        }

        return jsonResponse({ error: "Unknown action." }, 400);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
}

export class ReviewsStore {
    constructor(state, env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request) {
        if (request.method === "GET") {
            const data = (await this.state.storage.get(KV_KEY)) || { customReviews: [], hiddenDefaultIds: [] };
            return jsonResponse(data);
        }
        if (request.method === "PUT") {
            const body = await request.json();
            await this.state.storage.put(KV_KEY, body);
            return jsonResponse({ ok: true });
        }
        return new Response("Method Not Allowed", { status: 405 });
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === "/api/reviews") {
            return handleReviewsApi(request, env);
        }
        if (url.pathname === "/api/admin") {
            return handleAdminApi(request, env);
        }
        if (env.ASSETS) {
            return env.ASSETS.fetch(request);
        }
        return new Response("Not Found", { status: 404 });
    }
};

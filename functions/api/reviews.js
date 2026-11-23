const KV_KEY = "reviews_data";

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

function formatMonthYear(dateObj) {
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const month = months[dateObj.getUTCMonth()];
    const year = String(dateObj.getUTCFullYear()).slice(-2);
    return `${month} ${year}`;
}

export async function onRequestGet(context) {
    const kv = context.env.REVIEWS_KV;
    if (!kv) {
        return jsonResponse({ error: "KV_NOT_CONFIGURED" }, 503);
    }

    const store = await readStore(kv);
    return jsonResponse({
        reviews: store.customReviews,
        hiddenDefaultIds: store.hiddenDefaultIds
    });
}

export async function onRequestPost(context) {
    const kv = context.env.REVIEWS_KV;
    if (!kv) {
        return jsonResponse({ error: "KV_NOT_CONFIGURED" }, 503);
    }

    let body;
    try {
        body = await context.request.json();
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

    const store = await readStore(kv);
    store.customReviews.unshift(review);
    await kv.put(KV_KEY, JSON.stringify(store));

    return jsonResponse({ review }, 201);
}

// The data layer. The rest of the app only ever calls store.list(), create(),
// update() and remove(). It never knows whether the data lives in MongoDB or in
// this browser, so either one can be swapped in without touching the UI code.

// ---------- Cloud store: talks to the Express API, which talks to MongoDB ----------
function createApiStore(baseUrl) {
    async function request(method, path, body) {
        const res = await fetch(baseUrl + path, {
            method,
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (res.status === 204) return null; // deleted, nothing to read
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
        return data;
    }

    return {
        mode: "cloud",
        list: () => request("GET", "/api/applications"),
        create: (app) => request("POST", "/api/applications", app),
        update: (id, changes) => request("PATCH", `/api/applications/${id}`, changes),
        remove: (id) => request("DELETE", `/api/applications/${id}`),
    };
}

// ---------- Local store: keeps everything in this browser's localStorage ----------
function createLocalStore() {
    const KEY = "internship-tracker.applications";

    function read() {
        try {
            return JSON.parse(localStorage.getItem(KEY)) || [];
        } catch {
            return [];
        }
    }
    function write(apps) {
        try {
            localStorage.setItem(KEY, JSON.stringify(apps));
        } catch {
            // Private browsing can block storage; the app still works until refresh
        }
    }

    return {
        mode: "local",
        async list() {
            return read();
        },
        async create(app) {
            const created = { ...app, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
            write([...read(), created]);
            return created;
        },
        async update(id, changes) {
            let updated = null;
            write(
                read().map((a) => {
                    if (a.id !== id) return a;
                    updated = { ...a, ...changes };
                    return updated;
                })
            );
            if (!updated) throw new Error("Application not found");
            return updated;
        },
        async remove(id) {
            write(read().filter((a) => a.id !== id));
            return null;
        },
    };
}

// ---------- Choose a store when the page loads ----------
// Free Render servers sleep when idle and take up to a minute to wake,
// so the health check waits long enough for that before giving up.
async function connectStore(onWaiting) {
    if (!API_BASE) return createLocalStore();

    const slowTimer = setTimeout(onWaiting, 2500); // only show "waking up" if it is slow
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 75000);
        const res = await fetch(API_BASE + "/api/health", { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) throw new Error("Database not connected");
        return createApiStore(API_BASE);
    } catch {
        return createLocalStore();
    } finally {
        clearTimeout(slowTimer);
    }
}

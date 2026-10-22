// The UI. One array (state.apps) is the single source of truth.
// Every action follows the same pattern: ask the store to change the data,
// update state.apps, then call render() to redraw the page from it.

const STAGES = ["Applied", "Interview", "Offer", "Rejected"];

const state = {
    apps: [],
    store: null,
    filter: { status: "All", query: "", sort: "newest" },
};

// ---------- Elements ----------
const $ = (id) => document.getElementById(id);
const els = {
    connection: $("connection"),
    summary: $("summary"),
    bar: $("pipeline-bar"),
    legend: $("pipeline-legend"),
    form: $("app-form"),
    formMessage: $("form-message"),
    addButton: $("add-button"),
    search: $("search"),
    statusFilter: $("status-filter"),
    sort: $("sort"),
    list: $("app-list"),
    resultCount: $("result-count"),
};

// Small helper to build elements safely. Text always goes in with textContent,
// never innerHTML, so typing <script> as a company name shows it as plain text (no XSS).
function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (key === "text") node.textContent = value;
        else if (key === "class") node.className = value;
        else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value);
    }
    for (const child of children) if (child) node.append(child);
    return node;
}

function plural(count, word) {
    return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function formatDate(isoDate) {
    if (!isoDate) return "No date";
    const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

function todayISO() {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 10);
}

// ---------- Render: redraw everything from state ----------
function render() {
    renderPipeline();
    renderList();
}

function countByStage() {
    const counts = Object.fromEntries(STAGES.map((s) => [s, 0]));
    for (const app of state.apps) counts[app.status] = (counts[app.status] || 0) + 1;
    return counts;
}

function renderPipeline() {
    const counts = countByStage();
    const total = state.apps.length;

    els.summary.textContent =
        total === 0
            ? "No applications yet. Add your first one below."
            : `${plural(total, "application")}, ${counts.Interview} at interview and ${plural(counts.Offer, "offer")}.`;

    // The bar: one segment per stage, sized by how many applications are in it
    els.bar.replaceChildren();
    els.bar.classList.toggle("is-empty", total === 0);
    for (const stage of STAGES) {
        if (counts[stage] === 0) continue;
        const active = state.filter.status === stage;
        els.bar.append(
            el("button", {
                type: "button",
                class: `segment stage-${stage.toLowerCase()}${active ? " is-active" : ""}`,
                style: `flex-grow: ${counts[stage]}`,
                "aria-pressed": String(active),
                "aria-label": `${stage}: ${counts[stage]}. ${active ? "Show all stages" : "Show only " + stage}`,
                onclick: () => setStatusFilter(active ? "All" : stage),
            })
        );
    }

    // The legend under the bar doubles as the filter for keyboard and screen-reader users
    els.legend.replaceChildren(
        ...STAGES.map((stage) => {
            const active = state.filter.status === stage;
            return el("li", {}, [
                el(
                    "button",
                    {
                        type: "button",
                        class: `legend-item${active ? " is-active" : ""}`,
                        "aria-pressed": String(active),
                        onclick: () => setStatusFilter(active ? "All" : stage),
                    },
                    [
                        el("span", { class: `dot stage-${stage.toLowerCase()}`, "aria-hidden": "true" }),
                        el("span", { class: "legend-count", text: String(counts[stage]) }),
                        el("span", { text: stage }),
                    ]
                ),
            ]);
        })
    );
}

function visibleApps() {
    const { status, query, sort } = state.filter;
    const q = query.trim().toLowerCase();

    const filtered = state.apps.filter((app) => {
        const matchesStatus = status === "All" || app.status === status;
        const matchesQuery = !q || app.company.toLowerCase().includes(q) || app.role.toLowerCase().includes(q);
        return matchesStatus && matchesQuery;
    });

    const byDate = (a, b) => (a.dateApplied || "").localeCompare(b.dateApplied || "");
    if (sort === "newest") filtered.sort((a, b) => byDate(b, a));
    if (sort === "oldest") filtered.sort(byDate);
    if (sort === "company") filtered.sort((a, b) => a.company.localeCompare(b.company));
    return filtered;
}

function renderList() {
    const apps = visibleApps();
    els.resultCount.textContent =
        apps.length === state.apps.length ? plural(apps.length, "application") : `${apps.length} of ${state.apps.length} shown`;

    if (state.apps.length === 0) {
        els.list.replaceChildren(
            el("li", { class: "empty" }, [
                el("p", { text: "Nothing tracked yet. Add an application with the form, or load a few examples to try the tracker." }),
                el("button", { type: "button", class: "secondary", text: "Load example applications", onclick: loadExamples }),
            ])
        );
        return;
    }
    if (apps.length === 0) {
        els.list.replaceChildren(
            el("li", { class: "empty" }, [
                el("p", { text: "No applications match this search or stage." }),
                el("button", { type: "button", class: "secondary", text: "Clear filters", onclick: clearFilters }),
            ])
        );
        return;
    }

    els.list.replaceChildren(...apps.map(renderRow));
}

function renderRow(app) {
    const stageClass = `stage-${app.status.toLowerCase()}`;

    const statusSelect = el(
        "select",
        {
            class: `status-select ${stageClass}`,
            "aria-label": `Status for ${app.company}`,
            onchange: (e) => changeStatus(app.id, e.target.value),
        },
        STAGES.map((s) => {
            const option = el("option", { value: s, text: s });
            if (s === app.status) option.selected = true;
            return option;
        })
    );

    const title = app.link
        ? el("a", { href: app.link, target: "_blank", rel: "noopener noreferrer", class: "company", text: app.company })
        : el("span", { class: "company", text: app.company });

    const deleteButton = el("button", {
        type: "button",
        class: "delete",
        text: "Delete",
        "aria-label": `Delete ${app.company}`,
    });
    // Two-step delete: the first click asks, the second click deletes
    deleteButton.addEventListener("click", () => {
        if (deleteButton.classList.contains("is-confirming")) return deleteApp(app.id);
        deleteButton.classList.add("is-confirming");
        deleteButton.textContent = "Confirm delete";
        setTimeout(() => {
            deleteButton.classList.remove("is-confirming");
            deleteButton.textContent = "Delete";
        }, 3000);
    });

    return el("li", { class: `app-row ${stageClass}` }, [
        el("div", { class: "app-main" }, [title, el("span", { class: "role", text: app.role })]),
        el("span", { class: "date", text: formatDate(app.dateApplied) }),
        statusSelect,
        deleteButton,
    ]);
}

// ---------- Actions ----------
async function addApp(data) {
    const created = await state.store.create(data);
    state.apps.push(created);
    render();
}

async function changeStatus(id, status) {
    const app = state.apps.find((a) => a.id === id);
    const previous = app.status;
    app.status = status; // update the screen straight away…
    render();
    try {
        await state.store.update(id, { status });
    } catch (err) {
        app.status = previous; // …and undo it if the server refuses
        render();
        flash(`Could not update ${app.company}: ${err.message}`);
    }
}

async function deleteApp(id) {
    try {
        await state.store.remove(id);
        state.apps = state.apps.filter((a) => a.id !== id);
        render();
    } catch (err) {
        flash(`Could not delete: ${err.message}`);
    }
}

function setStatusFilter(status) {
    state.filter.status = status;
    els.statusFilter.value = status;
    render();
}

function clearFilters() {
    state.filter.query = "";
    els.search.value = "";
    setStatusFilter("All");
}

async function loadExamples() {
    const examples = [
        { company: "Northwind Labs", role: "Software Engineering Intern", status: "Interview", dateApplied: "2026-10-02" },
        { company: "Aster Semiconductor", role: "Test Automation Intern", status: "Applied", dateApplied: "2026-10-05" },
        { company: "Kestrel Systems", role: "Embedded Software Intern", status: "Rejected", dateApplied: "2026-09-28" },
        { company: "Blue Harbour Analytics", role: "Data Engineering Intern", status: "Offer", dateApplied: "2026-09-20" },
        { company: "Orbit Devices", role: "Full Stack Developer Intern", status: "Applied", dateApplied: "2026-10-11" },
    ];
    try {
        for (const example of examples) state.apps.push(await state.store.create(example));
        render();
    } catch (err) {
        flash(`Could not add examples: ${err.message}`);
    }
}

function flash(message) {
    els.formMessage.textContent = message;
    setTimeout(() => (els.formMessage.textContent = ""), 5000);
}

// ---------- Form validation ----------
function validate(data) {
    const errors = {};
    if (!data.company) errors.company = "Enter the company name.";
    if (!data.role) errors.role = "Enter the role you applied for.";
    if (data.dateApplied && data.dateApplied > todayISO()) errors.dateApplied = "The date applied can't be in the future.";
    if (data.link && !/^https?:\/\/\S+\.\S+/.test(data.link)) errors.link = "Enter a full link starting with https://";
    return errors;
}

function showErrors(errors) {
    for (const field of ["company", "role", "dateApplied", "link"]) {
        const input = els.form.elements[field];
        const message = errors[field] || "";
        $(`${field}-error`).textContent = message;
        input.setAttribute("aria-invalid", message ? "true" : "false");
        if (message) input.setAttribute("aria-describedby", `${field}-error`);
        else input.removeAttribute("aria-describedby");
    }
}

els.form.addEventListener("submit", async (e) => {
    e.preventDefault(); // stop the browser reloading the page
    const raw = Object.fromEntries(new FormData(els.form));
    const data = {
        company: raw.company.trim(),
        role: raw.role.trim(),
        status: raw.status,
        dateApplied: raw.dateApplied || todayISO(),
        link: raw.link.trim(),
    };

    const errors = validate(data);
    showErrors(errors);
    const firstInvalid = Object.keys(errors)[0];
    if (firstInvalid) return els.form.elements[firstInvalid].focus();

    els.addButton.disabled = true;
    els.addButton.textContent = "Adding…";
    try {
        await addApp(data);
        els.form.reset();
        els.form.elements.dateApplied.value = todayISO();
        els.form.elements.company.focus();
    } catch (err) {
        els.formMessage.textContent = `Could not add the application: ${err.message}`;
    } finally {
        els.addButton.disabled = false;
        els.addButton.textContent = "Add application";
    }
});

// Clear a field's error as soon as the user starts fixing it
els.form.addEventListener("input", (e) => {
    const errorEl = $(`${e.target.name}-error`);
    if (errorEl && errorEl.textContent) {
        errorEl.textContent = "";
        e.target.setAttribute("aria-invalid", "false");
    }
});

// ---------- Filters ----------
els.search.addEventListener("input", (e) => {
    state.filter.query = e.target.value;
    renderList();
});
els.statusFilter.addEventListener("change", (e) => setStatusFilter(e.target.value));
els.sort.addEventListener("change", (e) => {
    state.filter.sort = e.target.value;
    renderList();
});

// ---------- Start ----------
async function init() {
    els.form.elements.dateApplied.value = todayISO();
    els.form.elements.dateApplied.max = todayISO();

    state.store = await connectStore(() => {
        els.connection.textContent = "Waking up the server, this can take up to a minute…";
    });

    const cloud = state.store.mode === "cloud";
    els.connection.textContent = cloud ? "Saved to the cloud database" : "Saved in this browser";
    els.connection.classList.toggle("is-cloud", cloud);
    if (!cloud && API_BASE) els.connection.textContent = "Server offline, saving in this browser";

    try {
        state.apps = await state.store.list();
    } catch (err) {
        flash(`Could not load applications: ${err.message}`);
    }
    render();
}

init();

# How the Internship Tracker works

This file explains every part of the project: what it is for, how the pieces fit together,
and why each decision was made. Read it top to bottom once, then use the last section to
practise interview answers.

---

## 1. The product idea

**Problem:** students apply to dozens of internships across several portals (NTU InPlace,
LinkedIn, company sites) and lose track of where each one stands.

**User:** a university student in the middle of an internship search.

**Goal:** see the whole search at a glance, add a new application in seconds, and update
its stage as it moves from Applied to Interview to Offer (or Rejected).

---

## 2. The architecture

```
 Browser                      Server (Render)                 Database (MongoDB Atlas)
 ─────────                    ───────────────                 ────────────────────────
 index.html                   server.js (Express)             "applications" collection
 style.css        fetch()     ┌──────────────────┐  Mongoose  ┌───────────────────────┐
 js/app.js     ─────────────▶ │ GET    /api/...  │ ─────────▶ │ { company, role,      │
 js/storage.js ◀───────────── │ POST   /api/...  │ ◀───────── │   status, dateApplied,│
 js/config.js      JSON       │ PATCH  /api/...  │            │   link, createdAt }   │
                              │ DELETE /api/...  │            └───────────────────────┘
 GitHub Pages                 └──────────────────┘
```

There are three parts because **the browser can't safely talk to the database directly.**
To connect to MongoDB you need a password. Anything in front-end JavaScript can be read by
anyone who opens DevTools, so the password has to live on a server. The browser only talks
to the server's API, and the server is the only thing that holds the password.

| Part | Technology | Hosted on | Job |
| --- | --- | --- | --- |
| Front end | HTML, CSS, plain JavaScript | GitHub Pages (free) | What the user sees and clicks |
| API | Node.js + Express + Mongoose | Render (free) | Checks requests, reads and writes the database |
| Database | MongoDB | MongoDB Atlas (free M0) | Stores the applications permanently |

**Why plain JavaScript, not React?** The site needs no build step, so it runs on GitHub
Pages as-is. It also shows I understand what a framework does for you: the `render()`
pattern in `app.js` is the same idea React automates.

**Why MongoDB?** Each application is a self-contained record, and MongoDB stores records
as JSON-like documents, the same shape as the JavaScript objects the front end already uses.
Nothing needs converting between the page and the database.

---

## 3. The front end, component by component

The page has five parts. Each one is a section in `index.html`, styled in `style.css` and
controlled by `js/app.js`.

### 3.1 Connection status (top bar)
- **Purpose:** tells the user where their data is being saved.
- **States:** "Connecting…", "Waking up the server, this can take up to a minute…",
  "Saved to the cloud database" (green dot), "Saved in this browser", or
  "Server offline, saving in this browser".
- **Why:** free Render servers sleep, so the first load can be slow. Telling the user what
  is happening is better than a page that looks frozen.

### 3.2 Pipeline summary (the hero)
- **Purpose:** answers "how is my search going?" in one glance.
- **Sentence:** built from live counts, e.g. "5 applications, 1 at interview and 1 offer."
- **Bar:** one coloured segment per stage. Each segment's width comes from
  `flex-grow: <count>`, so a stage with 4 applications is twice as wide as one with 2.
  Effectively it's a stacked bar chart built from CSS, with no chart library.
- **Interactive:** clicking a segment filters the list to that stage. Clicking it again
  shows everything. The legend underneath does the same thing for keyboard and
  screen-reader users, and shows the exact numbers.

### 3.3 Add form
- **Purpose:** add a new application quickly.
- **Fields:** company and role (required), status, date applied (defaults to today, can't be
  in the future) and listing link (optional, must start with http:// or https://).
- **Validation:** `validate()` in `app.js` checks the fields before anything is sent.
  Errors appear under the field that's wrong, the first invalid field gets focus, and each
  error clears as soon as the user starts fixing it.
- **Accessibility:** every input has a `<label>`. Invalid inputs get `aria-invalid="true"`
  and are linked to their error message with `aria-describedby`, so screen readers announce it.
- **While saving:** the button changes to "Adding…" and is disabled, which prevents
  double submissions if the server is slow.

### 3.4 Filters
- **Search box:** matches company or role, case-insensitive, updating as you type.
- **Stage filter:** the same filter as clicking the pipeline bar. Both stay in sync because
  both call `setStatusFilter()`.
- **Sort:** newest first, oldest first, or company A–Z.
- Filters never change the data. `visibleApps()` makes a filtered, sorted *copy* for display.

### 3.5 Application list
- **Each row shows:** company (a link to the listing if one was given), role, date, a status
  dropdown, and Delete.
- **Changing status:** the dropdown saves straight away (see "optimistic update" below).
- **Delete:** two-step. The first click changes the button to "Confirm delete" for three
  seconds, and only a second click deletes. This prevents accidents without a pop-up dialog.
- **Colour:** each row has a coloured left edge for its stage, matching the pipeline bar.
- **Empty states:** with no data, the list says so and offers "Load example applications"
  for a quick demo. When filters hide everything, it offers "Clear filters".

---

## 4. How data flows: one source of truth

`app.js` keeps all applications in one array, `state.apps`. **Every action follows the
same three steps:**

1. Ask the store to change the data (save it to MongoDB or localStorage).
2. Update `state.apps` to match.
3. Call `render()`, which redraws the summary, the bar and the list from `state.apps`.

Nothing on screen is edited directly. The screen is always rebuilt from the data, so it can
never show something different from what's stored.

### Example: adding an application, step by step
1. The user fills in the form and clicks **Add application**.
2. The `submit` listener runs `e.preventDefault()` so the browser doesn't reload the page.
3. `FormData` collects the fields, which are trimmed and checked by `validate()`.
4. If valid, `addApp(data)` calls `state.store.create(data)`.
5. In cloud mode, `storage.js` sends `POST /api/applications` with the data as JSON.
6. On the server, Express parses the JSON, `pickEditable()` keeps only the allowed fields,
   and `Application.create()` validates them against the schema and saves to MongoDB.
7. The server replies `201 Created` with the saved document, including its new `id`.
8. Back in the browser, the new application is pushed into `state.apps` and `render()` runs.
   The sentence, bar and list all update together.
9. The form is reset and focus returns to the Company field, ready for the next entry.

### Optimistic update (changing status)
When the status dropdown changes, `changeStatus()` updates the screen **first**, then sends
`PATCH` to the server. If the server refuses, it puts the old status back and shows an
error. This makes the app feel instant, even on a slow free server.

---

## 5. The data layer (`js/storage.js`)

The UI never calls `fetch` or `localStorage` directly. It only calls four methods on
`state.store`:

| Method | Cloud store (API) | Local store (browser) |
| --- | --- | --- |
| `list()` | `GET /api/applications` | read the array from localStorage |
| `create(app)` | `POST /api/applications` | add with `crypto.randomUUID()` as id |
| `update(id, changes)` | `PATCH /api/applications/:id` | merge changes into that item |
| `remove(id)` | `DELETE /api/applications/:id` | filter it out |

Both stores have **the same interface**, so `app.js` doesn't know or care which one it's
using. That's what made it possible to start with localStorage and add MongoDB later
without changing the UI code.

### Choosing a store on page load (`connectStore`)
- If `API_BASE` in `config.js` is empty → use the local store.
- Otherwise call `GET /api/health`. If the server answers `{ ok: true }`, use the cloud store.
- It waits up to 75 seconds, because a sleeping Render server takes about 50 seconds to wake.
  After 2.5 seconds it shows the "Waking up the server…" message.
- If the server never answers → fall back to the local store and say
  "Server offline, saving in this browser", so the demo still works.

Note: the local and cloud stores don't sync. Data saved in the browser stays in the browser.

---

## 6. The API (`server/server.js`)

### Middleware (runs before every route)
- **`cors`:** browsers block a page from reading responses from another domain unless the
  server allows it. Only origins listed in `ALLOWED_ORIGINS` (my GitHub Pages site and
  localhost) get permission, so other websites can't use my API from a visitor's browser.
- **`express.json({ limit: "10kb" })`:** turns the JSON request body into `req.body`, and
  rejects anything over 10 KB so nobody can flood the server with huge requests.

### Routes

| Method | Path | What it does | Success | Errors |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | Is the server up and connected to MongoDB? | 200 `{ok:true}` | 503 |
| GET | `/api/applications` | All applications, newest first | 200 + array | 500 |
| POST | `/api/applications` | Create one | 201 + new document | 400 if invalid |
| PATCH | `/api/applications/:id` | Change some fields (e.g. status) | 200 + updated doc | 400, 404 |
| DELETE | `/api/applications/:id` | Delete one | 204 (no body) | 400, 404 |

This is a **REST** design: the URL names the thing (`/api/applications`) and the HTTP
method says what to do to it.

**PATCH vs PUT:** PATCH changes only the fields you send, so changing the status sends just
`{ "status": "Offer" }`. PUT would replace the whole document.

### `pickEditable()`: only allowed fields get through
The server copies only `company`, `role`, `status`, `dateApplied` and `link` from the
request. If someone sends extra fields like `_id` or `isAdmin`, they're ignored. This
prevents "mass assignment", where an attacker sets fields they shouldn't control.

### One error handler
Any error in a route goes to the last `app.use(...)`, which turns it into a clear JSON reply:
- `ValidationError` (failed the schema) → **400** with readable messages,
  e.g. "Company is required. Status must be Applied, Interview, Offer or Rejected"
- `CastError` (an ID that isn't a valid MongoDB ID) → **400** "That application ID is not valid"
- Broken JSON → **400**
- Anything else → **500**, logged on the server, with no internal details sent to the browser.

### Starting up
`start()` checks that `MONGODB_URI` exists, connects with Mongoose, then starts listening.
If it can't connect, it exits with a clear message, and Render shows that in its logs.

---

## 7. The database schema (`server/models/Application.js`)

Mongoose checks every document against this schema before saving:

| Field | Type | Rules |
| --- | --- | --- |
| `company` | String | required, trimmed, max 100 characters |
| `role` | String | required, trimmed, max 150 characters |
| `status` | String | one of Applied, Interview, Offer, Rejected; default Applied |
| `dateApplied` | String | must look like `YYYY-MM-DD` |
| `link` | String | empty, or starts with http:// or https://; max 300 characters |
| `createdAt`, `updatedAt` | Date | added automatically by `timestamps: true` |

The `toJSON` transform renames MongoDB's `_id` to `id` and removes the internal `__v`
field, so the browser gets clean objects.

**Why validate twice (browser and server)?** Browser validation gives instant, friendly
feedback. Server validation is the real protection, because anyone can skip the browser and
send requests straight to the API with a tool like curl.

---

## 8. Security, in one list

1. **XSS prevention:** user text is always inserted with `textContent`, never `innerHTML`.
   If someone types `<img src=x onerror=alert(1)>` as a company name, it shows up as plain
   text and never runs. I tested exactly this.
2. **The secret stays on the server:** the MongoDB password lives in an environment
   variable on Render (`.env` locally) and is never in the front-end code or in Git.
3. **CORS** limits which websites can call the API from a browser.
4. **Server-side validation** through the Mongoose schema, plus the 10 KB body limit.
5. **Field allow-list** (`pickEditable`) stops mass assignment.
6. **Safe links:** listing links open with `rel="noopener noreferrer"`, so the opened page
   can't control the tracker's tab.

**Known limitation:** there's no login. Anyone with the site URL can add or delete entries
in the shared database. That's fine for a demo with example data, and adding authentication
is the first item in "next steps".

---

## 9. Design decisions

- **One idea up front:** the hero is the pipeline itself, a sentence and a bar. A student's
  main question is "how is my search going?", so that's answered first.
- **Colour means something:** four stage colours (blue Applied, amber Interview, green Offer,
  rose Rejected) and nothing else in colour. The same colour marks a stage everywhere: bar
  segment, legend dot, row edge, status dropdown. Text stays dark ink on a cool grey page.
- **Typography:** Bricolage Grotesque for headings gives the page character, and Figtree
  for body text keeps forms and lists easy to read. Numbers use tabular figures so they line
  up.
- **Layout:** the form sits beside the list on desktop and stays in view while scrolling
  (`position: sticky`). On screens under 860px everything stacks into one column, and under
  560px each row rearranges into two lines. There's no sideways scrolling on a phone; I
  tested at 390px wide.
- **Rows, not cards:** the list is one panel with dividers between rows, which is easier to
  scan than a pile of separate boxes.
- **Accessibility:** real labels on every input, a visible focus outline for keyboard
  users, `aria-pressed` on the filter buttons, `role="status"` on the connection message,
  and no animation for users who turn on "reduce motion".
- **Copy:** buttons say exactly what they do ("Add application", "Confirm delete"), and
  error messages say how to fix the problem ("Enter a full link starting with https://").

---

## 10. Testing I did

- Validation: empty fields, a bad link, and a future date are all caught.
- XSS: an HTML tag typed as a company name displays as text, and no element is created.
- Add, change status, delete, search, stage filter and sort all work.
- Data survives a page refresh, in both local and cloud mode.
- API: every route, including bad input (400), an unknown ID (404), an invalid ID (400),
  broken JSON (400), extra fields being ignored, and CORS refusing an unknown website.
- Offline fallback: when the API can't be reached, the page switches to browser storage
  and says so.
- Mobile layout at 390px wide, with no horizontal scrolling.

---

## 11. Next steps (good to mention at the end of the demo)

1. **Logins** so each student sees only their own applications (e.g. JWT or a service like
   Auth0), with a `userId` on every document.
2. **Reminders:** an "interview date" field and a list of upcoming interviews.
3. **Import from CSV or Excel**, reusing my Python data-cleaning experience.
4. **Automated tests:** Jest + Supertest for the API, Playwright for the page.
5. **A CMS-managed help page** for tips and guides, so non-developers can update content.
   This connects to the CMS work in the MediaTek role.

---

## 12. Questions they might ask, with short answers

**Walk me through what happens when I click Add.**
Section 4: validate in the browser → `POST` to the API → the server keeps the allowed fields
→ the schema validates → it's saved to MongoDB → 201 with the new document → push into state
→ `render()`.

**Why do you need a server at all?**
To keep the database password secret, and to validate data in a place the user can't skip.

**What is CORS?**
A browser rule that blocks a page from reading responses from another domain unless that
server says it's allowed. My API allows only my GitHub Pages site and localhost.

**How do you prevent XSS?**
User input only goes into the page through `textContent`, never `innerHTML`, so it's always
shown as text.

**What's the difference between PATCH and PUT?**
PATCH updates only the fields sent; PUT replaces the whole document.

**What does `e.preventDefault()` do in the form?**
It stops the browser's default form behaviour, which is reloading the page, so JavaScript
can handle the submit.

**Why MongoDB and not MySQL?**
Each application is a self-contained document with no relationships to other tables, and it
maps directly onto JavaScript objects. If I added users and shared companies, a relational
database like MySQL would make sense for the joins.

**What happens if the server is down during the demo?**
The health check fails, and the app falls back to saving in the browser. It tells the user
so, and everything keeps working.

**Why plain JavaScript instead of React?**
No build step, so it deploys straight to GitHub Pages. The `render()` pattern is the same
idea React uses, so moving to React later would be simple.

**What would you improve with more time?**
Logins, tests, and reminders for interview dates (section 11).

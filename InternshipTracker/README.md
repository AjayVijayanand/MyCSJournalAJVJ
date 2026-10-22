# Internship Tracker

A full-stack web app for keeping every internship application, interview and offer in one place.

**Live site:** <https://ajayvijayanand.github.io/MyCodingJournal/InternshipTracker/>

Students apply to dozens of internships across NTU InPlace, LinkedIn and company career
pages, and statuses change by email weeks apart. This tracker turns the whole search into
one pipeline you can read at a glance: a sentence and a colour-coded bar summarise every
stage, and each application can be added, updated or removed in a click.

---

## Features

| Feature | What it does |
| --- | --- |
| **Pipeline summary** | A live sentence ("5 applications, 1 at interview and 1 offer.") and a bar whose segments are sized by how many applications are in each stage |
| **Click to filter** | Click a bar segment or legend item to show only that stage; click again to show all |
| **Add form with validation** | Company and role are required, the date can't be in the future, and links must start with `https://`. Errors appear under the field and clear as you type |
| **Duplicate detection** | Adding the same company and role again updates the existing entry instead of creating a copy (matching ignores capitals and extra spaces) |
| **Inline status changes** | Change Applied → Interview → Offer or Rejected from a dropdown on each row; the screen updates instantly and reverts if the save fails |
| **Search, filter and sort** | Search by company or role, filter by stage, and sort by newest, oldest or company A–Z |
| **Two-click delete** | The first click asks for confirmation, the second deletes, with no pop-up dialog |
| **Cloud storage with fallback** | Data is saved to MongoDB through the API. If the server can't be reached, the page saves in the browser instead and says so |
| **Responsive and accessible** | Works from desktop down to phone width, with labelled inputs, linked error messages and a visible keyboard focus outline |

---

## Tech stack

| Layer | Technology | Hosted on |
| --- | --- | --- |
| Front end | HTML, CSS, plain JavaScript (no framework, no build step) | GitHub Pages |
| API | Node.js, Express | Render (free tier) |
| Database | MongoDB with Mongoose | MongoDB Atlas (free M0 cluster) |

---

## How it works

```
 Browser (GitHub Pages)          API (Render)                  Database (MongoDB Atlas)
 index.html, style.css     ──▶   Express routes          ──▶   "applications" collection
 js/app.js, js/storage.js  ◀──   Mongoose schema         ◀──
                    JSON over HTTPS                Mongoose
```

- **The browser never talks to the database directly.** Connecting to MongoDB needs a
  password, and anything in front-end JavaScript is visible to anyone, so the password
  lives only on the server, in an environment variable.
- **One source of truth.** All applications on the page live in one array, `state.apps`.
  Every action follows the same three steps: save the change through the API, update
  `state.apps`, then call `render()`, which redraws the summary, bar and list from it.
- **A swappable data layer.** `js/storage.js` offers two stores with the same four
  functions (`list`, `create`, `update`, `remove`): one calls the API, the other uses
  `localStorage`. The UI never knows which one it is using.

---

## Project structure

```
InternshipTracker/
├── index.html                  # Page structure: summary, form, filters, list
├── style.css                   # Colours, typography, layout and the phone layout
├── js/
│   ├── config.js               # API_BASE: the Render server's address
│   ├── storage.js              # Data layer: API store and localStorage store
│   └── app.js                  # UI: state, rendering, validation, filters, actions
└── server/
    ├── server.js               # Express API: CORS, routes, error handling
    ├── models/Application.js   # Mongoose schema for one application
    ├── package.json            # Dependencies and the start command
    ├── package-lock.json       # Exact dependency versions
    ├── .env.example            # Template for the server's secrets
    └── .gitignore              # Keeps .env and node_modules out of Git
```

---

## API reference

Base URL: `https://mycodingjournal.onrender.com`

| Method | Endpoint | Description | Success |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Checks the server is up and connected to MongoDB | `200 {"ok":true}` |
| `GET` | `/api/applications` | Lists all applications, newest first | `200` + array |
| `POST` | `/api/applications` | Creates an application | `201` + the new record |
| `PATCH` | `/api/applications/:id` | Updates some fields, e.g. `{"status":"Offer"}` | `200` + the updated record |
| `DELETE` | `/api/applications/:id` | Deletes an application | `204` |

Errors return JSON such as `{"error":"Company is required"}` with status `400` (invalid
data or ID) or `404` (not found).

**An application:**

| Field | Type | Rules |
| --- | --- | --- |
| `company` | string | Required, up to 100 characters |
| `role` | string | Required, up to 150 characters |
| `status` | string | `Applied`, `Interview`, `Offer` or `Rejected` (default `Applied`) |
| `dateApplied` | string | `YYYY-MM-DD` |
| `link` | string | Optional, must start with `http://` or `https://` |

---

## Security

- **No script injection (XSS):** user text is always added to the page with `textContent`,
  never `innerHTML`, so typed HTML is shown as plain text.
- **Secrets stay on the server:** the MongoDB connection string is an environment variable
  on Render and is never committed.
- **CORS:** only the GitHub Pages site is allowed to call the API from a browser.
- **Validation on both sides:** the browser gives instant feedback; the Mongoose schema
  enforces the rules on the server, where they can't be skipped.
- **Allowed fields only:** the server saves just the five fields above and ignores anything
  else in a request. Request bodies are limited to 10 KB.

---

## Running it locally

**Front end only (no database):** set `API_BASE = ""` in `js/config.js` and open
`index.html` with VS Code's Live Server. Data is saved in the browser.

**With the API:**
```bash
cd InternshipTracker/server
cp .env.example .env        # add your MongoDB Atlas connection string
npm install
npm run dev                 # "Connected to MongoDB", then "API listening on port 3000"
```
Then set `API_BASE = "http://localhost:3000"` in `js/config.js` and open the page with
Live Server on port 5500.

---

## Deployment

1. **MongoDB Atlas:** create a free M0 cluster and a database user, allow network access
   from `0.0.0.0/0`, and copy the connection string from **Connect → Drivers**.
2. **Render:** create a **Web Service** from this repository with
   - Root directory: `InternshipTracker/server`
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment variables: `MONGODB_URI` (the connection string) and
     `ALLOWED_ORIGINS` (`https://ajayvijayanand.github.io`)
3. **GitHub Pages:** set `API_BASE` in `js/config.js` to the Render URL and push.

Render's free tier sleeps after about 15 minutes without traffic and can take up to a
minute to wake; the page shows "Waking up the server…" while it does.

---

## Known limitations and next steps

- **No logins yet:** anyone with the link can edit the shared data. Next: user accounts,
  with a `userId` on every record so each student sees only their own applications.
- **Interview reminders:** an interview date field and a list of what's coming up.
- **Automated tests:** Jest and Supertest for the API, Playwright for the page.
- **Server-side duplicate check:** a unique index on company and role in MongoDB.

---

Built by **Ajay Vijay Anand**, Electrical & Electronic Engineering, NTU Singapore.
[Portfolio](https://ajayvijayanand.github.io/MyCodingJournal/PortfolioWebsite/) ·
[LinkedIn](https://linkedin.com/in/ajay-vijay-anand-2734ab185)

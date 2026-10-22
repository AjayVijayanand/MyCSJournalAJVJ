# Internship Tracker

A web app for keeping every internship application, interview and offer in one place.
The front end is plain HTML, CSS and JavaScript on GitHub Pages. Data is stored in
MongoDB Atlas through a small Node.js + Express API hosted on Render.

Live site: <https://ajayvijayanand.github.io/MyCodingJournal/InternshipTracker/>

| Path | Contents |
| --- | --- |
| `index.html` | Page structure: pipeline summary, add form, filters and list |
| `style.css` | Layout, colours, typography and the mobile layout |
| `js/config.js` | The API address (empty = save in this browser only) |
| `js/storage.js` | The data layer: talks to the API, or falls back to localStorage |
| `js/app.js` | The UI: state, rendering, form validation, filters and actions |
| `server/server.js` | The Express API: CORS, routes and error handling |
| `server/models/Application.js` | The Mongoose schema for one application |
| `EXPLANATION.md` | How everything works, file by file |

## Run it in this browser only (no database)

Leave `API_BASE` empty in `js/config.js` and open `index.html` with VS Code's Live Server
(or any local web server). Everything is saved in localStorage.

## Set up the database and API

### 1. MongoDB Atlas (free)
1. Sign up at <https://www.mongodb.com/cloud/atlas> and create a free **M0** cluster.
2. **Database Access** → add a database user (for example `tracker-user`) with a strong password.
3. **Network Access** → add IP address `0.0.0.0/0`. Render's free tier has no fixed IP,
   so the cluster has to accept connections from anywhere. The password still protects it.
4. **Connect → Drivers** → copy the connection string. Put your password in place of
   `<password>` and add the database name before the `?`:
   `mongodb+srv://tracker-user:PASSWORD@cluster0.xxxxx.mongodb.net/internship-tracker?retryWrites=true&w=majority`

### 2. Try the API on your laptop
```bash
cd InternshipTracker/server
cp .env.example .env      # then paste your connection string into .env
npm install
npm run dev               # "Connected to MongoDB" then "API listening on port 3000"
```
Open <http://localhost:3000/api/health>. You should see `{"ok":true}`.
To use it from the page, set `API_BASE = "http://localhost:3000"` in `js/config.js`
and open the page with Live Server (port 5500).

### 3. Deploy the API on Render (free)
1. Sign up at <https://render.com> with GitHub and allow access to `MyCodingJournal`.
2. **New → Web Service** → choose the `MyCodingJournal` repository.
3. Settings:
   - **Root Directory:** `InternshipTracker/server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. **Environment variables:**
   - `MONGODB_URI` = your Atlas connection string
   - `ALLOWED_ORIGINS` = `https://ajayvijayanand.github.io`
5. Deploy, then open `https://YOUR-SERVICE.onrender.com/api/health` and check for `{"ok":true}`.

### 4. Connect the website
Set `API_BASE` in `js/config.js` to your Render URL (no slash at the end), commit and push.
GitHub Pages updates within a minute or two.

## Before a demo
Render's free servers sleep after about 15 minutes without traffic and take up to a minute
to wake. Open the site a few minutes before presenting. The status in the top bar changes
to "Saved to the cloud database" once the server is awake.

Never commit `server/.env` or `server/node_modules`. Both are listed in `server/.gitignore`.

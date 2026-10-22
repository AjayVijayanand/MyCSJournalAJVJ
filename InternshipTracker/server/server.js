// A small REST API that sits between the website and MongoDB.
// The browser never sees the database password: it only talks to these routes.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Application = require("./models/Application");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------

// CORS: only the websites listed in ALLOWED_ORIGINS may call this API from a browser.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin(origin, callback) {
            // No origin = a tool like curl or Render's health check, not a browser
            if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(null, false); // browser will block the response
        },
    })
);

// Read JSON request bodies, and refuse anything larger than 10 KB
app.use(express.json({ limit: "10kb" }));

// Only these fields can ever be written by a request
const EDITABLE_FIELDS = ["company", "role", "status", "dateApplied", "link"];
function pickEditable(body) {
    const clean = {};
    for (const field of EDITABLE_FIELDS) {
        if (body[field] !== undefined) clean[field] = body[field];
    }
    return clean;
}

// ---------- Routes ----------

// Health check: lets the website know the server is awake and connected
app.get("/api/health", (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({ ok: connected });
});

// READ all applications, newest first
app.get("/api/applications", async (req, res, next) => {
    try {
        const apps = await Application.find().sort({ dateApplied: -1, createdAt: -1 });
        res.json(apps);
    } catch (err) {
        next(err);
    }
});

// CREATE one application
app.post("/api/applications", async (req, res, next) => {
    try {
        const created = await Application.create(pickEditable(req.body));
        res.status(201).json(created);
    } catch (err) {
        next(err);
    }
});

// UPDATE part of one application (for example, just its status)
app.patch("/api/applications/:id", async (req, res, next) => {
    try {
        const updated = await Application.findByIdAndUpdate(req.params.id, pickEditable(req.body), {
            new: true, // return the updated document, not the old one
            runValidators: true, // apply the schema rules to updates too
        });
        if (!updated) return res.status(404).json({ error: "Application not found" });
        res.json(updated);
    } catch (err) {
        next(err);
    }
});

// DELETE one application
app.delete("/api/applications/:id", async (req, res, next) => {
    try {
        const deleted = await Application.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: "Application not found" });
        res.status(204).end();
    } catch (err) {
        next(err);
    }
});

// ---------- Errors ----------

// One place that turns any error into a clear JSON response
app.use((err, req, res, next) => {
    if (err.name === "ValidationError") {
        const messages = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({ error: messages.join(". ") });
    }
    if (err.name === "CastError") {
        return res.status(400).json({ error: "That application ID is not valid" });
    }
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Request body must be valid JSON" });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server" });
});

// ---------- Start ----------

async function start() {
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI is missing. Copy .env.example to .env and fill it in.");
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
}

// Start the server only when run directly (not when a test imports this file)
if (require.main === module) {
    start().catch((err) => {
        console.error("Could not start:", err.message);
        process.exit(1);
    });
}

module.exports = app;

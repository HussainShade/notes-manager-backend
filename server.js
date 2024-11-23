const express = require("express");
const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");
const cors = require("cors");

let db;
const app = express();
app.use(express.json());
app.use(cors());

// Connect to the SQLite database
const initializeDBandServer = async () => {
    try {
        db = await open({
            filename: path.join(__dirname, "notes_manager.db"),
            driver: sqlite3.Database,
        });
        app.listen(3000, () => {
            console.log("Server is running on http://localhost:3000/");
        });
    } catch (error) {
        console.log(`Database error: ${error.message}`);
        process.exit(1);
    }
};

initializeDBandServer();

// CRUD Endpoints

// Get all notes with optional filters for category and title search
app.get("/notes", async (req, res) => {
    const { category, title } = req.query;
    let query = "SELECT * FROM notes";
    let conditions = [];

    if (category) {
        conditions.push(`category = '${category}'`);
    }
    if (title) {
        conditions.push(`title LIKE '%${title}%'`);
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY created_at DESC";

    const notes = await db.all(query);
    res.send(notes);
});

// Create a new note
app.post("/notes", async (req, res) => {
    const { title, description, category = "Others" } = req.body;
    if (!title || !description) {
        return res.status(400).send({ error: "Title and description are required" });
    }

    const insertNoteQuery = `
        INSERT INTO notes (title, description, category, completed)
        VALUES ('${title}', '${description}', '${category}', 0)
    `;
    await db.run(insertNoteQuery);
    res.send({ message: "Note created successfully" });
});

// Update a specific note by ID
app.put("/notes/:id", async (req, res) => {
    const { id } = req.params;
    const { title, description, category, completed } = req.body;

    const existingNote = await db.get(`SELECT * FROM notes WHERE id = ${id}`);
    if (!existingNote) {
        return res.status(404).send({ error: "Note not found" });
    }

    const updateNoteQuery = `
        UPDATE notes
        SET 
            title = '${title || existingNote.title}',
            description = '${description || existingNote.description}',
            category = '${category || existingNote.category}',
            completed = ${completed !== undefined ? completed : existingNote.completed},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
    `;
    await db.run(updateNoteQuery);
    res.send({ message: "Note updated successfully" });
});

// Delete a note by ID
app.delete("/notes/:id", async (req, res) => {
    const { id } = req.params;

    const deleteNoteQuery = `DELETE FROM notes WHERE id = ${id}`;
    const result = await db.run(deleteNoteQuery);
    if (result.changes === 0) {
        return res.status(404).send({ error: "Note not found" });
    }
    res.send({ message: "Note deleted successfully" });
});

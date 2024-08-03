const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');

const app = express();
const port = 3000; // You can change this port number if needed

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// MySQL connection setup
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Replace with your MySQL username
    password: 'password', // Replace with your MySQL password
    database: 'whatsapp_fitness'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database.');
});

// Route to handle incoming webhooks
app.post('/webhook', (req, res) => {
    const { user_id, message } = req.body;

    if (!user_id || !message) {
        return res.status(400).send('Invalid request: user_id and message are required.');
    }

    const query = 'INSERT INTO messages (user_id, message) VALUES (?, ?)';
    db.query(query, [user_id, message], (err, results) => {
        if (err) {
            console.error('Error inserting message:', err);
            return res.status(500).send('Internal server error.');
        }
        console.log('Message stored successfully.');
        res.status(200).send('Message received.');
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

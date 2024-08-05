const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cron = require('node-cron');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// MySQL connection setup
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'whatsapp_fitness'
};

// Function to get database connection
async function getConnection() {
    return await mysql.createConnection(dbConfig);
}

// Update chats table
async function updateChatsTable() {
    const conn = await getConnection();
    await conn.execute(`
        ALTER TABLE chats 
        ADD COLUMN message_type VARCHAR(20) DEFAULT NULL,
        ADD COLUMN streak INT DEFAULT 0
    `);
    await conn.end();
}

// Call this function to update the table (uncomment when needed)
// updateChatsTable();

// Route to handle incoming webhooks
app.post('/webhook', async (req, res) => {
    const { user_id, mobile, message, message_id, channel_id, message_type } = req.body;

    if (!user_id || !message) {
        return res.status(400).send('Invalid request: user_id and message are required.');
    }

    try {
        const conn = await getConnection();
        
        // Insert message into chats table
        await conn.execute(
            'INSERT INTO chats (user_id, mobile, message, message_id, channel_id, message_type) VALUES (?, ?, ?, ?, ?, ?)',
            [user_id, mobile, message, message_id, channel_id, message_type]
        );

        // If it's a workout log, update streak
        if (message_type === 'log') {
            await updateStreak(conn, user_id);
        }

        await conn.end();
        res.status(200).send('Message received and processed.');
    } catch (err) {
        console.error('Error processing message:', err);
        res.status(500).send('Internal server error.');
    }
});

async function updateStreak(conn, user_id) {
    const [rows] = await conn.execute(
        'SELECT created_at, streak FROM chats WHERE user_id = ? AND message_type = "log" ORDER BY created_at DESC LIMIT 2',
        [user_id]
    );

    let newStreak = 1;
    if (rows.length === 2) {
        const lastLog = new Date(rows[0].created_at);
        const prevLog = new Date(rows[1].created_at);
        const dayDiff = (lastLog - prevLog) / (1000 * 60 * 60 * 24);

        if (dayDiff <= 1) {
            newStreak = rows[1].streak + 1;
        }
    }

    await conn.execute(
        'UPDATE chats SET streak = ? WHERE user_id = ? AND message_type = "log" ORDER BY created_at DESC LIMIT 1',
        [newStreak, user_id]
    );
}

// Function to send reminders
async function sendReminders() {
    const conn = await getConnection();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const [users] = await conn.execute(`
        SELECT DISTINCT user_id, mobile 
        FROM chats 
        WHERE user_id NOT IN (
            SELECT DISTINCT user_id 
            FROM chats 
            WHERE message_type = 'log' AND DATE(created_at) = DATE(?)
        )`,
        [yesterday]
    );

    for (const user of users) {
        // Here you would integrate with your WhatsApp API to send a reminder
        console.log(`Sending reminder to user ${user.user_id} at ${user.mobile}`);
    }

    await conn.end();
}

// Schedule reminders to run daily at 9 AM
cron.schedule('0 9 * * *', () => {
    sendReminders();
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
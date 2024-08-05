const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const cron = require('node-cron');
const { Configuration, OpenAIApi } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');

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

// OpenAI configuration
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Pinecone configuration
const pinecone = new PineconeClient();
pinecone.init({
    environment: process.env.PINECONE_ENVIRONMENT,
    apiKey: process.env.PINECONE_API_KEY,
});

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

// Initialize vector DB
async function initializeVectorDB() {
    console.log("Initializing vector DB...");
    // Load your documents here
    const documents = [
        { id: 'doc1', text: 'Information about cardio exercises...' },
        { id: 'doc2', text: 'Nutrition guidelines for muscle building...' },
        // Add more documents as needed
    ];

    for (const doc of documents) {
        await embedAndStoreDoc(doc);
    }
    console.log("Vector DB initialization complete.");
}

// Embed document and store in vector DB
async function embedAndStoreDoc(doc) {
    const embedding = await getEmbedding(doc.text);
    await storeEmbedding(embedding, doc);
}

async function getEmbedding(text) {
    const response = await openai.createEmbedding({
        model: "text-embedding-ada-002",
        input: text,
    });
    return response.data.data[0].embedding;
}

async function storeEmbedding(embedding, metadata) {
    const index = pinecone.Index("fitness-docs");
    await index.upsert([
        {
            id: metadata.id,
            values: embedding,
            metadata: metadata,
        },
    ]);
}

// Answer retrieval from docs
async function retrieveAnswer(question) {
    const questionEmbedding = await getEmbedding(question);
    const index = pinecone.Index("fitness-docs");
    const queryResponse = await index.query({
        vector: questionEmbedding,
        topK: 5,
        includeMetadata: true,
    });

    const context = queryResponse.matches.map(match => match.metadata.text).join("\n");
    const answer = await generateAnswer(question, context);
    return answer;
}

async function generateAnswer(question, context) {
    const response = await openai.createCompletion({
        model: "text-davinci-002",
        prompt: `Context: ${context}\n\nQuestion: ${question}\n\nAnswer:`,
        max_tokens: 150,
    });
    return response.data.choices[0].text.trim();
}

// Store user activity
async function storeUserActivity(user_id, activity_type, details) {
    const conn = await getConnection();
    await conn.execute(
        'INSERT INTO user_activity (user_id, activity_type, details) VALUES (?, ?, ?)',
        [user_id, activity_type, JSON.stringify(details)]
    );
    await conn.end();
}

// Handle slash commands
async function handleSlashCommand(command, args, user_id) {
    switch (command) {
        case 'help':
            return "Available commands: /help, /streak, /log, /question";
        case 'streak':
            return await getUserStreak(user_id);
        case 'log':
            return await logWorkout(user_id, args.join(' '));
        case 'question':
            return await retrieveAnswer(args.join(' '));
        default:
            return "Unknown command. Type /help for available commands.";
    }
}

async function getUserStreak(user_id) {
    const conn = await getConnection();
    const [rows] = await conn.execute(
        'SELECT streak FROM chats WHERE user_id = ? AND message_type = "log" ORDER BY created_at DESC LIMIT 1',
        [user_id]
    );
    await conn.end();
    return rows.length > 0 ? `Your current streak is ${rows[0].streak} days!` : "You haven't started a streak yet. Log a workout to begin!";
}

async function logWorkout(user_id, workout_details) {
    const conn = await getConnection();
    await conn.execute(
        'INSERT INTO chats (user_id, message, message_type) VALUES (?, ?, "log")',
        [user_id, workout_details]
    );
    await updateStreak(conn, user_id);
    await conn.end();
    return "Workout logged successfully!";
}

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

        let response;

        if (message.startsWith('/')) {
            const [command, ...args] = message.slice(1).split(' ');
            response = await handleSlashCommand(command, args, user_id);
        } else if (message_type === 'log') {
            await updateStreak(conn, user_id);
            response = "Workout logged successfully!";
        } else if (message_type === 'qna') {
            response = await retrieveAnswer(message);
        } else {
            response = "Message received. How can I assist you today?";
        }

        // Store user activity
        await storeUserActivity(user_id, message_type, { message, response });

        await conn.end();
        res.status(200).json({ response });
    } catch (err) {
        console.error('Error processing message:', err);
        res.status(500).send('Internal server error.');
    }
});

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
        // Implement your WhatsApp sending logic here
    }

    await conn.end();
}

// Schedule reminders to run daily at 9 AM
cron.schedule('0 9 * * *', () => {
    sendReminders();
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
    initializeVectorDB(); // Initialize vector DB on server start
});
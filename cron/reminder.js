const cron = require('node-cron');
const axios = require('axios');
const mysql = require('mysql2/promise');

// Configure the MySQL pool with the promise-based API
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'whatsapp_bot',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const GALLABOX_API_URL = 'https://server.gallabox.com/devapi/messages/whatsapp';
const GALLABOX_API_KEY = process.env.WAAPIKEY;
const GALLABOX_API_SECRET = process.env.WAAPISECRET;

// Function to send WhatsApp reminders
async function sendWhatsAppReminder(phone, name) {
  try {
    
    const payloaddata = {
      "channelId": "628ce04877212400045f14d5",
      "channelType": "whatsapp",
      "recipient": {
        "name": name,
        "phone": phone
      },
      "whatsapp": {
        "type": "template",
        "template": {
          "templateName": "log1",
          "bodyValues": {
            "message": `Hi ${name}, ! It looks like you didn't log a workout yesterday. Don't forget to keep up with your fitness goals!`
          }
        }
      }
    };

    const options = {
      method: "POST",
      url: GALLABOX_API_URL,
      headers: {
        'apiSecret': GALLABOX_API_SECRET,
        'apiKey': GALLABOX_API_KEY,
        "Content-Type": "application/json"
      },
      data: JSON.stringify(payloaddata)
    };
    console.log(options);

    const result = await axios(options);
    console.log(`Reminder sent to ${phone}:`, result.data);
  } catch (error) {
    console.error(`Failed to send reminder to ${phone}:`, error);
  }
}

// Cron job to run daily at 8:00 AM
cron.schedule('0 10 * * *', async () => {
// cron.schedule('*/10 * * * * *', async () => {

  console.log('Running daily workout reminder job...');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const formattedDate = yesterday.toISOString().split('T')[0];

  try {
    // Query to find users who didn't log a workout yesterday
    const [rows] = await pool.query(`
      SELECT u.name, u.phone
      FROM users u
      LEFT JOIN workout w ON u.phone = w.phone AND DATE(w.workout_date) = ?
      WHERE w.id IS NULL
    `, [formattedDate]);
    
    console.log('Users to notify:', rows);

    for (const user of rows) {
      await sendWhatsAppReminder(user.phone, user.name);
    }
  } catch (error) {
    console.error('Error running reminder job:', error);
  }
});

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
});// Adjust the path to your DB configuration
const { GoogleGenerativeAI } = require("@google/generative-ai");

const GALLABOX_API_URL = 'https://server.gallabox.com/devapi/messages/whatsapp';
const GALLABOX_API_KEY = process.env.WAAPIKEY;
const GALLABOX_API_SECRET = process.env.WAAPISECRET;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Setup Gemini API client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Function to generate a fitness plan using Gemini
async function generateFitnessPlan(userProfile) {
  const prompt = `Generate a personalized fitness plan for a week for the user with the following profile: 
  Name: ${userProfile.name}, 
  Age: ${userProfile.age}, 
  Goal: ${userProfile.goal}, 
  Diet: ${userProfile.diet}.`;
  console.log(prompt);
  
  try {
    const report = await model.generateContent(prompt);
    console.log(report.response.text());
    return report.response.text();
  } catch (error) {
    console.error('Error generating fitness plan:', error);
    throw new Error('Failed to generate fitness plan');
  }
}

// Function to send WhatsApp messages using Gallabox
async function sendWhatsAppMessage(name,phone,fitnessPlan) {
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
              "message": `${fitnessPlan}`
            }
          }
        }
      };
  
      const options = {
        method: "POST",
        url: GALLABOX_API_URL,
        headers: {
          'apiSecret': process.env.WAAPISECRET,
          'apiKey': process.env.WAAPIKEY,
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

// Cron job to run every Monday at 9:00 AM
cron.schedule('0 10 * * 1', async () => {
// cron.schedule('*/10 * * * * *', async () => {
  console.log('Running weekly fitness plan generation job...');

  try {
    // Query to get all user profiles
    const [users] = await pool.query(`
      SELECT * FROM users
    `);

    console.log(users);

    for (const user of users) {
      try {
        // Generate fitness plan based on user profile
        const fitnessPlan = await generateFitnessPlan(user);
        
        // Send the generated plan to the user via WhatsApp
        await sendWhatsAppMessage(user.name,user.phone, fitnessPlan);
      } catch (error) {
        console.error(`Error processing user ${user.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error running weekly job:', error);
  }
});

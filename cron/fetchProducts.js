const cron = require('node-cron');
const mysql = require('mysql2/promise');

// Database connections
const usersDbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const invoicesDbConfig = {
  host: process.env.CUBE_HOST,
  user: process.env.CUBE_USERNAME,
  password: process.env.CUBE_PASS,
  database: process.env.CUBE_NAME
};

// Function to synchronize products
const syncProducts = async () => {
  let connectionUsers;
  let connectionInvoices;

  try {
    // Create database connections
    connectionUsers = await mysql.createPool(usersDbConfig);
    connectionInvoices = await mysql.createPool(invoicesDbConfig);

    // Query to get products bought by each user
    const userQuery = `
      SELECT DISTINCT(phone) FROM users;
    `;
    
    // Fetch user phone numbers
    const [rows] = await connectionUsers.query(userQuery);
    const normalizedPhones = rows.map(row => row.phone.slice(-10));
    const jsonPhones = JSON.stringify(normalizedPhones);
    
    console.log("Normalized phones:", normalizedPhones);
    console.log("JSON phones:", jsonPhones);

    // Invoice query
    const invoiceQuery = `
      SELECT u.mobile, GROUP_CONCAT(pdc.product_name) AS products
      FROM customer_invoices ci
      LEFT JOIN users u ON u.id = ci.user_id
      LEFT JOIN product_details_cubeclub pdc ON pdc.ean_code = ci.ean_code
      WHERE JSON_CONTAINS(?, JSON_QUOTE(u.mobile))
      GROUP BY u.id;
    `;
    
    // Fetch invoice data
    const [invoiceRows] = await connectionInvoices.query(invoiceQuery, [jsonPhones]);
    console.log("Invoice rows:", invoiceRows);

    // Prepare and execute update queries
    const updatePromises = invoiceRows.map(async (user) => {
      const updateProductQuery = `
        UPDATE users
        SET products = ?
        WHERE phone = ?;
      `;
      // Use parameterized queries to prevent SQL injection
      await connectionUsers.query(updateProductQuery, [user.products, `91${user.mobile}`]);
    });

    // Wait for all update queries to complete
    await Promise.all(updatePromises);

  } catch (err) {
    console.error("Error in syncProducts:", err);
  } finally {
    // Close connections
    if (connectionUsers) await connectionUsers.end();
    if (connectionInvoices) await connectionInvoices.end();
  }
};

// Schedule the cron job
// cron.schedule('*/10 * * * * *', () => {  // Runs every 10 seconds
cron.schedule('0 10 * * 0', () => {  // Runs every sunday
  console.log('Running synchronization');
  syncProducts();
});

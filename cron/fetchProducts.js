const cron = require('node-cron');
const mysql = require('mysql2');

// Database connections
const usersDb = mysql.createConnection({
  host: 'users-db-host',
  user: 'users-db-user',
  password: 'users-db-password',
  database: 'users-db'
});

const invoicesDb = mysql.createConnection({
  host: 'invoices-db-host',
  user: 'invoices-db-user',
  password: 'invoices-db-password',
  database: 'invoices-db'
});

// Function to synchronize products
const syncProducts = () => {
  // Query to get products bought by each user
  const invoicesQuery = `
    SELECT phone, GROUP_CONCAT(product_id) AS products
    FROM invoices
    GROUP BY phone;
  `;

  invoicesDb.query(invoicesQuery, (error, results) => {
    if (error) {
      console.error('Error fetching invoices:', error);
      return;
    }

    // Process each user's products
    results.forEach(row => {
      const { phone, products } = row;
      const updateQuery = `
        UPDATE users
        SET products = ?
        WHERE phone = ?;
      `;

      usersDb.query(updateQuery, [products, phone], (err) => {
        if (err) {
          console.error(`Error updating user ${phone}:`, err);
        } else {
          console.log(`Updated user ${phone} with products: ${products}`);
        }
      });
    });
  });
};

// Schedule the cron job
cron.schedule('0 0 * * *', () => { // Runs daily at midnight
  console.log('Running daily synchronization');
  syncProducts();
});

// Handle connection errors



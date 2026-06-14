// test-connection.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB;
console.log("Connecting to:", uri?.substring(0, 40) + "...");

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Connected to MongoDB Atlas!");
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
  } finally {
    await client.close();
  }
}
run();
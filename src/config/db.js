const dns = require("dns");

dns.setServers(["1.1.1.1", "1.0.0.1"]);
dns.setDefaultResultOrder("ipv4first");

const mongoose= require("mongoose")
require('dotenv').config();

const connectDB = async () => {
	try {
		console.log("connecting to database.... ")
		await mongoose.connect(process.env.MONGO_URI)
		console.log("Database connected!")
	} catch (error) {
		console.error("Database connection failed:", error.message)
		process.exit(1)
	}
}

module.exports = connectDB
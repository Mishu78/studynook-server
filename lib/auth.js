const { betterAuth } = require("better-auth");
const { mongodbAdapter } = require("better-auth/adapters/mongodb");
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db('studynook');

const auth = betterAuth({
  database: mongodbAdapter(db, {
    client
  }),
  // 💡 Explicitly set secret keys so tokens can sign correctly on port 8080
  secret: process.env.BETTER_AUTH_SECRET || "cQbLOo7y7bEhMKpf1acCp5mBXgDSLvFW",
  baseURL: "http://localhost:8080", 
  
  // 💡 MANDATORY: Enable Email & Password signups on the server instance
  emailAndPassword: {
    enabled: true
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
});

module.exports = { auth };
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
  secret: process.env.BETTER_AUTH_SECRET,
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
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Force the redirect back to your React app
      return "http://localhost:3000"; 
    },
  },
});

module.exports = { auth };




// const auth = betterAuth({
//   database: mongodbAdapter(db, {
//     client
//   }),
//   // 💡 Define your backend's base URL here
//   baseURL: "http://localhost:8080", 
  
//   // 💡 This is the secret sauce for your redirect issue
//   callbacks: {
//     async redirect({ url, baseUrl }) {
//       // Always redirect to your frontend after successful auth
//       return "http://localhost:3000";
//     },
//   },
  
//   trustedOrigins: [
//     "http://localhost:3000",
//     "http://127.0.0.1:3000"
//   ],
//   socialProviders: {
//     google: {
//       clientId: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       // 💡 Ensure the callback URL in your Google Cloud Console 
//       // matches this: http://localhost:8080/api/auth/callback/google
//     },
//   },
// });
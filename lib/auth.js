import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);

await client.connect(); // important for ESM + serverless safety

const db = client.db("studynook");

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client,
  }),

  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: "http://localhost:8080",

  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ],

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  callbacks: {
    async redirect() {
      return "http://localhost:3000";
    },
  },
});




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
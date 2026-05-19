// 💡 REQUIRED: Load environment configurations before anything else executes
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { ObjectId } = require("mongodb"); 
const app = express();

app.use(cors());
app.use(express.json());

// Fallback gracefully if process.env.PORT isn't accessible
const port = process.env.PORT || 5000;

// MongoDB URI
const uri = process.env.MONGODB_URI;

// Quick developer check to warn you early if configuration is broken
if (!uri) {
  console.error("FATAL ERROR: MONGODB_URI is not defined in your environment!");
  process.exit(1);
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let roomsCollection;

// Root testing endpoint
app.get("/", (req, res) => {
  res.send("SERVER WORKING PERFECTLY");
});

// Fetch all rooms
app.get('/rooms', async (req, res) => {
  try {
    const result = await roomsCollection.find().toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).send({ error: "Failed to fetch rooms" });
  }
});

// Fetch featured rooms (limited to 6)
app.get('/featured-rooms', async (req, res) => {
  try {
    const cursor = roomsCollection.find().limit(6);
    const result = await cursor.toArray();
    res.send(result);
  } catch (error) {
    console.error("Error fetching featured rooms:", error);
    res.status(500).send({ error: "Failed to fetch featured rooms" });
  }
});
    
// Fetch single room details by ID (Handles both custom string IDs and ObjectIds)
app.get('/rooms/:roomId', async (req, res) => {
  try {
    console.log("PARAM RECEIVED:", req.params.roomId);
    const { roomId } = req.params;

    let query = {};
    
    // Validate if the incoming roomId matches standard 24-char hex format
    if (typeof roomId === 'string' && roomId.length === 24 && /^[0-9a-fA-F]+$/.test(roomId)) {
      query = { _id: new ObjectId(roomId) };
    } else {
      // Fallback to matching standard raw string strings like "r004" or "r008"
      query = { _id: roomId };
    }

    const result = await roomsCollection.findOne(query);
    console.log("DATABASE RESULT:", result);
    
    if (!result) {
      return res.status(404).send({ error: "Room not found in database" });
    }

    res.send(result);
  } catch (error) {
    console.error("Error matching room ID:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// CONNECT MONGODB SAFELY
async function connectDB() {
  try {
    await client.connect();

    const db = client.db("studynook");
    roomsCollection = db.collection("rooms");

    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.log("MongoDB Connection Failed:", error.message);
  }
}

connectDB();

// START SERVER
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { ObjectId } = require("mongodb");
const app = express();

app.use(cors());
app.use(express.json());

const port = 5000;

// MongoDB URI
const uri =
  "mongodb://studynook:7bC9HC3xsDti5FRY@ac-gvburne-shard-00-00.r2vkn1a.mongodb.net:27017,ac-gvburne-shard-00-01.r2vkn1a.mongodb.net:27017,ac-gvburne-shard-00-02.r2vkn1a.mongodb.net:27017/?ssl=true&replicaSet=atlas-umwtiy-shard-0&authSource=admin&appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let roomsCollection;


app.get("/", (req, res) => {
  res.send("SERVER WORKING PERFECTLY");
});

app.get('/rooms', async (req, res) => {
  const result = await roomsCollection.find().toArray();
  res.send(result);
});

app.get('/rooms/:roomId', async (req, res) => {
  console.log("PARAM:", req.params.roomId);

  const { roomId } = req.params;

  const result = await roomsCollection.findOne({ _id: roomId });

  console.log("RESULT:", result);

  res.send(result);
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
// 💡 REQUIRED: Load environment configurations before anything else executes
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb"); 
// 💡 Import your configured Better-Auth instance
const { auth } = require("./lib/auth");
const { toNodeHandler } = require("better-auth/node");

const app = express();

// 💡 Fixed CORS configuration to cleanly clear browser preflight requests
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json());

// 💡 Ensure we read your exact .env choice first (8080), falling back only if empty
const port = process.env.PORT || 8080; 
const uri = process.env.MONGODB_URI;

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

let db;
let roomsCollection;
let bookingsCollection;
let usersCollection;

// =============================================================
// 🔒 BETTER-AUTH INTERCEPTOR MIDDLEWARE (Server Ownership Verification)
// =============================================================
async function verifyUser(req, res, next) {
  try {
    // 💡 Better-Auth reads active browser contexts from the incoming request headers
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized access. Please login first." });
    }

    // Attach user record to request object for downstream endpoint matching
    req.user = session.user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    res.status(500).json({ error: "Authentication system error" });
  }
}

// Root testing endpoint
app.get("/", (req, res) => {
  res.send("SERVER WORKING PERFECTLY");
});

// =============================================================
// 📝 STUDY ROOMS CRUD ENDPOINTS
// =============================================================

// 4.2 All Rooms Page - Public route fetches all rooms from the DB
app.get('/rooms', async (req, res) => {
  try {
    const result = await roomsCollection.find().toArray();
    res.json(result);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: "Failed to fetch rooms" });
  }
});

// Fetch featured rooms (limited to 6)
app.get('/featured-rooms', async (req, res) => {
  try {
    const result = await roomsCollection.find().limit(6).toArray();
    res.json(result);
  } catch (error) {
    console.error("Error fetching featured rooms:", error);
    res.status(500).json({ error: "Failed to fetch featured rooms" });
  }
});
    
// 4.3 Fetch single room details by ID (With string sanitation protection)
app.get('/rooms/:roomId', async (req, res) => {
  try {
    let { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ error: "Missing required roomId parameter context" });
    }

    roomId = roomId.trim();
    if (roomId === "[object Object]" || roomId === "undefined" || roomId === "null") {
      return res.status(400).json({ error: "Invalid Object ID parameter string format received." });
    }

    let query = {};
    if (roomId.length === 24 && /^[0-9a-fA-F]+$/.test(roomId)) {
      query = { _id: new ObjectId(roomId) };
    } else {
      query = { _id: roomId };
    }

    const result = await roomsCollection.findOne(query);
    if (!result) {
      return res.status(404).json({ error: "Room not found in database" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error matching room ID:", error);
    res.status(500).json({ error: "Internal server error querying room details." });
  }
});

// 4.1 Add Room Endpoint - Protected Private Route
app.post('/api/rooms', verifyUser, async (req, res) => {
  try {
    const { roomName, description, image, floor, capacity, hourlyRate, amenities } = req.body;

    if (!roomName || !description || !image || !floor || !capacity || !hourlyRate) {
      return res.status(400).json({ error: "Missing required form fields." });
    }

    const newRoom = {
      roomName,
      description,
      image,
      floor,
      capacity: Number(capacity),
      hourlyRate: Number(hourlyRate),
      amenities: Array.isArray(amenities) ? amenities : [],
      ownerId: req.user.id,          // 💡 Bind room to owner's exact user ID string
      ownerEmail: req.user.email,    // Extra helper field for easy frontend profile evaluation
      bookingCount: 0,               // 💡 Starts tracking at 0 allocations
      createdAt: new Date()
    };

    const result = await roomsCollection.insertOne(newRoom);
    res.status(201).json({ success: true, message: "Room added successfully", roomId: result.insertedId });
  } catch (error) {
    console.error("Error inserting room:", error);
    res.status(500).json({ error: "Failed to allocate new study room record." });
  }
});

// 4.4 Update Room Endpoint - Private Route (Owner Verification Required)
app.put('/api/rooms/:id', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { roomName, description, image, floor, capacity, hourlyRate, amenities } = req.body;

    let query = {};
    if (id.length === 24 && /^[0-9a-fA-F]+$/.test(id)) {
      query = { _id: new ObjectId(id) };
    } else {
      query = { _id: id };
    }

    const existingRoom = await roomsCollection.findOne(query);
    if (!existingRoom) {
      return res.status(404).json({ error: "Target study room record not found." });
    }

    if (existingRoom.ownerId !== req.user.id) {
      return res.status(432).json({ error: "Forbidden: You are not authorized to edit this room." });
    }

    const updateFields = {
      $set: {
        roomName,
        description,
        image,
        floor,
        capacity: Number(capacity),
        hourlyRate: Number(hourlyRate),
        amenities: Array.isArray(amenities) ? amenities : [],
        updatedAt: new Date()
      }
    };

    await roomsCollection.updateOne(query, updateFields);
    res.json({ success: true, message: "Room updated successfully" });
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ error: "Internal server update transaction failure." });
  }
});

// 4.5 Delete Room Endpoint - Private Route (Owner Verification Required)
app.delete('/api/rooms/:id', verifyUser, async (req, res) => {
  try {
    const { id } = req.params;

    let query = {};
    if (id.length === 24 && /^[0-9a-fA-F]+$/.test(id)) {
      query = { _id: new ObjectId(id) };
    } else {
      query = { _id: id };
    }

    const existingRoom = await roomsCollection.findOne(query);
    if (!existingRoom) {
      return res.status(404).json({ error: "Target room not found." });
    }

    if (existingRoom.ownerId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden: You are not authorized to delete this room." });
    }

    // Cascade Delete Safeguard: Clear out any active bookings associated with this room
    try {
      await bookingsCollection.deleteMany({ roomId: id });
    } catch (bookingDelErr) {
      console.log("Optional cascade booking cleanup bypassed.");
    }

    // Permanently remove target document from rooms collection
    await roomsCollection.deleteOne(query);
    res.json({ success: true, message: "Room deleted successfully" });
  } catch (error) {
    console.error("Error executing delete pipeline:", error);
    res.status(500).json({ error: "Internal server deletion pipeline error." });
  }
});

// =============================================================
// 🗓️ BOOKINGS MANAGEMENT ENDPOINTS
// =============================================================

// 5.1 Book a Room (Private) - Secure Slot Booking with Conflict Validation
app.post("/api/bookings", verifyUser, async (req, res) => {
  try {
    const { roomId, roomName, image, date, startTime, endTime, specialNote, totalCost, userEmail } = req.body;

    if (!roomId || !date || !startTime || !endTime || !userEmail) {
      return res.status(400).json({ error: "Missing required reservation parameters." });
    }

    const proposedTimeSlot = `${startTime} - ${endTime}`;

    // CRITICAL CONFLICT CHECK
    const existingConflict = await bookingsCollection.findOne({
      roomId: roomId,
      date: date,
      timeSlot: proposedTimeSlot,
      status: "confirmed"
    });

    if (existingConflict) {
      return res.status(409).json({ 
        error: "Conflict detected: This room is already reserved for the selected time slot." 
      });
    }

    const newBooking = {
      roomId,
      roomName,
      image,
      date, 
      timeSlot: proposedTimeSlot,
      startTime,
      endTime,
      cost: Number(totalCost),
      status: "confirmed", 
      userEmail,
      userId: req.user.id, 
      specialNote: specialNote || "",
      createdAt: new Date()
    };

    const result = await bookingsCollection.insertOne(newBooking);
    
    // Safety format check for MongoDB document IDs
    let roomQuery = roomId.length === 24 && /^[0-9a-fA-F]+$/.test(roomId) ? { _id: new ObjectId(roomId) } : { _id: roomId };
    await roomsCollection.updateOne(roomQuery, { $inc: { bookingCount: 1 } });

    // ✅ FIXED: Better-Auth stores unique account tracking credentials using the string property field "id"
    await usersCollection.updateOne(
      { id: req.user.id },
      { $addToSet: { bookings: result.insertedId.toString() } }
    );

    res.status(201).json({ message: "Room booked successfully!", bookingId: result.insertedId });
  } catch (error) {
    console.error("Booking conflict error:", error);
    res.status(500).json({ error: "Internal server error saving reservation." });
  }
});

// 5.2 My Bookings Fetcher Route
app.get("/api/bookings", verifyUser, async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email || email !== req.user.email) {
      return res.status(403).json({ error: "Unauthorized profile context mismatch query." });
    }

    const userBookings = await bookingsCollection
      .find({ userEmail: email })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json(userBookings);
  } catch (error) {
    console.error("Fetch bookings database error:", error);
    res.status(500).json({ error: "Failed to retrieve user bookings." });
  }
});

// 5.3 Cancel Booking (Private PATCH Route)
app.patch("/api/bookings/:id/cancel", verifyUser, async (req, res) => {
  try {
    const { id } = req.params;
    let query = id.length === 24 && /^[0-9a-fA-F]+$/.test(id) ? { _id: new ObjectId(id) } : { _id: id };

    const bookingRecord = await bookingsCollection.findOne(query);
    if (!bookingRecord) {
      return res.status(404).json({ error: "Reservation listing entry not found." });
    }

    if (bookingRecord.userEmail !== req.user.email) {
      return res.status(403).json({ error: "Forbidden access authorization context violation." });
    }

    await bookingsCollection.updateOne(query, { $set: { status: "cancelled" } });

    let roomQuery = bookingRecord.roomId.length === 24 && /^[0-9a-fA-F]+$/.test(bookingRecord.roomId) 
      ? { _id: new ObjectId(bookingRecord.roomId) } 
      : { _id: bookingRecord.roomId };
    
    await roomsCollection.updateOne(roomQuery, { $inc: { bookingCount: -1 } });

    // ✅ FIXED: Keeps profile reference array sync completely accurate
    await usersCollection.updateOne(
      { id: req.user.id }, 
      { $pull: { bookings: id } }
    );

    res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Cancellation PATCH error:", error);
    res.status(500).json({ error: "Cancellation pipeline fault execution failure." });
  }
});

// =============================================================
// 💡 FIXED BETTER-AUTH API HANDLER ROUTE
// =============================================================
app.all("/api/auth/*any", toNodeHandler(auth));

// 💡 CONNECT MONGODB & START LISTENING
async function startServer() {
  try {
    await client.connect();
    db = client.db("studynook");
    roomsCollection = db.collection("rooms");
    bookingsCollection = db.collection("bookings");
    usersCollection = db.collection("user");
    console.log("🟢 MongoDB Connected Successfully");

    app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 API Server rock-solid on port: ${port}`);
    });

  } catch (error) {
    console.error("🔴 Critical Server Boot Failure:", error.message);
    process.exit(1);
  }
}

startServer();
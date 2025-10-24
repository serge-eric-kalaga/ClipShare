// ============ Import Modules
const express = require("express");
var cors = require('cors')
// ============ Fin Import Modules

// ============ Import Middlewares
const { connect_db } = require("./configs/Database");
const LoginRequired = require("./middlewares/Auth");
const loggerMiddleware = require("./middlewares/Logger");
const globalErrorHandler = require("./middlewares/ErrorHandler");
const Response = require("./middlewares/Response");
const { InitUser } = require("./configs/InitData");
// ============ Fin Import Middlewares

// ============ Import Routes
const userRouter = require("./routes/User.route");
const clipboardRouter = require("./routes/Clipboard.route");
// ============ Fin Import Routes


const PORT = process.env.PORT;

const app = express();

const corsOptions = {
  origin: '*', // allow all origins for development; restrict in production. Use a specific domain or an array of domains.
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // specify allowed methods
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin'], // specify allowed headers
  optionsSuccessStatus: 200
};

// ============ Bloc Middlewares et Configurations
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(loggerMiddleware);
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));
app.use(Response);
// ============ Fin bloc Middlewares et Configurations


// ============== Bloc routes
app.get("/", (req, res, next) => {
  res.json({
    succes: true,
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.use("/users", userRouter);
app.use("/clipboards", clipboardRouter);


// Route for testing error handling
app.post("/error-test", (req, res, next) => {
  const error = new Error("Test Error");
  error.statusCode = 500;
  // next(error);
  throw error;
});
app.get("/error-test", (req, res, next) => {
  const error = new Error("Test Error");
  error.statusCode = 500;
  // next(error);
  throw error;
});


app.all("/", (req, res, next) => {
  res.status(404).Response({ message: "Url non trouvée" });
});

// ============== Fin bloc routes


app.use(globalErrorHandler);

// Create HTTP server and attach socket.io
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

// Attach socket.io with permissive CORS for development (restrict in prod)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Expose io instance via app so controllers can emit events
app.set('io', io);

// Import Clipboard model for visit increments inside socket handlers
const { Clipboard } = require("./models/Models");

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Log ALL events received for debugging
  socket.onAny((eventName, ...args) => {
    console.log(`[Socket Event] ${socket.id} => ${eventName}`, args);
  });

  // Join user room for dashboard updates
  socket.on('joinUser', ({ userId } = {}) => {
    try {
      if (!userId) return;
      const userRoom = `user:${userId}`;
      socket.join(userRoom);
      console.log(`User ${userId} joined their room: ${userRoom}`);
    } catch (err) {
      console.error('joinUser error', err);
    }
  });

  // Leave user room
  socket.on('leaveUser', ({ userId } = {}) => {
    try {
      if (!userId) return;
      const userRoom = `user:${userId}`;
      socket.leave(userRoom);
      console.log(`User ${userId} left their room: ${userRoom}`);
    } catch (err) {
      console.error('leaveUser error', err);
    }
  });

  socket.on('joinClipboard', async ({ clipboardId } = {}) => {
    try {
      if (!clipboardId) return;
      // join room
      socket.join(clipboardId);

      // increment visits (historical views)
      let updated = null;
      try {
        updated = await Clipboard.findByIdAndUpdate(clipboardId, { $inc: { visits: 1 } }, { new: true });
      } catch (err) {
        // ignore DB errors here but log
        console.error('Error incrementing visits for', clipboardId, err);
      }

      const room = io.sockets.adapter.rooms.get(clipboardId);
      const active = room ? room.size : 0;
      const totalViews = updated?.visits || 0;

      io.to(clipboardId).emit('clipboard:viewers', { clipboardId, active, totalViews });
    } catch (err) {
      console.error('joinClipboard error', err);
    }
  });

  socket.on('leaveClipboard', async ({ clipboardId } = {}) => {
    try {
      if (!clipboardId) return;
      socket.leave(clipboardId);
      const room = io.sockets.adapter.rooms.get(clipboardId);
      const active = room ? room.size : 0;
      // read visits from DB
      let clip = null;
      try {
        clip = await Clipboard.findById(clipboardId);
      } catch (err) {
        console.error('Error fetching clipboard for leaveClipboard', err);
      }
      const totalViews = clip?.visits || 0;
      io.to(clipboardId).emit('clipboard:viewers', { clipboardId, active, totalViews });
    } catch (err) {
      console.error('leaveClipboard error', err);
    }
  });

  socket.on('disconnect', () => {
    // When a socket disconnects, emit updated counts for rooms it was in
    try {
      const rooms = Array.from(socket.rooms || []);
      rooms.forEach((roomId) => {
        // socket.rooms contains its own id as well - skip
        if (roomId === socket.id) return;
        const room = io.sockets.adapter.rooms.get(roomId);
        const active = room ? room.size : 0;
        // We don't fetch visits here to avoid DB load on every disconnect
        io.to(roomId).emit('clipboard:viewers', { clipboardId: roomId, active, totalViews: null });
      });
    } catch (err) {
      console.error('disconnect handler error', err);
    }
  });
});

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`App running on http://localhost:${PORT}`);

  setTimeout(async () => {
    await connect_db();
  }, 3000);

  setTimeout(async () => {
    await InitUser();
  }, 5000);
});

module.exports = app;
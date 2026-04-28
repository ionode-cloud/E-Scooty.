require("dotenv/config");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path"); // Added path module
const authRoutes = require("./routes/authRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const dataRoutes = require("./routes/dataRoutes");
const otaRoutes = require("./routes/otaRoutes");
const userRoutes = require("./routes/userRoutes");
const vehicleRoutes = require("./routes/vehicleRoutes");
const logRoutes = require("./routes/logRoutes");
const escootyRoutes = require("./routes/escootyRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options(/(.*)/, cors());
app.use(express.json());

// Serve OTA firmware uploads statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Make io accessible to routers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/dashboards", dashboardRoutes);
app.use("/api/escooty", escootyRoutes);
app.use("/api", dataRoutes); 
app.use("/api/ota", otaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicle", vehicleRoutes);
app.use("/api/device", deviceRoutes); // Adding /api/device for device status updates
app.use("/api/logs", logRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "UP",
    time: new Date(),
    dbStatus:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("New client connected", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error.message);
  });

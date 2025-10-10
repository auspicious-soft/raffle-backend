import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db";
import { checkAuth } from "./middleware/check-auth";
import { admin, auth, user } from "./routes";
import "../cron/giftCardExpiryJob";
import { stripeWebhook } from "./controllers/user/transaction-controller";
import { router } from "./routes/admin-routes";
import bodyParser from "body-parser";
import http from "http";
import { Server } from "socket.io";



// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8000;
const app = express();

app.post(
  "/api/webhook",
  bodyParser.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());
app.set("trust proxy", true);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
  })
);

var dir = path.join(__dirname, "static");
app.use(express.static(dir));

var uploadsDir = path.join(__dirname, "uploads");
app.use("/uploads", express.static(uploadsDir));

const server = http.createServer(app); // Create HTTP server
export const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

connectDB();

app.set("io", io);

app.get("/", (_, res: any) => {
  res.send("Hello world entry point 🚀✅");
});



//*****************Admin Routes******************/
app.use("/api/admin",checkAuth(["ADMIN"]), admin);

//*****************User Routes******************/
app.use("/api/user", checkAuth(["USER"]) , user)


app.use("/api" , auth);

io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));
// server.listen(8000, () => console.log("Server running on port 8000"));

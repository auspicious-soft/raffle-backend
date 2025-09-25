import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db";
import { checkAuth } from "./middleware/check-auth";
import { admin, auth, user } from "./routes";
import "../cron/giftCardExpiryJob";


// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 8000;
const app = express();


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

connectDB();

app.get("/", (_, res: any) => {
  res.send("Hello world entry point 🚀✅");
});



//*****************Admin Routes******************/
app.use("/api/admin",checkAuth(["ADMIN"]), admin);

//*****************User Routes******************/
app.use("/api/user", checkAuth(["USER"]) , user)


app.use("/api" , auth);


app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));

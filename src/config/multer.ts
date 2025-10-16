// mulkter.ts
import multer from "multer";

const storage = multer.memoryStorage();

// For CSV
export const uploadCSV = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) cb(null, true);
    else cb(new Error("Only CSV files are allowed"));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

// For Reward Images
export const uploadImages = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
  limits: { fileSize: 25 * 1024 * 1024 },
});

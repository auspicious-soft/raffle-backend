import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
    cb(null, true);
  } else {
    cb(new Error("Only CSV files are allowed"));
  }
};

const maxSize = 10 * 1024 * 1024;

export const uploadCSV = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxSize },
});

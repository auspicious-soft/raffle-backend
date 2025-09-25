import { Router } from "express";
import { uploadCSV } from "src/config/multer";
import { addCategory, addGiftCard, deleteCategory, getAllCategories, getGiftCards, importGiftCardsCSV } from "src/controllers/admin/gift-card-controller";
import { getAdminData, updateAdminData } from "src/controllers/admin/settings-controller";

// Code
const router = Router();
router.route("/admin-data").get(getAdminData).patch(updateAdminData)
router.route("/categories").post(addCategory).get(getAllCategories)
router.route("/category/:id").delete(deleteCategory)

router.route("/gift-card").post(addGiftCard).get(getGiftCards)
router.post("/gift-card/import", uploadCSV.single("file"), importGiftCardsCSV);

export { router };

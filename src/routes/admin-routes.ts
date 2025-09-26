import { Router } from "express";
import { uploadCSV } from "src/config/multer";
import { addCategory, addGiftCard, deleteCategory, getAllCategories, getGiftCards, importGiftCardsCSV } from "src/controllers/admin/gift-card-controller";
import { addPromoCode, deletePromoCode, getAllPromoCodes } from "src/controllers/admin/promo-code-controller";
import { createRaffle, getAllRaffles } from "src/controllers/admin/raffle-controller";
import { getAdminData, updateAdminData } from "src/controllers/admin/settings-controller";

// Code
const router = Router();

router.route("/admin-data").get(getAdminData).patch(updateAdminData)

// Category and Gift Card API's
router.route("/categories").post(addCategory).get(getAllCategories)
router.route("/category/:id").delete(deleteCategory)
router.route("/gift-card").post(addGiftCard).get(getGiftCards)
router.post("/gift-card/import", uploadCSV.single("file"), importGiftCardsCSV);

// Promo Code API's
router.route("/promo-code").post(addPromoCode)
router.route("/promo-code/:id").delete(deletePromoCode)
router.route("/promoCodes").get(getAllPromoCodes)

// Raffle Code API's

router.route("/raffle").post(createRaffle).get(getAllRaffles)
router.route("/raffle/:id").get(getAllRaffles)
export { router };

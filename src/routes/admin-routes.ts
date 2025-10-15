import { Router } from "express";
import { uploadCSV } from "src/config/multer";
import { blockUnblockUser, getAllUsers, getSingleUser } from "src/controllers/admin/admin-user-controller";
import {
  addCategory,
  addGiftCard,
  deleteCategory,
  getAllCategories,
  getGiftCards,
  importGiftCardsCSV,
} from "src/controllers/admin/gift-card-controller";
import {
  addPromoCode,
  deletePromoCode,
  getAllPromoCodes,
} from "src/controllers/admin/promo-code-controller";
import {
  createRaffle,
  deleteRaffle,
  getAllRaffles,
  getRaffleById,
  updateRaffle,
  uploadRewardImages,
} from "src/controllers/admin/raffle-controller";
import { createRedemptionLadder, deleteLadder, getAllLadders, getSingleLadder, updateLadder } from "src/controllers/admin/redemption-ladder-controller";
import {
  getAdminData,
  updateAdminData,
} from "src/controllers/admin/settings-controller";

// Code
const router = Router();

router.route("/admin-data").get(getAdminData).patch(updateAdminData);

// Category and Gift Card API's
router.route("/categories").post(addCategory).get(getAllCategories);
router.route("/category/:id").delete(deleteCategory);
router.route("/gift-card").post(addGiftCard).get(getGiftCards);
router.post("/gift-card/import", uploadCSV.single("file"), importGiftCardsCSV);

// Promo Code API's
router.route("/promo-code").post(addPromoCode);
router.route("/promo-code/:id").delete(deletePromoCode);
router.route("/promoCodes").get(getAllPromoCodes);

// Raffle API's
router
  .route("/raffle")
  .post(createRaffle)
  .get(getAllRaffles)
  .patch(updateRaffle);
router.route("/raffle/:id").get(getRaffleById).delete(deleteRaffle);
router.post("/upload-images", uploadRewardImages);


// User API's

router.get("/getUsers",getAllUsers)
router.route("/user/:id").get(getSingleUser)
router.post("/block-unblock",blockUnblockUser)

// Redemption Ladder API's
router.route("/redemption-ladder").post(createRedemptionLadder).get(getAllLadders)
router.route("/ladder/:id").get(getSingleLadder).delete(deleteLadder).patch(updateLadder)
export { router };

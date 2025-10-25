import { Router } from "express";
import { addToCart, getCartItems, removeFromCart } from "src/controllers/user/cart-controller";
import { getUser, initiatePhoneVerification, shippingDetails, updateUser, verifyPhoneNumber } from "src/controllers/user/profile-controller";
import { getRedemptionCategories, getReedemLadder, reedemReward } from "src/controllers/user/redemption-controller";
import { applyPromoCode, createTransaction, getAllTransaction } from "src/controllers/user/transaction-controller";
import { activeRaffles, buyRaffle, getSingleRaffle, RafflePurchaseHistory, ReedemRaffleReward, withdrawRaffle } from "src/controllers/user/user-raffle-controller";

// Code
const router = Router();


router.post("/shipping-details",shippingDetails)
router.post("/verify-phone",verifyPhoneNumber)
router.post("/verify-phone-initiate",initiatePhoneVerification)
router.get("/user-data",getUser)
router.patch("/user-dataa",updateUser)

router.get("/active-raffles",activeRaffles)
router.get("/raffle/:id",getSingleRaffle)

router.route("/cart").post(addToCart).get(getCartItems).put(removeFromCart)
router.post("/apply-promo",applyPromoCode)
router.post("/buy-raffleBucks", createTransaction);
router.post("/buy-raffle", buyRaffle);
router.post("/withdraw-entry", withdrawRaffle);
router.get("/transactions", getAllTransaction);
router.get("/purchased-raffles", RafflePurchaseHistory);
router.get("/ladder",getReedemLadder);
router.get("/ladder-rewards",getRedemptionCategories)
router.post("/redeem-reward",reedemReward)
router.post("/reedem-raffleReward",ReedemRaffleReward)



export { router };

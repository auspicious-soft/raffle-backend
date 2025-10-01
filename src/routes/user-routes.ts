import { Router } from "express";
import { getUser, initiatePhoneVerification, shippingDetails, updateUser, verifyPhoneNumber } from "src/controllers/user/profile-controller";
import { activeRaffles, getSingleRaffle } from "src/controllers/user/user-raffle-controller";

// Code
const router = Router();


router.post("/shipping-details",shippingDetails)
router.post("/verify-phone",verifyPhoneNumber)
router.post("/verify-phone-initiate",initiatePhoneVerification)
router.get("/user-data",getUser)
router.patch("/user-dataa",updateUser)

router.get("/active-raffles",activeRaffles)
router.get("/raffle/:id",getSingleRaffle)
export { router };

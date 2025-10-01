import { Router } from "express";
import { getUser, initiatePhoneVerification, shippingDetails, updateUser, verifyPhoneNumber } from "src/controllers/user/profile-controller";

// Code
const router = Router();


router.post("/shipping-details",shippingDetails)
router.post("/verify-phone",verifyPhoneNumber)
router.post("/verify-phone-initiate",initiatePhoneVerification)
router.get("/user-data",getUser)
router.patch("/user-dataa",updateUser)
export { router };

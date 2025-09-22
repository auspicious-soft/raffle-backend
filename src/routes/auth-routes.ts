

import { Router } from "express";
import {  Login,  registerUser, resendOtp, ForgetPassword, ResetPassword, VerifyResetPasswordOtp, verifyOtp } from "src/controllers/auth/auth-controller";

// Code
const router = Router();

// User-routes
router.post("/login",Login)

router.post("/register",registerUser)
router.post("/verify-otp",verifyOtp)
router.post("/resend-otp",resendOtp)
router.post("/forget-password",ForgetPassword)
router.post("/reset-verify-otp",VerifyResetPasswordOtp)
router.post("/reset-password",ResetPassword)


export { router };

import { Request, response, Response } from "express";
import { UserModel } from "src/models/user/user-schema";
import { ShippingAddressModel } from "src/models/user/user-shipping-schema";
import {
  profileSerivce,
  shippingServices,
} from "src/services/user/user-services";
import { generateAndSendOtp } from "src/utils/helper";
import {
  BADREQUEST,
  OK,
  CREATED,
  INTERNAL_SERVER_ERROR,
} from "src/utils/response";

export const shippingDetails = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const {
      country,
      state,
      address,
      city,
      postalCode,
      countryCode,
      phoneNumber,
    } = req.body;

    if (!country || !state || !address || !city || !postalCode) {
      throw new Error("requiedShippindDetails");
    }

    const response = await shippingServices.addShippingDetails({
      userId: userData._id,
      country,
      state,
      address,
      city,
      postalCode,
      countryCode,
      phoneNumber,
    });
    const messageKey = response.messageKeys.join("|");
    return CREATED(res, response.shippingAddress, messageKey);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const initiatePhoneVerification = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.user._id;
    const { phone , countryCode } = req.body;

    if (!phone || !countryCode) {
      throw new Error("Phone Number is required");
    }

    const existing = await ShippingAddressModel.findOne({
      phone,
      userId: { $ne: userId },
    });
    if (existing) {
      throw new Error("phoneNumberExists");
    }

     await ShippingAddressModel.findOneAndUpdate(
      { userId },
      {
        pendingPhoneNumber: phone,
        pendingCountryCode: countryCode,
      },
      { upsert: true, new: true }
    );

       await UserModel.findOneAndUpdate(
      { _id:userId },
      {
        pendingIsPhoneVerified: false,
      },
      { new: true }
    );

    const otp = await generateAndSendOtp(
      phone,
      "VERIFY_PHONE",
      "PHONE",
      "USER"
    );
    console.log(`Phone OTP for ${phone}: ${otp}`);

    return OK(res, {
      message: "OTP sent to verify phone number. Please verify.",
    });
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const verifyPhoneNumber = async (req: Request, res: Response) => {
  try {
    const userId = req.user._id;
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      throw new Error("phoneAndOtpRequired");
    }

    const result = await profileSerivce.verifyPhoneNumber({
      userId,
      phone,
      otp,
    });
    return OK(res, result);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const response = await profileSerivce.getUser({
      userData,
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;

    const {
      address,
      country,
      state,
      postalCode,
      phoneNumber,
      countryCode,
      userName,
    } = req.body;

    const response = await profileSerivce.updateUser({
      _id: userData._id,
      userName,
      phoneNumber,
      countryCode,
      address,
      country,
      state,
      postalCode,
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

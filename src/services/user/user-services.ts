import { updateUser } from "src/controllers/user/profile-controller";
import { OtpModel } from "src/models/system/otp-schema";
import { UserModel } from "src/models/user/user-schema";
import { ShippingAddressModel } from "src/models/user/user-shipping-schema";
import { generateAndSendOtp } from "src/utils/helper";

export const profileSerivce = {
  getUser: async (payload: any) => {
    const { userName, email, image, isVerifiedPhone, totalPoints, isBlocked } =
      payload.userData;

    const additionalInfo = await ShippingAddressModel.findOne({
      userId: payload.userData._id,
    }).lean();

    const {
      country,
      state,
      address,
      city,
      postalCode,
      countryCode,
      phoneNumber,
    } = additionalInfo || {};

    return {
      _id: payload.userData.id,
      userName,
      email,
      totalPoints,
      image,
      state,
      country,
      address,
      city,
      postalCode,
      countryCode,
      phoneNumber,
      isVerifiedPhone,
      isBlocked,
    };
  },

  verifyPhoneNumber: async (payload: any) => {
    const otpDoc = await OtpModel.findOne({
      phone: payload.phone,
      code: payload.otp,
      type: "PHONE",
      purpose: "VERIFY_PHONE",
      userType: "USER",
    });

    if (!otpDoc) {
      throw new Error("invalidOtp");
    }

    await UserModel.updateOne(
      { _id: payload.userId },
      { $set: { isVerifiedPhone: true } }
    );

    await OtpModel.deleteOne({ _id: otpDoc._id });

    return { success: true };
  },

  updateUser: async (payload: any) => {
    const userInformation = await ShippingAddressModel.findOneAndUpdate(
      { userId: payload._id },
      {
        $set: {
          address: payload.address,
          country: payload.country,
          countryCode: payload?.countryCode,
          state: payload.state,
          postalCode: payload.postalCode,
          phoneNumber: payload.phoneNumber,
        },
      },
      { new: true }
    ).lean();

    const user = await UserModel.findByIdAndUpdate(
      payload.id,
      {
        $set: {
          userName: payload?.userName,
        },
      },
      { new: true }
    ).lean();

    return {
      _id: payload.id,
      userName: user?.userName || "",
      phoneNumber: userInformation?.phoneNumber || "",
      countryCode: userInformation?.countryCode || "",
      address: userInformation?.address || "",
      country: userInformation?.country || "",
      state: userInformation?.state || "",
      postalCode: userInformation?.postalCode || "",
    };
  },
};

export const shippingServices = {
  addShippingDetails: async (payload: any) => {
    const {
      userId,
      country,
      state,
      address,
      city,
      postalCode,
      countryCode,
      phoneNumber,
    } = payload;

    if (phoneNumber) {
      const existing = await ShippingAddressModel.findOne({
        phoneNumber,
        userId: { $ne: userId },
      });
      if (existing) {
        throw new Error("Phone Number already exist");
      }
    }

    const shippingAddress = await ShippingAddressModel.create({
      userId,
      country,
      state,
      address,
      city,
      postalCode,
      countryCode,
      phoneNumber,
    });
    let messageKeys = ["created"];

    if (phoneNumber) {
      const otp = await generateAndSendOtp(
        phoneNumber,
        "VERIFY_PHONE",
        "PHONE",
        "USER"
      );
      console.log(`Phone OTP for ${phoneNumber}: ${otp}`);
      messageKeys.push("otpSent");
    }
    return { shippingAddress, messageKeys };
  },
};

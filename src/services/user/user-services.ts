import { updateUser } from "src/controllers/user/profile-controller";
import { RaffleModel } from "src/models/admin/raffle-schema";
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
      phone: payload.method,
      code: payload.code,
      type: "PHONE",
      purpose: "VERIFY_PHONE",
      userType: "USER",
    });

    if (!otpDoc) {
      throw new Error("invalidOtp");
    }

    const shippingAddress = await ShippingAddressModel.findOne({
      userId: payload.userId,
    });
    if (
      !shippingAddress ||
      shippingAddress.pendingPhoneNumber !== payload.method
    ) {
      throw new Error("pendingPhoneNotFound");
    }

    const user = await UserModel.findOne({ _id: payload.userId });
    if (!user) {
      throw new Error("User not Found");
    }

    shippingAddress.phoneNumber = shippingAddress.pendingPhoneNumber ?? "";
    shippingAddress.countryCode = shippingAddress.pendingCountryCode ?? "";

    user.pendingIsPhoneVerified = true;

    shippingAddress.pendingPhoneNumber = undefined;
    shippingAddress.pendingCountryCode = undefined;

    await shippingAddress.save();

    await UserModel.updateOne(
      { _id: payload.userId },
      {
        $set: {
          isVerifiedPhone: true,
          pendingIsPhoneVerified: true,
        },
      }
    );

    await ShippingAddressModel.updateOne(
      { userId: payload.userId },
      {
        $set: {
          phoneNumber: shippingAddress.phoneNumber,
          countryCode: shippingAddress.countryCode,
          pendingPhoneNumber: "",
          pendingCountryCode: "",
        },
      }
    );

    // Remove used OTP
    await OtpModel.deleteOne({ _id: otpDoc._id });
    return { success: true };
  },

  updateUser: async (payload: any) => {
    const currentShipping = await ShippingAddressModel.findOne({
      userId: payload._id,
    }).lean();

    let updateData: any = {
      address: payload.address,
      country: payload.country,
      state: payload.state,
      postalCode: payload.postalCode,
    };
    let otpSent = false;

    if (
      payload.phoneNumber &&
      payload.phoneNumber !== currentShipping?.phoneNumber
    ) {
      updateData.pendingPhoneNumber = payload.phoneNumber;
      updateData.pendingCountryCode = payload.countryCode;
      updateData.pendingPhoneExpiry = new Date(Date.now() + 5 * 60 * 1000);

      await generateAndSendOtp(
        payload.phoneNumber,
        "VERIFY_PHONE",
        "PHONE",
        "USER"
      );
      otpSent = true;
    }

    const userInformation = await ShippingAddressModel.findOneAndUpdate(
      { userId: payload._id },
      { $set: updateData },
      { new: true }
    ).lean();

    const user = await UserModel.findByIdAndUpdate(
      payload._id,
      {
        $set: {
          userName: payload?.userName,
        },
      },
      { new: true }
    ).lean();

    return {
      _id: payload._id,
      userName: user?.userName || "",
      phoneNumber: userInformation?.phoneNumber || "",
      countryCode: userInformation?.countryCode || "",
      address: userInformation?.address || "",
      country: userInformation?.country || "",
      state: userInformation?.state || "",
      postalCode: userInformation?.postalCode || "",
      pendingPhoneNumber: userInformation?.pendingPhoneNumber || "",
      pendingCountryCode: userInformation?.pendingCountryCode || "",
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

    let messageKeys = ["created"];
    const shippingAddress = await ShippingAddressModel.create({
      userId,
      country,
      state,
      address,
      city,
      postalCode,
    });

    if (phoneNumber) {
      const existing = await ShippingAddressModel.findOne({
        phoneNumber,
        userId: { $ne: userId },
      });
      if (existing) {
        throw new Error("Phone Number already exist");
      }

      shippingAddress.pendingPhoneNumber = phoneNumber;
      shippingAddress.pendingCountryCode = countryCode;
      await shippingAddress.save();

      await UserModel.findByIdAndUpdate(userId, {
        pendingIsPhoneVerified: false,
      });

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

export const raffleServices = {
  getActiveRaffle: async (payload: any) => {
    const { type, page, limit } = payload;
    const ALLOWED_TYPE = ["PHYSICAL", "DIGITAL"];

    if (type && !ALLOWED_TYPE.includes(type)) {
      throw new Error(
        `Invalid Type. Allowed values: ${ALLOWED_TYPE.join(", ")}`
      );
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const filter: any = {
      status: "ACTIVE",
      isDeleted: false,
    };

    if (type && ALLOWED_TYPE.includes(type)) {
      filter["rewards.rewardType"] = type;
    }
    const now = new Date();
    const pipeline: any[] = [
      { $match: filter },
      {
        $addFields: {
          isOngoing: {
            $and: [{ $lte: ["$startDate", now] }, { $gte: ["$endDate", now] }],
          },
        },
      },
      {
        $sort: {
          isOngoing: -1,
          startDate: 1,
          createdAt: -1,
        },
      },
      { $skip: skip },
      { $limit: limitNumber },
    ];

  const rawRaffles = await RaffleModel.aggregate(pipeline);
  const totalRaffles = await RaffleModel.countDocuments(filter)
    return {
      data: rawRaffles,
      pagination: {
        total: totalRaffles,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalRaffles / limitNumber),
      },
    };
  },
};

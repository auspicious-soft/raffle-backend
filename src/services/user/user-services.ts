import mongoose from "mongoose";
import stripe from "src/config/stripe";
import { updateUser } from "src/controllers/user/profile-controller";
import { PromoCodeModel } from "src/models/admin/promo-code-schema";
import { RaffleModel } from "src/models/admin/raffle-schema";
import { OtpModel } from "src/models/system/otp-schema";
import { CartModel } from "src/models/user/cart-schema";
import { CartQueueModel } from "src/models/user/cart_queue-schema";
import { TransactionModel } from "src/models/user/transaction-schema";
import { UserModel } from "src/models/user/user-schema";
import { ShippingAddressModel } from "src/models/user/user-shipping-schema";
import { generateAndSendOtp } from "src/utils/helper";
import { io as globalIo } from "../../../src/app";
import { OrderModel } from "src/models/user/order-schema";
import { UserRaffleModel } from "src/models/user/user-raffle-schema";

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
    const totalRaffles = await RaffleModel.countDocuments(filter);
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

export const cartServices = {
  addToCart: async (payload: any) => {
    const { raffleId, userId } = payload;
    if (!raffleId || !userId) {
      throw new Error("Raffle id and user requried");
    }
    const user = await UserModel.findOne({
      _id: userId,
      isDeleted: false,
    });
    if (!user) {
      throw new Error("User not found");
    }
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const existingCart = await CartModel.findOne({
        userId,
        items: raffleId,
      }).session(session);
      if (existingCart) {
        throw new Error("Raffle already in cart");
      }
      const raffle = await RaffleModel.findOneAndUpdate(
        {
          _id: raffleId,
          isDeleted: false,
          status: "ACTIVE",
          $expr: { $lt: ["$bookedSlots", "$totalSlots"] },
        },
        { $inc: { bookedSlots: 1 } },
        { new: true, session }
      );
      if (!raffle) {
        throw new Error("Raffle not found, inactive, or all slots booked");
      }
      const cart = await CartModel.findOneAndUpdate(
        { userId },
        {
          $addToSet: { items: raffle._id },
          $setOnInsert: { expiresAt: new Date(Date.now() + 10 * 60 * 1000) }, // set expiry only on new cart
        },
        { upsert: true, new: true, session }
      );

      const expiryTime = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
      await CartQueueModel.findOneAndUpdate(
        { userId },
        { $addToSet: { items: raffle._id }, $set: { expiresAt: expiryTime } },
        { upsert: true, new: true, session }
      );

      await session.commitTransaction();
      session.endSession();

      return cart;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },
  removeFromCart: async (payload: any) => {
    const { raffleId, userId } = payload;

    if (!raffleId || !userId) {
      throw new Error("Raffle id and user required");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const cart = await CartModel.findOneAndUpdate(
        { userId },
        { $pull: { items: raffleId } },
        { new: true, session }
      );

      if (!cart) {
        throw new Error("Raffle not found in cart");
      }

      await CartQueueModel.findOneAndUpdate(
        { userId },
        { $pull: { items: raffleId } },
        { new: true, session }
      );

      const raffle = await RaffleModel.findOneAndUpdate(
        { _id: raffleId, bookedSlots: { $gt: 0 } },
        { $inc: { bookedSlots: -1 } },
        { new: true, session }
      );
      if (!raffle) {
        throw new Error("Raffle not found or no booked slots to decrement");
      }

      await session.commitTransaction();
      session.endSession();
      return cart;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  },
  allCartItems: async (payload: any) => {
    const { userId } = payload;

    const user = await UserModel.findOne({
      _id: userId,
      isDeleted: false,
    });
    if (!user) throw new Error("User not found");
    const now = new Date();

    const queue = await CartQueueModel.findOne({ userId });
    if (!queue || queue.expiresAt <= now) return {};

    const cartItems = await CartModel.findOne({
      userId: userId,
    })
      .lean()
      .populate("items", "_id title price")
      .select("-__v -createdAt -updatedAt -items._id");
    return cartItems || {};
  },
};

export const PromoServices = {
  applyPromo: async (payload: any) => {
    const { reedemCode, cartTotal, userId } = payload;

    if (!userId || !reedemCode || !cartTotal) {
      throw new Error("UserId, promoCode, and cartTotal are required");
    }
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) throw new Error("User not found");

    const promo = await PromoCodeModel.findOne({
      reedemCode: reedemCode,
      isDeleted: false,
    });

    if (!promo) throw new Error("Invalid promo code");
    const now = new Date();
    if (promo.expiryDate <= now) throw new Error("Promo code expired");
    if (promo.status !== "AVAILABLE") throw new Error("Promo not available");
    if (promo.promoUsed >= promo.totalUses)
      throw new Error("Promo usage limit reached");
    if (
      promo.promoType === "PRIVATE" &&
      promo.associatedTo?.toString() !== userId
    ) {
      throw new Error("Promo not valid for this user");
    }
    const discountAmount = (cartTotal * promo.discount) / 100;
    const finalAmount = cartTotal - discountAmount;
    return {
      valid: true,
      promoCode: promo.reedemCode,
      discount: promo.discount,
      discountAmount,
      finalAmount,
    };
  },
};

export const transactionService = {
  createTransaction: async (payload: {
    userId: string;
    raffleIds: string[];
    amount: {
      subtotal: number;
      discount: number;
      total: number;
      currency: string;
    };
    promoCode?: string;
  }) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId, raffleIds, amount, promoCode } = payload;

      const alreadyPurchased = await UserRaffleModel.find({
        userId,
        raffleId: { $in: raffleIds },
        status: { $in: ["ACTIVE", "CONFIRMED"] },
      }).session(session);

      if (alreadyPurchased.length > 0) {
        const purchasedRaffles = alreadyPurchased.map((r) =>
          r.raffleId.toString()
        );
        throw new Error(
          `User has already purchased the following raffle(s): ${purchasedRaffles.join(", ")}`
        );
      }

      let promoDetails = undefined;
      let promoObjId = null;

      if (promoCode) {
        const promo = await PromoCodeModel.findOne({
          reedemCode: promoCode,
          isDeleted: false,
        }).session(session);
        if (!promo) throw new Error("Invalid promo code");
        if (promo.expiryDate <= new Date())
          throw new Error("Promo code expired");
        if (promo.totalUses <= promo.promoUsed)
          throw new Error("Promo code usage limit reached");

        promoObjId = promo._id;
        promoDetails = {
          promoCode: promo.reedemCode,
          discountValue: promo.discount,
        };
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount.total * 100),
        currency: amount.currency,
        metadata: {
          userId: userId.toString(),
          raffleIds: raffleIds.map((id) => id.toString()).join(","),
        },
      });

      // Create transaction in DB
      const transaction = await TransactionModel.create(
        [
          {
            userId,
            raffleIds,
            promoCode: promoObjId,
            promoDetails,
            amount,
            stripe: { paymentIntentId: paymentIntent.id },
            status: "PENDING",
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        transactionId: transaction[0]._id,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  },

  handleWebhook: async (event: any) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let transaction: any;

    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;

        transaction = await TransactionModel.findOne({
          "stripe.paymentIntentId": paymentIntent.id,
        }).session(session);
        if (!transaction) throw new Error("Transaction not found");

        // Prevent double processing
        if (transaction.isProcessed) {
          await session.commitTransaction();
          session.endSession();
          return { success: true };
        }

        // Mark transaction as SUCCESS
        transaction.status = "SUCCESS";
        transaction.isProcessed = true;
        await transaction.save({ session });

        // Fetch all raffles
        const raffles = await RaffleModel.find({
          _id: { $in: transaction.raffleIds },
        }).session(session);

        if (!raffles || raffles.length === 0)
          throw new Error("Raffles not found");

        // Update bookedSlots atomically
        const bulkRaffleOps = raffles.map((r) => ({
          updateOne: {
            filter: { _id: r._id, bookedSlots: { $lt: r.totalSlots } },
            update: { $inc: { bookedSlots: 1 } },
          },
        }));
        await RaffleModel.bulkWrite(bulkRaffleOps, { session });

        // Create Orders in bulk if not exists
        const ordersData = raffles.map((raffle) => ({
          userId: transaction.userId,
          transactionId: transaction._id,
          raffleId: raffle._id,
          slotsBooked: 1,
          pointsSpent: raffle.price,
          status: "CONFIRMED",
          raffleSnapshot: {
            title: raffle.title,
            price: raffle.price,
            totalSlots: raffle.totalSlots,
          },
        }));

        await OrderModel.insertMany(ordersData, {
          session,
          ordered: false, // continue even if duplicates
        });

        // Create UserRaffles safely using upsert
        const userRaffleOps = raffles.map((raffle) => ({
          updateOne: {
            filter: { userId: transaction.userId, raffleId: raffle._id },
            update: {
              userId: transaction.userId,
              raffleId: raffle._id,
              orderId: transaction._id,
              slotNumber: 1,
              status: "ACTIVE",
              pointsSpent: 0,
            },
            upsert: true,
          },
        }));

        await UserRaffleModel.bulkWrite(userRaffleOps, { session });

        // Update promo code usage
        if (transaction.promoCode) {
          await PromoCodeModel.updateOne(
            { _id: transaction.promoCode },
            { $inc: { promoUsed: 1 } },
            { session }
          );
        }

        // Clear user cart
        await CartModel.deleteOne({ userId: transaction.userId }).session(
          session
        );

        await session.commitTransaction();
        session.endSession();

        // Emit socket updates
        if (globalIo) {
          raffles.forEach((raffle) => {
            globalIo.emit("raffle:update", {
              raffleId: raffle._id,
              bookedSlots: raffle.bookedSlots + 1,
            });
          });
        }

        break;

      case "payment_intent.canceled":
      case "payment_intent.payment_failed":
        const failedIntent = event.data.object;
        transaction = await TransactionModel.findOne({
          "stripe.paymentIntentId": failedIntent.id,
        }).session(session);
        if (!transaction) throw new Error("Transaction not found");

        transaction.status =
          event.type === "payment_intent.canceled" ? "CANCELED" : "FAILED";
        await transaction.save({ session });
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
        break;
    }

    await session.commitTransaction();
    session.endSession();

    return { success: true };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

};

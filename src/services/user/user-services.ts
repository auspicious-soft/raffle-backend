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
import { generateAndSendOtp, sendRedeemRewardEmail } from "src/utils/helper";
import { io as globalIo } from "../../../src/app";
import { OrderModel } from "src/models/user/order-schema";
import { UserRaffleModel } from "src/models/user/user-raffle-schema";
import Stripe from "stripe";
import { RedemptionModel } from "src/models/admin/redemption-ladder-schema";
import { GiftCardModel } from "src/models/admin/gift-card-schema";
import { UserRedemptionModel } from "src/models/user/user-redemptionHistory-schema";

export const profileSerivce = {
  getUser: async (payload: any) => {
    const {
      userName,
      email,
      image,
      isVerifiedPhone,
      totalPoints,
      isBlocked,
      raffleBucks,
    } = payload.userData;

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
      raffleBucks,
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
      status: { $in: ["ACTIVE", "INACTIVE"] },

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
  buyRaffle: async (payload: any) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId, raffleId } = payload;

      const user = await UserModel.findById(userId).session(session);
      if (!user) throw new Error("User not found");

      const raffle = await RaffleModel.findOne({
        _id: raffleId,
        status: { $in: ["ACTIVE", "INACTIVE"] },
        isDeleted: false,
      }).session(session);

      if (!raffle) throw new Error("Raffle not available");

      const alreadyPurchased = await UserRaffleModel.findOne({
        userId,
        raffleId,
        status: "ACTIVE",
      }).session(session);

      if (alreadyPurchased) {
        throw new Error("You have already purchased this raffle");
      }

      const bucksRequiredCents = Math.round(raffle.price * 100);
      const bucksRequired = bucksRequiredCents / 100;
      if (user.raffleBucks < bucksRequired) {
        throw new Error("Insufficient raffle bucks");
      }

      user.raffleBucks =
        Math.round((user.raffleBucks - bucksRequired) * 100) / 100;
      user.raffleBucksCents = Math.round(user.raffleBucks * 100);
      await user.save({ session });

      await RaffleModel.updateOne(
        { _id: raffleId, bookedSlots: { $lt: raffle.totalSlots } },
        { $inc: { bookedSlots: 1 } },
        { session }
      );

      const order = await OrderModel.create(
        [
          {
            userId,
            transactionId: null,
            raffleId,
            slotsBooked: 1,
            bucksSpent: bucksRequired,
            status: "CONFIRMED",
            raffleSnapshot: {
              title: raffle.title,
              price: bucksRequired,
              totalSlots: raffle.totalSlots,
            },
          },
        ],
        { session }
      );

      await UserRaffleModel.updateOne(
        { userId, raffleId },
        {
          userId,
          raffleId,
          orderId: order[0]._id,
          slotNumber: 1,
          status: "ACTIVE",
          bucksSpent: bucksRequired,
        },
        { upsert: true, session }
      );

      const updatedRaffle =
        await RaffleModel.findById(raffleId).session(session);
      if (globalIo && updatedRaffle) {
        globalIo.emit("raffle:update", {
          raffleId: updatedRaffle._id,
          bookedSlots: updatedRaffle.bookedSlots,
        });
      }

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        message: "Raffles purchased successfully",
        totalBucksSpent: bucksRequired,
        remainingBucks: user.raffleBucks,
      };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  },
  withdrawRaffle: async (payload: any) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId, raffleId } = payload;

      const raffle = await RaffleModel.findById(raffleId).session(session);
      if (!raffle) throw new Error("Raffle not found");

      if (
        raffle.status === "ACTIVE" ||
        raffle.status === "COMPLETED" ||
        raffle.isDeleted
      ) {
        throw new Error("Cannot withdraw from an active or completed raffle");
      }

      const userRaffle = await UserRaffleModel.findOne({
        userId,
        raffleId,
      }).session(session);
      if (!userRaffle) throw new Error("User has not joined this raffle");

      const order = await OrderModel.findById(userRaffle.orderId).session(
        session
      );
      if (!order) throw new Error("Order not found for this raffle");

      const bucksToRefund = order.bucksSpent;
      const user = await UserModel.findById(userId).session(session);
      if (!user) throw new Error("User not found");

      user.raffleBucks += bucksToRefund;
      user.raffleBucksCents = Math.round(user.raffleBucks * 100);
      await user.save({ session });

      await OrderModel.deleteOne({ _id: order._id }).session(session);
      await UserRaffleModel.deleteOne({ _id: userRaffle._id }).session(session);

      raffle.bookedSlots = Math.max(raffle.bookedSlots - 1, 0);
      await raffle.save({ session });

      if (globalIo) {
        globalIo.emit("raffle:update", {
          raffleId: raffle._id,
          bookedSlots: raffle.bookedSlots,
        });
      }

      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        message: "Raffle withdrawn successfully and bucks refunded",
        refundedBucks: bucksToRefund,
        currentBucks: user.raffleBucks,
      };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  },
  getRaffleHistory: async (payload: any) => {
    const { userId, page, limit } = payload;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = { userId, status: "ACTIVE" };

    const totalRaffles = await UserRaffleModel.countDocuments(filter);
    const rawRaffles = await UserRaffleModel.find(filter)
      .skip(skip)
      .limit(limitNumber)
      .populate("raffleId")
      .sort({ createdAt: -1 })
      .lean();
    const raffles = rawRaffles.map((ur: any) => {
    const raffle = ur.raffleId || {};
      return {
        raffleId: raffle._id,
        title: raffle.title,
        price: raffle.price,
         result: ur.result,
        rewards: raffle.rewards.map((r: any) => ({
          rewardName: r.rewardName,
          rewardType: r.rewardType,
          // rewardImages: r.rewardImages,
          // giftCard: r.giftCard,
          consolationPoints: r.consolationPoints,
          // promoCode: r.promoCode,
          rewardStatus: r.rewardStatus,
        })),
        startDate: raffle.startDate,
        endDate: raffle.endDate,
        status: raffle.status,
        // slotsBooked: ur.slotNumber || 1,
        // bucksSpent: ur.bucksSpent,
        purchasedAt: ur.createdAt,
      };
    });

    return {
      data: raffles,
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
    const { promoCode, cartTotal, userId } = payload;

    if (!userId || !promoCode || !cartTotal) {
      throw new Error("UserId, promoCode, and cartTotal are required");
    }
    const user = await UserModel.findOne({ _id: userId, isDeleted: false });
    if (!user) throw new Error("User not found");

    const promo = await PromoCodeModel.findOne({
      reedemCode: promoCode,
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
    const discountAmount =
      Math.round(((cartTotal * promo.discount) / 100) * 100) / 100;
    const finalAmount = Math.round((cartTotal - discountAmount) * 100) / 100;
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
    amount: number;
    currency?: string;
    promoCodeId?: string;
  }) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { userId, currency = "usd", amount, promoCodeId } = payload;

      if (!amount || amount <= 0) {
        throw new Error("Amount must be greater than 0");
      }

      const amountCents = Math.round(amount * 100);

      let promo = null;
      if (promoCodeId) {
        promo = await PromoCodeModel.findOne({
          reedemCode: promoCodeId,
        }).session(session);
        if (!promo) throw new Error("Promo code not found");

        const checkPromoUsed = await TransactionModel.findOne({
          userId: userId,
          promoCodeId: promo._id,
        });
        if (checkPromoUsed) throw new Error("Promo code already Used");
      }

      const discountCents = promo
        ? Math.round((amountCents * promo.discount) / 100)
        : 0;
      const finalAmountCents = amountCents - discountCents;

      const checkoutSession = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: "Raffle Bucks Top-up",
              },
              unit_amount: finalAmountCents,
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: userId.toString(),
          purpose: "BUCKS_TOPUP",
        },
        success_url: `https://raffle-admin-alpha.vercel.app/user/bucks?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://raffle-admin-alpha.vercel.app/user/bucks?cancelled`,
      });

      const transaction = await TransactionModel.create(
        [
          {
            userId,
            purpose: "BUCKS_TOPUP",
            amountCents,
            currency,
            promoCodeId: promo?._id || null,
            discountCents,
            finalAmountCents,
            stripeSessionId: checkoutSession.id,
            status: "PENDING",
          },
        ],
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      return {
        checkoutUrl: checkoutSession.url,
        transactionId: transaction[0]._id,
        stripeSessionId: checkoutSession.id,
      };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      throw err;
    }
  },

  handleWebhook: async (payload: Buffer, signature: string) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      switch (event.type) {
        case "checkout.session.completed": {
          const checkoutSession = event.data.object as Stripe.Checkout.Session;
          const transaction = await TransactionModel.findOne({
            stripeSessionId: checkoutSession.id,
          }).session(session);

          if (!transaction) throw new Error("Transaction not found");
          if (transaction.status === "SUCCESS") break;

          transaction.status = "SUCCESS";
          await transaction.save({ session });
          const bucksIncrement =
            Math.round((transaction.amountCents / 100) * 100) / 100;

          const updatedUser = await UserModel.findByIdAndUpdate(
            transaction.userId,
            {
              $inc: {
                raffleBucks: bucksIncrement,
                raffleBucksCents: transaction.amountCents,
              },
            },
            { new: true, session }
          );

          if (!updatedUser) throw new Error("User not found");

          if (transaction.promoCodeId) {
            await PromoCodeModel.updateOne(
              { _id: transaction.promoCodeId },
              { $inc: { promoUsed: 1 } },
              { session }
            );
          }

          break;
        }

        case "checkout.session.expired": {
          const expiredSession = event.data.object as Stripe.Checkout.Session;
          await TransactionModel.updateOne(
            { stripeSessionId: expiredSession.id },
            { status: "EXPIRED" },
            { session }
          );
          break;
        }

        case "checkout.session.async_payment_failed": {
          const failedSession = event.data.object as Stripe.Checkout.Session;
          await TransactionModel.updateOne(
            { stripeSessionId: failedSession.id },
            { status: "FAILED" },
            { session }
          );
          break;
        }

        default:
          console.log("Unhandled event type:", event.type);
      }

      await session.commitTransaction();
      session.endSession();
      return { success: true };
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      console.error("Webhook error:", err);
      throw err;
    }
  },
  getTransaction: async (payload: any) => {
    const { userId, page, limit } = payload;

    if (!userId) throw new Error("userId requried");

    const user = await UserModel.findOne({
      _id: userId,
      isDeleted: false,
    });
    if (!user) {
      throw new Error(" User not found ");
    }
    const raffleBucks = user.raffleBucks;
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const filter: any = {
      userId: userId,
      status: { $in: ["SUCCESS", "FAILED"] },
      purpose: "BUCKS_TOPUP",
    };
    const totalTransactions = await TransactionModel.countDocuments(filter);
    const rawTransaction = await TransactionModel.find(filter)
      .skip(skip)
      .limit(limitNumber)
      .populate("promoCodeId", "reedemCode promoType")
      .select("stripeSessionId userId finalAmountCents createdAt status")
      .sort({ createdAt: -1 });

    const transc = rawTransaction.map((t: any) => {
      const tx = t.toObject();
      return {
        ...tx,
        amount: tx.finalAmountCents / 100,
        amountCents: undefined,
      };
    });
    return {
      raffleBucks: raffleBucks,
      data: transc,
      pagination: {
        total: totalTransactions,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalTransactions / limitNumber),
      },
    };
  },
};

export const ladderServices = {
  getLadder: async (payload: any) => {
    const { userId } = payload;

    const user = await UserModel.findOne({
      _id: userId,
      isDeleted: false,
    });
    if (!user) {
      throw new Error("User not found.");
    }
    const reedemPoints = user.totalPoints || 0;
    const totalCount = await RedemptionModel.countDocuments();
    const ladders = await RedemptionModel.find({ isDeleted: false })
      .select("-__v -createdAt -updatedAt -categories")
      .sort({ requiredPoints: 1 })
      .lean();
    return { totalPoints: reedemPoints, totalLadders: totalCount, ladders };
  },
  getLadderCategories: async (payload: any) => {
    const { userId, points } = payload;

    const user = await UserModel.findOne({
      _id: userId,
      isDeleted: false,
    });
    if (!user) {
      throw new Error("User not found.");
    }
    const reedemPoints = user.totalPoints || 0;

    const ladder = await RedemptionModel.findOne({
      requiredPoints: Number(points),
      isDeleted: false,
    })
      .populate({
        path: "categories",
        select: "companyName price _id",
      })
      .select("categories requiredPoints")
      .lean();

    if (!ladder) {
      throw new Error("No Categories found for this requiredPoints.");
    }

    let canReedem = false;
    if (ladder.requiredPoints < reedemPoints) {
      canReedem = true;
    }

    return { reedemPoints, canReedem, ladder };
  },
  reedemReward: async (payload: any) => {
    const { userId, userName, userEmail, categoryId, ladderId } = payload;

    if (!categoryId) {
      throw new Error("Category id is requried");
    }

    const user = await UserModel.findOne({
      _id: userId,
      isDeleted: false,
    });
    if (!user) {
      throw new Error("User not Found.");
    }
    const ladder = await RedemptionModel.findOne({
      _id: ladderId,
      isDeleted: false,
    }).populate("categories", "_id");
    if (!ladder) throw new Error("Ladder not found");

    const categoryExists = ladder.categories.some(
      (cat: any) => cat._id.toString() === categoryId.toString()
    );
    if (!categoryExists)
      throw new Error("Category does not belong to this ladder");

    if ((user.totalPoints || 0) < ladder.requiredPoints) {
      throw new Error("Insufficient points to redeem this reward");
    }
    const giftCard = await GiftCardModel.findOneAndUpdate(
      {
        categoryId,
        status: "NOT_GRANTED",
        expiryDate: { $gte: new Date() },
      },
      { $set: { status: "GRANTED" } },
      { new: true }
    );

    if (!giftCard) throw new Error("No available gift cards in this category");

    user.totalPoints = (user.totalPoints || 0) - ladder.requiredPoints;
    await user.save();

     await UserRedemptionModel.create({
      userId: user._id,
      ladderId: ladder._id,
      categoryId,
      giftCardId: giftCard._id,
      redemptionCode: giftCard.redemptionCode,
      pointsUsed: ladder.requiredPoints,
      expiryDate: giftCard.expiryDate,
      status: "GRANTED",
    });

    await sendRedeemRewardEmail({
      to: userEmail,
      redemptionCode: giftCard.redemptionCode,
      expiryDate: giftCard.expiryDate,
      price: giftCard.price,
    });
    return {
      message: "Reward redeemed successfully",
      redemptionCode: giftCard.redemptionCode,
      expiryDate: giftCard.expiryDate,
      remainingPoints: user.totalPoints,
    };
  },
};

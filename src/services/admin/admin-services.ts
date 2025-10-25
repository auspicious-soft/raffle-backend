import csvParser from "csv-parser";
import mongoose, { Types } from "mongoose";
import { GiftCardModel } from "src/models/admin/gift-card-schema";
import { GiftCategoryModel } from "src/models/admin/gift-category-schema";
import { PromoCodeModel } from "src/models/admin/promo-code-schema";
import { RaffleModel } from "src/models/admin/raffle-schema";
import { RaffleWinnerModel } from "src/models/admin/raffle-winner-schema";
import { RedemptionModel } from "src/models/admin/redemption-ladder-schema";
import { TransactionModel } from "src/models/user/transaction-schema";
import { UserRaffleModel } from "src/models/user/user-raffle-schema";
import { UserRedemptionModel } from "src/models/user/user-redemptionHistory-schema";
import { UserModel } from "src/models/user/user-schema";
import { ShippingAddressModel } from "src/models/user/user-shipping-schema";
import { sendPhysicalRewardStatusEmail } from "src/utils/helper";
import { Readable } from "stream";

export const GiftCardServices = {
  addCategory: async (payload: any) => {
    const categoryData = await GiftCategoryModel.create(payload);
    const category = categoryData.toObject();
    return category;
  },
  getAllCategories: async (payload: any) => {
    const { page, limit } = payload;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const filter = { isDeleted: false };

    const totalCategories = await GiftCategoryModel.countDocuments(filter);
    const rawCats = await GiftCategoryModel.find(filter)
      .skip(skip)
      .limit(limitNumber);

    const Categories = rawCats.map((cat: any) => {
      const categoriesObj = cat.toObject();
      return {
        ...categoriesObj,
      };
    });
    return {
      data: Categories,
      pagination: {
        total: totalCategories,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCategories / limitNumber),
      },
    };
  },
  deleteCategory: async (payload: any) => {
    const { categoryId } = payload;

    if (!categoryId) {
      throw new Error("Category Id is requried");
    }
    const checkExist = await GiftCategoryModel.findById(categoryId);
    if (!checkExist) {
      throw new Error("Category not Found");
    }
    if (checkExist.isDeleted) {
      throw new Error("Category is already deleted");
    }
    await GiftCategoryModel.findByIdAndUpdate(categoryId, { isDeleted: true });

    return {};
  },

  addGiftCard: async (payload: any) => {
    const { categoryId, redemptionCode, expiryDate } = payload;

    if (!categoryId || !redemptionCode || !expiryDate) {
      throw new Error("categoryId, ReedemCode and Expiry Date is Required");
    }
    const category = await GiftCategoryModel.findOne({
      _id: categoryId,
      isDeleted: false,
    });
    if (!category) {
      throw new Error("Category not Found");
    }
    const price = category.price;

    const expiry = new Date(expiryDate);
    const now = new Date();
    if (expiry <= now) {
      throw new Error("Expiry date must be a future date");
    }

    const giftCardData = await GiftCardModel.create({
      categoryId,
      price,
      redemptionCode,
      expiryDate,
    });
    const gift = giftCardData.toObject();
    return gift;
  },
  getGiftCards: async (payload: any) => {
    const { categoryId, page, limit, search, status } = payload;
    const ALLOWED_STATUS = ["NOT_GRANTED", "GRANTED", "EXPIRED"];

    if (!categoryId) {
      throw new Error("Category Id is required");
    }
    const checkExist = await GiftCategoryModel.findOne({
      _id: categoryId,
      isDeleted: false,
    }).lean();
    if (!checkExist) {
      throw new Error("Category not found");
    }

    if (status && !ALLOWED_STATUS.includes(status)) {
      throw new Error(
        `Invalid status. Allowed values: ${ALLOWED_STATUS.join(", ")}`
      );
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const filter: any = {
      categoryId,
    };

    if (search) {
      filter.redemptionCode = { $regex: search, $options: "i" };
    }

    if (status && ["NOT_GRANTED", "GRANTED", "EXPIRED"].includes(status)) {
      filter.status = status;
    }

    const totalCards = await GiftCardModel.countDocuments(filter);

    const rawCards = await GiftCardModel.find(filter)
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 });

    const giftCards = rawCards.map((card: any) => card.toObject());

    return {
      data: giftCards,
      companyName: checkExist.companyName,
      pagination: {
        total: totalCards,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCards / limitNumber),
      },
    };
  },

  importGiftCardsCSV: async (fileBuffer: Buffer, categoryId: string) => {
    const category = await GiftCategoryModel.findOne({
      _id: new mongoose.Types.ObjectId(categoryId),
      isDeleted: false,
    });
    if (!category) throw new Error("Category not found");
    const ALLOWED_STATUS = ["NOT_GRANTED", "GRANTED", "EXPIRED"];

    const giftCards: any[] = [];

    const stream = Readable.from(fileBuffer.toString());

    return new Promise<{ imported: number }>((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on("data", (row: any) => {
          giftCards.push(row);
        })
        .on("end", async () => {
          try {
            for (const row of giftCards) {
              const { redemptionCode, price, expiryDate, status } = row;

              if (!redemptionCode || !price || !expiryDate) {
                throw new Error(
                  `Missing required fields in row: ${JSON.stringify(row)}`
                );
              }

              const expiry = new Date(expiryDate);
              if (isNaN(expiry.getTime())) {
                throw new Error(
                  `Invalid expiryDate in row: ${JSON.stringify(row)}`
                );
              }
              const now = new Date();
              if (expiry <= now) {
                throw new Error(
                  `Expiry date must be a future date in row: ${JSON.stringify(row)}`
                );
              }

              let cardStatus = "NOT_GRANTED";
              if (status) {
                if (!ALLOWED_STATUS.includes(status)) {
                  throw new Error(
                    `Invalid status in row: ${JSON.stringify(row)}. Allowed: ${ALLOWED_STATUS.join(
                      ", "
                    )}`
                  );
                }
                cardStatus = status;
              }

              await GiftCardModel.updateOne(
                { redemptionCode },
                {
                  categoryId: new mongoose.Types.ObjectId(categoryId),
                  price: Number(price),
                  expiryDate: expiry,
                  status: cardStatus,
                },
                { upsert: true }
              );
            }

            resolve({ imported: giftCards.length });
          } catch (err) {
            reject(err);
          }
        })
        .on("error", (err) => reject(err));
    });
  },
};

export const PromoCodeServices = {
  addPromoCode: async (payload: any) => {
    const {
      reedemCode,
      expiryDate,
      promoType,
      totalUses,
      discount,
      associatedTo,
    } = payload;
    if (!reedemCode || !expiryDate || !promoType || !totalUses || !discount) {
      throw new Error("requriedPromoFields");
    }
    const checkName = await PromoCodeModel.findOne({
      reedemCode: reedemCode,
      isDeleted: false,
    });
    if (checkName) {
      throw new Error("Promo with this code already exist.");
    }
    let userName = "";
    let userId: any;
    let query: any = { isDeleted: false };

    if (promoType === "PRIVATE") {
      if (!associatedTo) {
        throw new Error("User id required to create Private PromoCode");
      }

      if (Types.ObjectId.isValid(associatedTo)) {
        query._id = associatedTo;
      } else {
        query.userName = associatedTo;
      }
      const checkExist = await UserModel.findOne(query);
      if (!checkExist) {
        throw new Error("User not Found");
      }
      userName = checkExist.userName;
      userId = checkExist._id;
    }

    const expiry = new Date(expiryDate);
    const now = new Date();
    if (expiry <= now) {
      throw new Error("Expiry date must be a future date");
    }
    const promoData = await PromoCodeModel.create({
      reedemCode,
      expiryDate: new Date(expiryDate),
      promoType,
      totalUses,
      discount,
      userName,
      associatedTo: userId || null,
    });
    return promoData.toObject();
  },
  getPromoCodes: async (payload: any) => {
    const { type, page, limit } = payload;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const filter: any = {
      status: { $ne: "EXPIRED" },
      isDeleted: false,
    };

    if (type) {
      filter.promoType = type;
    }

    const totalPromos = await PromoCodeModel.countDocuments(filter);

    const rawPromos = await PromoCodeModel.find(filter)
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 });

    const promos = rawPromos.map((promo: any) => promo.toObject());

    return {
      data: promos,
      pagination: {
        total: totalPromos,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalPromos / limitNumber),
      },
    };
  },
  deletePromoCode: async (payload: any) => {
    const { promoId } = payload;
    if (!promoId) {
      throw new Error("Promo Id is requried");
    }
    const checkExist = await PromoCodeModel.findById(promoId);
    if (!checkExist) {
      throw new Error("Promo not Found");
    }
    if (checkExist.isDeleted) {
      throw new Error("Promo is already deleted");
    }
    await PromoCodeModel.findByIdAndUpdate(promoId, { isDeleted: true });

    return {};
  },
};

export const RaffleServices = {
  createRaffle: async (payload: any) => {
    const {
      title,
      description,
      price,
      totalSlots,
      startDate,
      endDate,
      rewards,
      winnerId,
    } = payload;
    if (
      !title ||
      !description ||
      !price ||
      !totalSlots ||
      !startDate ||
      !endDate
    ) {
      throw new Error("missingRaffleFields");
    }
    if (!rewards || !Array.isArray(rewards) || rewards.length === 0) {
      throw new Error("Reward requried to create a raffle");
    }
    const now = new Date();
    const sDate = new Date(startDate);
    const eDate = new Date(endDate);

    if (sDate <= now) {
      throw new Error("Start Date must be in Future");
    }
    if (eDate <= sDate) {
      throw new Error("EndDate must be ahead of start date");
    }
    const formattedRewards: any[] = [];
    for (const reward of rewards) {
      const {
        rewardName,
        rewardType,
        giftCard,
        consolationPoints,
        promoCode,
        rewardImages,
      } = reward;

      if (!rewardName || !consolationPoints || !rewardType) {
        throw new Error(
          "rewardName, consolationPoints, RewardType is Required"
        );
      }

      if (rewardType === "PHYSICAL" && giftCard) {
        throw new Error("Physical reward cannot have a giftCard");
      }

      if (rewardType === "DIGITAL" && !giftCard) {
        throw new Error("gift Card is Required for Digital Raffles");
      }

      if (giftCard) {
        const checkGiftExist = await GiftCategoryModel.findOne({
          _id: giftCard,
          isDeleted: false,
        });
        if (!checkGiftExist) {
          throw new Error("Gift Category not found or invalid");
        }
      }

      if (promoCode) {
        const checkPromo = await PromoCodeModel.findOne({
          _id: promoCode,
          isDeleted: false,
          status: "AVAILABLE",
        });
        if (!checkPromo) {
          throw new Error("Promo Code not found or invalid");
        }
      }

      formattedRewards.push({
        rewardName,
        rewardType,
        giftCard: giftCard || null,
        consolationPoints,
        promoCode: promoCode || null,
        rewardImages: Array.isArray(rewardImages) ? rewardImages : [],
      });
    }

    const raffle = await RaffleModel.create({
      title,
      description,
      price,
      totalSlots,
      bookedSlots: 0,
      winnerId: winnerId || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      rewards: formattedRewards,
    });

    return raffle.toObject();
  },
  getRaffles: async (payload: any) => {
    const { type, page, limit, status, search } = payload;
    const ALLOWED_STATUS = ["INACTIVE", "ACTIVE", "COMPLETED"];
    const ALLOWED_TYPE = ["PHYSICAL", "DIGITAL"];

    if (status && !ALLOWED_STATUS.includes(status)) {
      throw new Error(
        `Invalid status. Allowed values: ${ALLOWED_STATUS.join(", ")}`
      );
    }
    if (type && !ALLOWED_TYPE.includes(type)) {
      throw new Error(
        `Invalid Type. Allowed values: ${ALLOWED_TYPE.join(", ")}`
      );
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const filter: any = { isDeleted: false };
    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }
    if (status && ALLOWED_STATUS.includes(status)) {
      filter.status = status;
    }
    if (type && ALLOWED_TYPE.includes(type)) {
      filter["rewards.rewardType"] = type;
    }
    const totalRaffles = await RaffleModel.countDocuments(filter);
    const rawRaffles = await RaffleModel.find(filter)
      .skip(skip)
      .limit(limitNumber)
      .populate("winnerId", "_id userName")
      .sort({ createdAt: -1 });
    const raffles = rawRaffles.map((raffle: any) => raffle.toObject());
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

  getRaffleById: async (payload: any) => {
    const { raffleId } = payload;
    if (!raffleId) {
      throw new Error("Raffle id is Required");
    }
    const raffle = await RaffleModel.findById(raffleId)
      .select("-__v ")
      .populate({
        path: "rewards.giftCard",
        select: "companyName _id",
      })
      .populate({
        path: "rewards.promoCode",
        select: "reedemCode _id",
      })
      .populate({
        path: "winnerId",
        select: "userName _id",
      })
      .lean();

    if (!raffle || raffle.isDeleted) {
      throw new Error("Raffle not found");
    }

    return raffle;
  },

  deleteRaffle: async (payload: any) => {
    const { raffleId } = payload;
    if (!raffleId) {
      throw new Error("Raffle id is Required");
    }

    const checkExist = await RaffleModel.findById(raffleId);
    if (!checkExist) {
      throw new Error("Raffle not Found");
    }
    if (checkExist.isDeleted) {
      throw new Error("Raffle is already deleted");
    }
    await RaffleModel.findByIdAndUpdate(raffleId, { isDeleted: true });
    return {};
  },
  updateRaffle: async (payload: any) => {
    const {
      raffleId,
      price,
      title,
      description,
      startDate,
      endDate,
      rewards,
      status,
    } = payload;
    if (!raffleId) throw new Error("Raffle id is required");

    const raffle = await RaffleModel.findById(raffleId);
    if (!raffle || raffle.isDeleted) throw new Error("Raffle not found");

    const updateData: any = {};

    if (price !== undefined) {
      if (raffle.bookedSlots > 0 || price !== raffle.price) {
        throw new Error("Cannot update price once slots are booked");
      } else {
        updateData.price = price;
      }
    }

    if (title) updateData.title = title;
    if (description) updateData.description = description;

    const now = new Date();
    if (startDate) {
      const sDate = new Date(startDate);
      if (sDate <= now) throw new Error("Start Date must be in future");
      updateData.startDate = sDate;
    }
    if (endDate) {
      const eDate = new Date(endDate);
      const sDate = startDate ? new Date(startDate) : raffle.startDate;
      if (eDate <= sDate) throw new Error("End Date must be after start date");
      updateData.endDate = eDate;
    }

    if (status && ["INACTIVE", "ACTIVE", "COMPLETED"].includes(status)) {
      updateData.status = status;
    }

    if (rewards && Array.isArray(rewards) && rewards.length > 0) {
      const existingRewards = raffle.rewards.map((r) => r.toObject?.() || r);
      const updatedRewards: any[] = [];

      for (let i = 0; i < rewards.length; i++) {
        const incoming = rewards[i];
        const current = existingRewards[i] || {};
        const {
          rewardName,
          rewardType,
          giftCard,
          consolationPoints,
          promoCode,
          rewardImages,
          rewardStatus,
        } = incoming;

        if ("rewardName" in incoming && !rewardName) {
          throw new Error("rewardName cannot be empty");
        }
        if ("consolationPoints" in incoming && !consolationPoints) {
          throw new Error("consolationPoints cannot be empty");
        }
        if ("promoCode" in incoming && !promoCode) {
          throw new Error("promoCode cannot be empty");
        }
        if ("rewardType" in incoming && !rewardType) {
          throw new Error("rewardType cannot be empty");
        }
        if (rewardType === "PHYSICAL" && giftCard) {
          throw new Error("Physical reward cannot have a giftCard");
        }
        if (rewardType === "DIGITAL" && !giftCard) {
          throw new Error("GiftCard is required for Digital reward");
        }

        if (giftCard) {
          const checkGiftExist = await GiftCategoryModel.findOne({
            _id: giftCard,
            isDeleted: false,
          });
          if (!checkGiftExist)
            throw new Error("Gift Category not found or invalid");
        }

        if (promoCode) {
          const checkPromo = await PromoCodeModel.findOne({
            _id: promoCode,
            isDeleted: false,
            status: "AVAILABLE",
          });
          if (!checkPromo) throw new Error("Promo Code not found or invalid");
        }
        updatedRewards.push({
          rewardName: rewardName ?? current.rewardName,
          rewardType: rewardType ?? current.rewardType,
          giftCard: giftCard !== undefined ? giftCard : current.giftCard,
          consolationPoints:
            consolationPoints !== undefined
              ? consolationPoints
              : current.consolationPoints,
          promoCode: promoCode !== undefined ? promoCode : current.promoCode,
          rewardStatus: rewardStatus ?? current.rewardStatus,
          rewardImages:
            rewardImages !== undefined
              ? Array.isArray(rewardImages)
                ? rewardImages
                : current.rewardImages
              : current.rewardImages,
        });
      }
      updateData.rewards = updatedRewards;
    }

    const updatedRaffle = await RaffleModel.findByIdAndUpdate(
      raffleId,
      { $set: updateData },
      { new: true }
    ).lean();

    return updatedRaffle;
  },
};

export const UserServices = {
  getUsers: async (payload: any) => {
    const { status, page, limit, sort, search } = payload;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const filter: any = { role: "USER" };

    if (status) {
      if (status.toLowerCase() === "active") {
        filter.isBlocked = false;
      } else if (status.toLowerCase() === "inactive") {
        filter.isBlocked = true;
      } else {
        throw new Error("Invalid status. Allowed values: active, inactive");
      }
    }

    if (search) {
      filter.userName = { $regex: search, $options: "i" };
    }

    // Sorting
    let sortOption: any = { totalPoints: -1 };
    if (sort) {
      if (sort.toLowerCase() === "asc" || sort.toLowerCase() === "ascending") {
        sortOption = { totalPoints: 1 };
      } else if (
        sort.toLowerCase() === "desc" ||
        sort.toLowerCase() === "descending"
      ) {
        sortOption = { totalPoints: -1 };
      }
    }
    const totalUsers = await UserModel.countDocuments(filter);

    const rawUsers = await UserModel.aggregate([
      { $match: filter },
      { $sort: sortOption },
      { $skip: skip },
      { $limit: limitNumber },
      {
        $lookup: {
          from: "shippingaddresses",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$userId"] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 1 },
            { $project: { phoneNumber: 1, _id: 0 } },
          ],
          as: "shippingAddress",
        },
      },
      {
        $addFields: {
          phoneNumber: {
            $ifNull: [
              { $arrayElemAt: ["$shippingAddress.phoneNumber", 0] },
              "",
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          userName: 1,
          email: 1,
          totalPoints: 1,
          role: 1,
          isVerifiedEmail: 1,
          isVerifiedPhone: 1,
          isBlocked: 1,
          isDeleted: 1,
          createdAt: 1,
          updatedAt: 1,
          phoneNumber: 1,
        },
      },
    ]);

    return {
      data: rawUsers,
      pagination: {
        total: totalUsers,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalUsers / limitNumber),
      },
    };
  },
  getSingleUser: async (payload: any) => {
    const { userId } = payload;
    if (!userId) {
      throw new Error("User id is required");
    }

    const user = await UserModel.findOne({
      _id: userId,
    })
      .select(
        "_id userName email totalPoints role isVerifiedEmail isVerifiedPhone isBlocked isDeleted totalPoints createdAt updatedAt"
      )
      .lean();

    if (!user) {
      throw new Error("User Not found.");
    }
    let shippingData = {};
    const shippingDetails = await ShippingAddressModel.findOne({
      userId: payload.userId,
    }).select("country state address city postalCode countryCode phoneNumber");
    if (!shippingDetails) {
      shippingData = {};
    } else {
      shippingData = shippingDetails.toObject();
    }

    const winningEntries = await UserRaffleModel.find({ userId, result: "WIN" })
      .populate({
        path: "raffleId",
        select: "title rewards",
      })
      .select("raffleId createdAt")
      .lean();

    const winningHistory = winningEntries.map((entry) => {
      const raffle = entry.raffleId as any;
      return {
        raffleId: raffle._id,
        raffleTitle: raffle.title,
        rewardName: raffle.rewards?.[0]?.rewardName || "",
        purchasedAt: entry.createdAt,
      };
    });

    const raffleEntries = await UserRaffleModel.find({ userId })
      .populate({
        path: "raffleId",
        select: "title status totalSlots bookedSlots",
      })
      .select("raffleId status createdAt")
      .lean();

    const raffleHistory = raffleEntries.map((entry) => {
      const raffle = entry.raffleId as any;

      return {
        raffleId: raffle._id,
        raffleTitle: raffle.title,
        raffleStatus: raffle.status,
        totalSlots: raffle.totalSlots,
        bookedSlots: raffle.bookedSlots,
        purchasedAt: entry.createdAt,
      };
    });

    return {
      ...user,
      ...shippingData,
      winningHistory,
      raffleHistory,
    };
  },
  blockUnblockUser: async (payload: any) => {
    const { status, userId } = payload;
    const ALLOWED_STATUS = ["active", "inactive"];

    if (!userId || !status) {
      throw new Error("userId and status are required");
    }

    if (!ALLOWED_STATUS.includes(status.toLowerCase())) {
      throw new Error(
        `Invalid status. Allowed values: ${ALLOWED_STATUS.join(", ")}`
      );
    }

    const user = await UserModel.findById(userId).lean();
    if (!user) {
      throw new Error("User not found");
    }

    if (status.toLowerCase() === "active") {
      if (!user.isBlocked && !user.isDeleted) {
        throw new Error("User is already active");
      }

      await UserModel.findByIdAndUpdate(userId, {
        $set: { isBlocked: false, isDeleted: false },
      });

      return { message: "User has been unblocked (active)" };
    }

    if (status.toLowerCase() === "inactive") {
      if (user.isBlocked && user.isDeleted) {
        throw new Error("User is already blocked");
      }

      await UserModel.findByIdAndUpdate(userId, {
        $set: { isBlocked: true, isDeleted: true },
      });

      return { message: "User has been blocked (inactive)" };
    }
  },
};

export const RedempLadder = {
  createLadder: async (payload: any) => {
    const { name, requiredPoints, categories } = payload;
    if (!name || !requiredPoints || !categories) {
      throw new Error("Name, Points and atleast one category requried");
    }
    await Promise.all(
      categories.map(async (cat: any) => {
        const category = await GiftCategoryModel.findOne({
          _id: cat,
          isDeleted: false,
        });
        if (!category) {
          throw new Error(`Category not found or deleted: ${cat}`);
        }
      })
    );
    const ladder = await RedemptionModel.create({
      name,
      requiredPoints,
      categories,
    });
    return ladder.toObject();
  },

  getAllLadders: async (payload: any) => {
    const totalCount = await RedemptionModel.countDocuments();
    const ladders = await RedemptionModel.find({ isDeleted: false })
      .populate({
        path: "categories",
        select: "companyName _id price",
      })
      .select("-__v -createdAt -updatedAt")
      .sort({ requiredPoints: 1 })
      .lean();

    return { totalLadders: totalCount, ladders };
  },

  getSingleLadder: async (payload: any) => {
    const { ladderId } = payload;
    if (!ladderId) {
      throw new Error("Ladder id is requried");
    }
    const ladder = await RedemptionModel.findOne({
      _id: ladderId,
      isDeleted: false,
    })
      .populate({
        path: "categories",
        select: "companyName _id",
      })
      .select("-__v -createdAt -updatedAt")
      .lean();
    if (!ladder) {
      throw new Error("Redemption Ladder not found.");
    }
    return ladder;
  },

  deleteLadder: async (payload: any) => {
    const { ladderId } = payload;
    if (!ladderId) {
      throw new Error("Ladder id is requried");
    }
    const ladder = await RedemptionModel.findById(ladderId);
    if (!ladder) {
      throw new Error("Ladder not Found");
    }
    if (ladder.isDeleted) {
      throw new Error("Ladder is already deleted");
    }
    await RedemptionModel.findByIdAndUpdate(ladderId, { isDeleted: true });
    return {};
  },

  updateLadder: async (payload: any) => {
    const { ladderId, ...fieldsToUpdate } = payload;
    if (!ladderId) {
      throw new Error("Ladder id is required");
    }

    const ladder = await RedemptionModel.findById(ladderId);
    if (!ladder || ladder.isDeleted) throw new Error("Ladder not found");

    const update: any = {};
    if (fieldsToUpdate.name !== undefined) update.name = fieldsToUpdate.name;
    if (fieldsToUpdate.requiredPoints !== undefined)
      update.requiredPoints = fieldsToUpdate.requiredPoints;

    if (fieldsToUpdate.categories !== undefined) {
      if (
        !Array.isArray(fieldsToUpdate.categories) ||
        fieldsToUpdate.categories.length === 0
      ) {
        throw new Error("Categories must be a non-empty array if provided");
      }
      await Promise.all(
        fieldsToUpdate.categories.map(async (cat: any) => {
          const exists = await GiftCategoryModel.findOne({
            _id: cat,
            isDeleted: false,
          });
          if (!exists) throw new Error(`Category not found or deleted: ${cat}`);
        })
      );

      update.categories = fieldsToUpdate.categories;
    }

    const updatedLadder = await RedemptionModel.findByIdAndUpdate(
      ladderId,
      { $set: update },
      { new: true }
    ).lean();

    return updatedLadder;
  },
  redemptionHistory: async (payload: any) => {
    const { categoryId, page, limit } = payload;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const filter: any = {};
    if (categoryId) {
      const category = await GiftCategoryModel.findOne({
        _id: categoryId,
        isDeleted: false,
      }).lean();

      if (!category) {
        throw new Error("Category not found.");
      }
      filter.categoryId = categoryId;
    }

    const totalRedemption = await UserRedemptionModel.countDocuments(filter);
    const rawRedempHistory = await UserRedemptionModel.find(filter)
      .skip(skip)
      .limit(limitNumber)
      .sort({ createdAt: -1 })
      .select("_id userId pointsUsed expiryDate redeemedAt")
      .populate("userId", "userName")
      .lean();

    const history = rawRedempHistory.map((hist: any) => ({
      _id: hist._id,
      userName: hist.userId?.userName || "Unknown User",
      pointsUsed: hist.pointsUsed,
      expiryDate: hist.expiryDate,
      redeemedAt: hist.redeemedAt,
    }));
    return {
      history,
      pagination: {
        total: totalRedemption,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalRedemption / limitNumber),
      },
    };
  },
};

export const generalInformation = {
  revenue: async (payload: any) => {
    const { page, limit } = payload;

    const pageNumber = parseInt(page, 10) || 1; // ✅ default to 1
    const limitNumber = parseInt(limit, 10) || 10; // ✅ default to 10
    const skip = (pageNumber - 1) * limitNumber;

    const filter = { status: "SUCCESS" };

    const totalTransactions = await TransactionModel.countDocuments(filter);
    const rawTransactions = await TransactionModel.find(filter)
      .skip(skip)
      .limit(limitNumber)
      .select("_id finalAmountCents createdAt status userId amountCents")
      .populate("userId", "userName")
      .populate("promoCodeId", "reedemCode discount")
      .sort({ createdAt: -1 })
      .lean();

    const transactions = rawTransactions.map((t: any) => ({
      _id: t._id,
      userName: t.userId?.userName || "Unknown User",
      bucksPurchased: t.amountCents / 100,
      promoCode: t.promoCodeId?.reedemCode || null,
      discount: t.promoCodeId?.discount || 0,
      amount: t.finalAmountCents / 100,
      createdAt: t.createdAt,
      status: t.status,
    }));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const totalRevenueAgg = await TransactionModel.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$finalAmountCents" } } },
    ]);

    const monthlyRevenueAgg = await TransactionModel.aggregate([
      { $match: { ...filter, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: "$finalAmountCents" } } },
    ]);

    const weeklyRevenueAgg = await TransactionModel.aggregate([
      { $match: { ...filter, createdAt: { $gte: startOfWeek } } },
      { $group: { _id: null, total: { $sum: "$finalAmountCents" } } },
    ]);

    const totalRevenue = (totalRevenueAgg[0]?.total || 0) / 100;
    const revenueThisMonth = (monthlyRevenueAgg[0]?.total || 0) / 100;
    const revenueThisWeek = (weeklyRevenueAgg[0]?.total || 0) / 100;

    return {
      totalRevenue,
      revenueThisMonth,
      revenueThisWeek,
      transactions,
      pagination: {
        total: totalTransactions,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalTransactions / limitNumber),
      },
    };
  },
  winnerAndFullfillment: async (payload: any) => {
    const { page, limit, search } = payload;

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const matchStage: any = {};

    let searchRegex;
    if (search && search.trim()) {
      searchRegex = new RegExp(search.trim(), "i");

      const users = await UserModel.find({
        $or: [{ userName: searchRegex }, { email: searchRegex }],
      }).select("_id");

      const userIds = users.map((u) => u._id);

      const raffles = await RaffleModel.find({
        title: searchRegex,
      }).select("_id");

      const raffleIds = raffles.map((r) => r._id);

      matchStage.$or = [
        { userId: { $in: userIds } },
        { raffleId: { $in: raffleIds } },
        { status: searchRegex },
      ];
    }

    const totalRecords = await RaffleWinnerModel.countDocuments(matchStage);

    const winnersList = await RaffleWinnerModel.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "raffles",
          localField: "raffleId",
          foreignField: "_id",
          as: "raffle",
        },
      },
      { $unwind: "$raffle" },
      {
        $project: {
          _id: 1,
          raffleId: 1,
          raffleTitle: "$raffle.title",
          userName: "$user.userName",
          email: "$user.email",
          raffleType: 1,
          status: 1,
          trackingLink: 1,
        },
      },
      { $sort: { awardedAt: -1 } },
      { $skip: skip },
      { $limit: limitNumber },
    ]);

    return {
      winnersList,
      pagination: {
        total: totalRecords,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalRecords / limitNumber),
      },
    };
  },
  addTrackingLink: async (payload: any) => {
    const { id, link } = payload;

    const winner = await RaffleWinnerModel.findById(id);
    if (!winner) {
      throw new Error("Winner entry not found.");
    }

    // if (winner.trackingLink) {
    //   throw new Error("Tracking link already exists for this winner.");
    // }

    winner.trackingLink = link;
    await winner.save();

    return {
      message: "Tracking link added successfully.",
      data: winner,
    };
  },
  updateDeliveryStatus: async (payload: any) => {
    const { id, status } = payload;

    const winner = await RaffleWinnerModel.findById(id).populate(
      "userId",
      "email userName"
    );
    const ALLOWED_STATUS = [
      "PENDING",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELED",
      "FAILED",
    ];
    if (!winner) {
      throw new Error("Winner Entry Not Found.");
    }
    if (status && !ALLOWED_STATUS.includes(status)) {
      throw new Error(
        `Invalid status. Allowed values: ${ALLOWED_STATUS.join(", ")}`
      );
    }
    if (status === winner.status) {
      throw new Error(`Status is already ${status} `);
    }
    const raffle = await RaffleModel.findOne({
      _id: winner.raffleId,
      isDeleted: false,
    });
    if (!raffle) {
      throw new Error("Raffle Not Found to udpate rewardStatus.");
    }
    if (raffle.rewards[0].rewardType === "DIGITAL") {
      throw new Error("");
    }

    winner.status = status;
    await winner.save();

    if (raffle.rewards.length > 0) {
      raffle.rewards = raffle.rewards.map((reward) => ({
        ...reward.toObject(),
        rewardStatus: status,
      }));

      await raffle.save();
    }
    const user = winner.userId as any;

    if (
      raffle.rewards[0].rewardType === "PHYSICAL" &&
      ["SHIPPED", "DELIVERED", "CANCELED"].includes(status)
    ) {
      await sendPhysicalRewardStatusEmail({
        to: user.email,
        userName: user.userName,
        raffleTitle: raffle.title,
        status,
        trackingLink: winner.trackingLink,
        companyName: "Your Company",
      });
    }

    const responseData = {
      _id: winner._id,
      raffleId: winner.raffleId,
      raffleType: winner.raffleType,
      status,
      trackingLink: winner.trackingLink || "",
      raffleTitle: raffle.title,
      userName: user.userName,
      email: user.email,
    };

    return {
      winner: responseData,
    };
  },
};

export const getDashboardDataService = async (searchEntryNumber?: number) => {
  const now = new Date();
  const year = now.getFullYear();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const liveRafflesCountPromise = RaffleModel.countDocuments({
    status: "ACTIVE",
    isDeleted: false,
  });

  const totalRafflesCountPromise = RaffleModel.countDocuments({
    isDeleted: false,
  });

  const totalRaffleWinsCountPromise = RaffleModel.countDocuments({
    winnerId: { $ne: null },
    isDeleted: false,
  });

  const revenueThisMonthPromise = TransactionModel.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        status: "SUCCESS",
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$amount" },
      },
    },
  ]);

  const raffleWinsLast24HoursPromise = RaffleWinnerModel.countDocuments({
  awardedAt: { $gte: last24Hours }, 
});

  const activeRafflesPromise = RaffleModel.find({
    status: "ACTIVE",
    isDeleted: false,
  })
    .sort({ startDate: -1 })
    .select({ title: 1, endDate: 1, totalSlots: 1, bookedSlots: 1, rewards: 1 })
    .lean();

  let recentWinnersPromise;

  if (searchEntryNumber && searchEntryNumber > 0) {
    recentWinnersPromise = RaffleWinnerModel.find()
      .sort({ awardedAt: 1 })
      .skip(searchEntryNumber - 1)
      .limit(1)
      .populate("userId", "userName")
      .lean();
  } else {
    recentWinnersPromise = RaffleWinnerModel.find()
      .sort({ awardedAt: -1 })
      .limit(1000)
      .populate("userId", "userName")
      .lean();
  }
  const redemptionOverviewPromise = RaffleWinnerModel.aggregate([
    {
      $group: {
        _id: null,
        pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
        shipped: { $sum: { $cond: [{ $eq: ["$status", "SHIPPED"] }, 1, 0] } },
        delivered: {
          $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] },
        },
      },
    },
  ]);

  const entriesGraphPromise = UserRaffleModel.aggregate([
    {
      $lookup: {
        from: "raffles",
        localField: "raffleId",
        foreignField: "_id",
        as: "raffle",
      },
    },
    { $unwind: "$raffle" },

    { $unwind: "$raffle.rewards" },

    {
      $match: {
        "raffle.isDeleted": false,
        "raffle.rewards.rewardType": { $in: ["DIGITAL", "PHYSICAL"] },
        createdAt: {
          $gte: new Date(year, 0, 1),
          $lte: new Date(year, 11, 31),
        },
      },
    },
    {
      $project: {
        month: { $month: "$createdAt" },
        raffleType: "$raffle.rewards.rewardType",
      },
    },
    {
      $group: {
        _id: { month: "$month", raffleType: "$raffleType" },
        totalEntries: { $sum: 1 },
      },
    },
  ]);

  const [
    liveRafflesCount,
    raffleWinsLast24Hours,
    totalRafflesCount,
    totalRaffleWinsCount,
    revenueAgg,
    activeRafflesRaw,
    recentWinnersRaw,
    redemptionOverviewAgg,
    entriesGraphAgg,
  ] = await Promise.all([
    liveRafflesCountPromise,
    raffleWinsLast24HoursPromise,
    totalRafflesCountPromise,
    totalRaffleWinsCountPromise,
    revenueThisMonthPromise,
    activeRafflesPromise,
    recentWinnersPromise,
    redemptionOverviewPromise,
    entriesGraphPromise,
  ]);

  const activeRaffles = activeRafflesRaw.map((raffle) => ({
    _id: raffle._id,
    title: raffle.title,
    endDate: raffle.endDate,
    totalSlots: raffle.totalSlots,
    bookedSlots: raffle.bookedSlots,
    rewardName: raffle.rewards?.[0]?.rewardName || "",
  }));

  const recentWinners = recentWinnersRaw.map((winner) => {
    const user = winner.userId as any;
    return {
      userId: user._id,
      userName: user.userName,
    };
  });

  const revenueThisMonth = revenueAgg.length ? revenueAgg[0].totalRevenue : 0;
  const redemptionOverview = redemptionOverviewAgg.length
    ? redemptionOverviewAgg[0]
    : { pending: 0, shipped: 0, delivered: 0 };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const entriesGraph = months.map((month, index) => {
    const digital = entriesGraphAgg.find(
      (e) => e._id.month === index + 1 && e._id.raffleType === "DIGITAL"
    );
    const physical = entriesGraphAgg.find(
      (e) => e._id.month === index + 1 && e._id.raffleType === "PHYSICAL"
    );

    return {
      month,
      digitalRaffleEntries: digital ? digital.totalEntries : 0,
      physicalRaffleEntries: physical ? physical.totalEntries : 0,
    };
  });

  return {
    liveRafflesCount,
    raffleWinsLast24Hours,
    totalRafflesCount,
    totalRaffleWinsCount,
    revenueThisMonth,
    activeRaffles,
    recentWinners,
    redemptionOverview,
    entriesGraph,
  };
};

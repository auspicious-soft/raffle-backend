import csvParser from "csv-parser";
import mongoose, { Types } from "mongoose";
import { GiftCardModel } from "src/models/admin/gift-card-schema";
import { GiftCategoryModel } from "src/models/admin/gift-category-schema";
import { PromoCodeModel } from "src/models/admin/promo-code-schema";
import { RaffleModel } from "src/models/admin/raffle-schema";
import { RedemptionModel } from "src/models/admin/redemption-ladder-schema";
import { UserModel } from "src/models/user/user-schema";
import { ShippingAddressModel } from "src/models/user/user-shipping-schema";
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

      if (!rewardName || !consolationPoints || !promoCode || !rewardType) {
        throw new Error(
          "rewardName, consolationPoints, promocode and RewardType is Required"
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
      winnerId:winnerId || null,
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
    const filter: any = {isDeleted:false};
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
  const existingRewards = raffle.rewards.map(r => r.toObject?.() || r); 
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

    return { ...user, ...shippingData };
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
        select: "companyName _id",
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
};

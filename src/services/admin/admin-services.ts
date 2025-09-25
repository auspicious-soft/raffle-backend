import csvParser from "csv-parser";
import mongoose from "mongoose";
import { GiftCardModel } from "src/models/admin/gift-card-schema";
import { GiftCategoryModel } from "src/models/admin/gift-category-schema";
import { PromoCodeModel } from "src/models/admin/promo-code-schema";
import { UserModel } from "src/models/user/user-schema";
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
    const { categoryId, price, redemptionCode, expiryDate } = payload;

    if (!categoryId || !price || !redemptionCode || !expiryDate) {
      throw new Error(
        "categoryId, price, ReedemCode and Expiry Date is Required"
      );
    }
    const checkExist = await GiftCategoryModel.findOne({
      _id: categoryId,
      isDeleted: false,
    });
    if (!checkExist) {
      throw new Error("Category not Found");
    }
    const expiry = new Date(expiryDate);
    const now = new Date();
    if (expiry <= now) {
      throw new Error("Expiry date must be a future date");
    }

    const giftCardData = await GiftCardModel.create(payload);
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
    });
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

    if (promoType === "PRIVATE") {
      if (!associatedTo) {
        throw new Error("User id required to create Private PromoCode");
      }

      const checkExist = await UserModel.findOne({
        _id: associatedTo,
        isDeleted: false,
      });
      if (!checkExist) {
        throw new Error("User not Found");
      }
      userName = checkExist.userName;
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
      associatedTo: associatedTo || null,
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

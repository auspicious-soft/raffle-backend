import { Request, Response } from "express";
import { PromoCodeServices } from "src/services/admin/admin-services";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
} from "src/utils/response";

export const addPromoCode = async (req: Request, res: Response) => {
  try {
    const {
      reedemCode,
      expiryDate,
      promoType,
      totalUses,
      discount,
      associatedTo,
    } = req.body;

    if (!reedemCode || !expiryDate || !promoType || !totalUses || !discount) {
      throw new Error("requriedPromoFields");
    }
    if (promoType === "PRIVATE") {
      if (!associatedTo) {
        throw new Error("User id required to create Private PromoCode");
      }
    }

    const response = await PromoCodeServices.addPromoCode({
      reedemCode,
      expiryDate,
      promoType,
      totalUses,
      discount,
      associatedTo,
    });
    return CREATED(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getAllPromoCodes = async (req: Request, res: Response) => {
  try {
    const { type, page, limit } = req.query;
    const response = await PromoCodeServices.getPromoCodes({
      page: page ? page : "1",
      limit: limit ? limit : "10",
      type: type ? (type as string) : undefined,
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const deletePromoCode = async (req: Request, res: Response) => {
  try {
    const { id: promoId } = req.params;
    if (!promoId) {
      throw new Error("Promo Id is required");
    }
    const response = await PromoCodeServices.deletePromoCode({
      promoId,
    });
    const messageKey = ["success", "promoDeleted"].join("|");
    return OK(res, response, messageKey);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

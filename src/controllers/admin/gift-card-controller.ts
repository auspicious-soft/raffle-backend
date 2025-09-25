import { Request,  Response } from "express";
import { GiftCardServices } from "src/services/admin/admin-services";
import {
  BADREQUEST,
  OK,
  CREATED,
  INTERNAL_SERVER_ERROR,
} from "src/utils/response";

// Gift-Card Category Controller
export const addCategory = async (req: Request, res: Response) => {
  try {
    const { companyName, price } = req.body;
    if (!companyName || !price) {
      throw new Error("Company Name and price is Required");
    }
    const response = await GiftCardServices.addCategory({
      companyName,
      price,
    });
    return CREATED(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const { page, limit } = req.query;

    const response = await GiftCardServices.getAllCategories({
      page: page ? page : "1",
      limit: limit ? limit : "20",
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id: categoryId } = req.params;
    if (!categoryId) {
      throw new Error("Category Id is Requried");
    }
    const response = await GiftCardServices.deleteCategory({
      categoryId,
    });
    const messageKey = ["success", "categoryDeleted"].join("|");
    return OK(res, response, messageKey);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

// Gift Card Controller
export const addGiftCard = async (req: Request, res: Response) => {
  try {
    const { categoryId, price, redemptionCode, expiryDate } = req.body;
    if (!categoryId || !price || !redemptionCode || !expiryDate) {
      throw new Error(
        "categoryId, price, ReedemCode and Expiry Date is Required"
      );
    }
    const response = await GiftCardServices.addGiftCard({
      categoryId,
      price,
      redemptionCode,
      expiryDate,
    });
    return CREATED(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getGiftCards = async (req: Request, res: Response) => {
  try {
    const { categoryId, page, limit, search, status } = req.query;
    const response = await GiftCardServices.getGiftCards({
      categoryId,
      page: page ? page : "1",
      limit: limit ? limit : "10",
      search: search ? search : "",
      status: status ? status : "",
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const importGiftCardsCSV = async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.body;
    if (!categoryId) {
      return BADREQUEST(res, "Category Id is required");
    }

    if (!req.file) {
      return BADREQUEST(res, "CSV file is required");
    }

    const buffer = req.file.buffer;

    const result = await GiftCardServices.importGiftCardsCSV(buffer, categoryId);

    return OK(res, result);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};
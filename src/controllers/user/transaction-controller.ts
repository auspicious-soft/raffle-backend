import { Request, Response } from "express";
import {
  PromoServices,
  transactionService,
} from "src/services/user/user-services";
import { OK, BADREQUEST, INTERNAL_SERVER_ERROR } from "src/utils/response";

export const applyPromoCode = async (req: Request, res: Response) => {
  try {
    const { promoCode, amount } = req.body;
    const userData = req.user as any;
    if (!amount) throw new Error("Total Amount is requried");
    const response = await PromoServices.applyPromo({
      promoCode,
      cartTotal: amount,
      userId: userData._id,
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { amount, currency = "usd", promoCode } = req.body;

    const response = await transactionService.createTransaction({
      userId: userData._id,
      currency,
      amount,
      promoCodeId: promoCode || undefined,
    });

    return OK(res, {
      message: "Checkout session created successfully",
      ...response,
    });
  } catch (err: any) {
    console.error("Error creating transaction:", err);
    return BADREQUEST(res, err.message || "Failed to create transaction");
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  try {
    const response = await transactionService.handleWebhook(req.body, sig);
    return OK(res, response || { message: "Webhook processed" });
  } catch (err: any) {
    console.error("Webhook error:", err);
    if (err.message) return BADREQUEST(res, err.message);
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getAllTransaction = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { page, limit } = req.query;

    if (!userData) throw new Error("No user Found");

    const response = await transactionService.getTransaction({
      userId: userData._id,
      page: page || "1",
      limit: limit || "10",
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};


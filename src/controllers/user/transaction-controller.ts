import { Request, Response } from "express";
import stripe from "src/config/stripe";
import { transactionService } from "src/services/user/user-services";
import { OK, BADREQUEST, INTERNAL_SERVER_ERROR } from "src/utils/response";
import Stripe from "stripe";

export const createTransaction = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { raffleIds, promoCode, amount } = req.body;

    if (!raffleIds || !raffleIds.length || !amount) {
      throw new Error("RaffleIds and amount are required");
    }

    if (!Array.isArray(raffleIds) || raffleIds.length === 0) {
      return BADREQUEST(res, "raffleIds must be a non-empty array");
    }

    const response = await transactionService.createTransaction({
      userId: userData._id,
      raffleIds,
      promoCode: promoCode || undefined,
      amount:amount
    });

    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) return BADREQUEST(res, err.message);
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body, 
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    const response = await transactionService.handleWebhook(event); 
    return OK(res, response || { message: "Webhook processed" });
  } catch (err: any) {
    console.error("Webhook error:", err);
    if (err.message) return BADREQUEST(res, err.message);
    return INTERNAL_SERVER_ERROR(res);
  }
};

import { Request, Response } from "express";
import { CartModel } from "src/models/user/cart-schema";
import { UserRaffleModel } from "src/models/user/user-raffle-schema";
import { RaffleServices } from "src/services/admin/admin-services";
import { raffleServices } from "src/services/user/user-services";
import { BADREQUEST, INTERNAL_SERVER_ERROR, OK } from "src/utils/response";

export const activeRaffles = async (req: Request, res: Response) => {
  try {
    const { type, page, limit } = req.query;
    const userData = req.user as any;

    const response = await raffleServices.getActiveRaffle({
      type: type ? type : "",
      page: page ? page : "1",
      limit: limit ? limit : "10",
    });
    const purchasedRaffles = await UserRaffleModel.find({
      userId: userData._id,
      status: "ACTIVE",
    }).lean();
    const purchasedIds = purchasedRaffles?.map((r) => r.raffleId.toString());
    const rafflesWithPurchaseInfo = response.data.map((raffle: any) => ({
      ...raffle,
      isPurchased: purchasedIds.includes(raffle._id.toString()),
    }));

    return OK(res, {
      ...response,
      data: rafflesWithPurchaseInfo,
    });
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getSingleRaffle = async (req: Request, res: Response) => {
  try {
    const { id: raffleId } = req.params;
    const userData = req.user as any;
    if (!raffleId) {
      throw new Error("Raffle id is Required");
    }
    const response = await RaffleServices.getRaffleById({
      raffleId,
    });
    const purchased = await UserRaffleModel.exists({
      userId: userData._id,
      raffleId,
      status: "ACTIVE",
    });
    const raffleWithPurchaseInfo = {
      ...response,
      isPurchased: !!purchased,
    };
    return OK(res, raffleWithPurchaseInfo);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const buyRaffle = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { raffleId } = req.body;

    if (!raffleId) {
      throw new Error("Raffle Id is required");
    }

    const response = await raffleServices.buyRaffle({
      userId: userData._id,
      raffleId,
    });

    return OK(res, response);
  } catch (err: any) {
    if (err.message) return BADREQUEST(res, err.message);
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const withdrawRaffle = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { raffleId } = req.body;

    if (!raffleId) return BADREQUEST(res, "raffleId is required");

    const response = await raffleServices.withdrawRaffle({
      userId: userData._id,
      raffleId,
    });

    return OK(res, response);
  } catch (err: any) {
    if (err.message) return BADREQUEST(res, err.message);
    return INTERNAL_SERVER_ERROR(res);
  }
};

import { Request, Response } from "express";
import { CartModel } from "src/models/user/cart-schema";
import { RaffleServices } from "src/services/admin/admin-services";
import { raffleServices } from "src/services/user/user-services";
import { BADREQUEST, INTERNAL_SERVER_ERROR, OK } from "src/utils/response";


export const activeRaffles = async (req:Request, res:Response) =>{
 try {
    const { type, page, limit } = req.query;
    const userData = req.user as any;

    const response = await raffleServices.getActiveRaffle({
      type: type ? type : "",
      page: page ? page : "1",
      limit: limit ? limit : "10",
   
    });
    const cart = await CartModel.findOne({ userId: userData._id }).lean();
    const cartItemIds = cart?.items?.map((item: any) => item.toString()) || [];
    const rafflesWithCartInfo = response.data.map((raffle: any) => ({
      ...raffle,
      isAddedInCart: cartItemIds.includes(raffle._id.toString()),
    }));

    return OK(res, {
      ...response,
      data: rafflesWithCartInfo,
    });
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
}

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
   const cart = await CartModel.findOne({ userId: userData._id }).lean();
    const cartItemIds = cart?.items?.map((item: any) => item.toString()) || [];

    const raffleWithCartInfo = {
      ...response,
      isAddedInCart: cartItemIds.includes(response._id.toString()),
    };

    return OK(res, raffleWithCartInfo);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

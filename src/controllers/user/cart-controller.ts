import { Request, Response } from "express";
import { RaffleModel } from "src/models/admin/raffle-schema";
import { cartServices, PromoServices } from "src/services/user/user-services";
import { BADREQUEST, INTERNAL_SERVER_ERROR, OK } from "src/utils/response";

export const addToCart = async (req: Request, res: Response) => {
  try {
    const { id: raffleId } = req.body;
    const userData = req.user as any;
    if (!raffleId) {
      throw new Error("Raffle id requried");
    }
    const response = await cartServices.addToCart({
      raffleId,
      userId: userData._id,
    });
     const io = req.app.get("io");
    const updatedRaffle = await RaffleModel.findById(raffleId).lean();
    if (updatedRaffle) {
      io.emit("raffle:update", {
        raffleId,
        bookedSlots: updatedRaffle.bookedSlots,
        totalSlots: updatedRaffle.totalSlots,
      });
    }
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const { id: raffleId } = req.body;
    const userData = req.user as any;
    if (!raffleId) {
      throw new Error("Raffle id requried");
    }
    const response = await cartServices.removeFromCart({
      raffleId,
      userId: userData._id,
    });
     const io = req.app.get("io");
    const updatedRaffle = await RaffleModel.findById(raffleId).lean();
    if (updatedRaffle) {
      io.emit("raffle:update", {
        raffleId,
        bookedSlots: updatedRaffle.bookedSlots,
        totalSlots: updatedRaffle.totalSlots,
      });
    }
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getCartItems = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const response = await cartServices.allCartItems({ userId: userData._id });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};



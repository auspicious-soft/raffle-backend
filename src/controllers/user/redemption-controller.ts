import { Request, Response } from "express";
import { ladderServices } from "src/services/user/user-services";
import { BADREQUEST, INTERNAL_SERVER_ERROR, OK } from "src/utils/response";

export const getReedemLadder = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;

    const response = await ladderServices.getLadder({
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

export const getRedemptionCategories = async (req: Request, res: Response) => {
  try {
    const { points } = req.query;
    const userData = req.user as any;
    if (!points) {
      throw new Error("Points requried.");
    }
    const response = await ladderServices.getLadderCategories({
      userId: userData._id,
      points: Number(points),
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const reedemReward = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { categoryId, ladderId } = req.query;
    if (!categoryId ) {
      throw new Error("Category id is requried");
    }
     if (!ladderId ) {
      throw new Error("Ladder id is requried");
    }
    const response = await ladderServices.reedemReward({
      categoryId,
      ladderId,
      userId: userData._id,
      userName: userData.userName,
      userEmail: userData.email,
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

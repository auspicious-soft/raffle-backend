import { Request, Response } from "express";
import { RedempLadder } from "src/services/admin/admin-services";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
} from "src/utils/response";

export const createRedemptionLadder = async (req: Request, res: Response) => {
  try {
    const { name, requiredPoints, categories } = req.body;
    if (!name || !requiredPoints || !categories) {
      throw new Error("Name, Points and atleast one category requried");
    }
    const response = await RedempLadder.createLadder({
      name,
      requiredPoints,
      categories,
    });
    return CREATED(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getAllLadders = async (req: Request, res: Response) => {
  try {
    const response = await RedempLadder.getAllLadders({});
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getSingleLadder = async (req: Request, res: Response) => {
  try {
    const { id: ladderId } = req.params;
    if (!ladderId) {
      throw new Error("Ladder id is requried");
    }
    const response = await RedempLadder.getSingleLadder({ ladderId });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const deleteLadder = async (req: Request, res: Response) => {
  try {
    const { id: ladderId } = req.params;
    if (!ladderId) {
      throw new Error("Ladder id is requried");
    }
    const response = await RedempLadder.deleteLadder({ ladderId });
    const messageKey = ["success", "ladderDeleted"].join("|");
    return OK(res, {}, messageKey);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const updateLadder = async (req: Request, res: Response) => {
  try {
    const {id:ladderId} = req.params
    const { name, requiredPoints, categories } = req.body;
    if (!ladderId) {
      throw new Error("Ladder id is requried");
    }
    const reponse = await RedempLadder.updateLadder({
      ladderId,
      name,
      requiredPoints,
      categories,
    });
    return OK(res, reponse);
  } catch (err: any) {
    if (err.message) return BADREQUEST(res, err.message);
    return INTERNAL_SERVER_ERROR(res);
  }
};

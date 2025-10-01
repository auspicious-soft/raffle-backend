import { Request, response, Response } from "express";
import { RaffleServices } from "src/services/admin/admin-services";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
} from "src/utils/response";

export const createRaffle = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      price,
      totalSlots,
      startDate,
      endDate,
      rewards,
      winnerId,
    } = req.body;
    if (
      !title ||
      !description ||
      !price ||
      !totalSlots ||
      !startDate ||
      !endDate
    ) {
      throw new Error("missingRaffleFields");
    }
    if (!rewards || !Array.isArray(rewards) || rewards.length === 0) {
      throw new Error("Reward requried to create a raffle");
    }
    const response = await RaffleServices.createRaffle({
      title,
      description,
      price,
      totalSlots,
      startDate,
      endDate,
      rewards,
      winnerId,
    });
    return CREATED(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getAllRaffles = async (req: Request, res: Response) => {
  try {
    const { type, page, limit, status, search } = req.query;

    const response = await RaffleServices.getRaffles({
      type: type ? type : "",
      page: page ? page : "1",
      limit: limit ? limit : "10",
      status: status ? status : "",
      search: search ? search : "",
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getRaffleById = async (req: Request, res: Response) => {
  try {
    const { id: raffleId } = req.params;
    if (!raffleId) {
      throw new Error("Raffle id is Required");
    }
    const response = await RaffleServices.getRaffleById({
      raffleId,
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const deleteRaffle = async (req: Request, res: Response) => {
  try {
    const { id: raffleId } = req.params;
    if (!raffleId) {
      throw new Error("Raffle id is Required");
    }
    const response = await RaffleServices.deleteRaffle({
      raffleId,
    });
    const messageKey = ["success", "raffleDeleted"].join("|");
    return OK(res, response, messageKey);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const updateRaffle = async (req: Request, res: Response) => {
  try {
    const {
      raffleId,
      price,
      title,
      description,
      startDate,
      endDate,
      rewards,
      status,
    } = req.body;
    if (!raffleId) {
      throw new Error("Raffle id is Required");
    }
    const response = await RaffleServices.updateRaffle({
      raffleId,
      price,
      title,
      description,
      startDate,
      endDate,
      rewards,
      status,
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

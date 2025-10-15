import { Request, response, Response } from "express";
import { uploadImages } from "src/config/multer";
import { uploadFileToS3 } from "src/config/s3";
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

export const uploadRewardImages = (req: Request, res: Response) => {
  uploadImages.array("images", 10)(req, res, async (err: any) => {
    if (err) {
      return BADREQUEST(res, err.message || "Error uploading files");
    }

    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return BADREQUEST(res, "No files provided");
      }
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const { key } = await uploadFileToS3(
            file.buffer,
            file.originalname,
            file.mimetype,
            req.user._id.toString(),
            "reward"
          );

          return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        })
      );
      return OK(res, { urls: uploadedFiles });
    } catch (error: any) {
      console.error("S3 Upload Error:", error);
      return INTERNAL_SERVER_ERROR(res, "Failed to upload files");
    }
  });
};
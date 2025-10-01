import { Request, Response } from "express";
import { RaffleServices } from "src/services/admin/admin-services";
import { raffleServices } from "src/services/user/user-services";
import { BADREQUEST, INTERNAL_SERVER_ERROR, OK } from "src/utils/response";


export const activeRaffles = async (req:Request, res:Response) =>{
 try {
    const { type, page, limit } = req.query;

    const response = await raffleServices.getActiveRaffle({
      type: type ? type : "",
      page: page ? page : "1",
      limit: limit ? limit : "10",
   
    });
    return OK(res, response || {});
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

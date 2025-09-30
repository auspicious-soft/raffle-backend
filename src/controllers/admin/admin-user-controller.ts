import { Request, Response } from "express";
import { UserServices } from "src/services/admin/admin-services";
import { BADREQUEST, INTERNAL_SERVER_ERROR, OK } from "src/utils/response";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { status, page, limit, sort, search } = req.query;
    const response = await UserServices.getUsers({
      status: status ? status : "",
      page: page ? page : 1,
      limit: limit ? limit : 10,
      sort: sort ? sort : "",
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

export const getSingleUser = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.params;
    if (!userId) {
      throw new Error("User id is Required");
    }
    const response = await UserServices.getSingleUser({
      userId,
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const blockUnblockUser = async (req: Request, res: Response) => {
  try {
    const { status, userId } = req.body;
    if (!userId || !status) {
      throw new Error("userId and status requried");
    }
  } catch (error) {}
};

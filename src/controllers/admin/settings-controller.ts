import { Request, Response } from "express";
import { UserModel } from "src/models/user/user-schema";
import { generalInformation } from "src/services/admin/admin-services";
import { hashPassword, verifyPassword } from "src/utils/helper";
import { BADREQUEST, INTERNAL_SERVER_ERROR, OK } from "src/utils/response";

export const getAdminData = async (req: Request, res: Response) => {
  try {
    const adminId = (req.user as any)?._id;
    if (!adminId) {
      return BADREQUEST(res, "invalidToken");
    }
    const adminData = await UserModel.findById(adminId).select(
      "userName email image role "
    );
    return OK(res, adminData || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const updateAdminData = async (req: Request, res: Response) => {
  const adminId = (req.user as any)?._id;
  if (!adminId) {
    return BADREQUEST(res, "invalidToken");
  }
  try {
    const { oldPassword, password, ...restData } = req.body;
    const checkExist = await UserModel.findById(adminId);
    if (!checkExist) {
      throw new Error("notFound");
    }
    if (restData.email === "" || restData.userName === "") {
      throw new Error("email and userName can't be empty");
    }
    if (password || oldPassword) {
      if (!password || !oldPassword) {
        throw new Error("old and New password both are requried");
      }
      const passwordStatus = await verifyPassword(
        oldPassword,
        checkExist?.password || ""
      );
      if (!passwordStatus) {
        throw new Error("invalidOldPassword");
      }
      restData.password = await hashPassword(password);
    }

    if (Object.keys(restData).length > 0) {
      await UserModel.findByIdAndUpdate(adminId, { $set: restData });
    }

    return OK(res, restData);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const revenueOverview = async (req: Request, res: Response) => {
  try {
    const page = req.query.page || 1;
    const limit = req.query.limit || 10;
 
    const response = await generalInformation.revenue({
      page,
      limit,
    });
 
    return OK(res, response);
  } catch (err: any) {
    if (err.message) return BADREQUEST(res, err.message);
    return INTERNAL_SERVER_ERROR(res);
  }
};
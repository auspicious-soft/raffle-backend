import { Request, Response } from "express";
import { UserModel } from "src/models/user/user-schema";
import { generalInformation, getDashboardDataService } from "src/services/admin/admin-services";
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

export const winnerAndFullfillment = async (req: Request, res: Response) => {
  try {
    const { page, limit, search } = req.query;
    const response = await generalInformation.winnerAndFullfillment({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      search: search ? String(search) : "",
    });

    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) return BADREQUEST(res, err.message);
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const addLink = async (req: Request, res: Response) => {
  try {
    const { id, link } = req.body;
    if (!id || !link) {
      throw new Error("Both 'id' and 'link' are required.");
    }
    const response = await generalInformation.addTrackingLink({ id, link });
    return OK(res, response);
  } catch (error: any) {
    if (error.message) return BADREQUEST(res, error.message);
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const changeRewardStatus = async (req:Request, res:Response) =>{
  try {
    const {id, status} = req.body;
      if (!id || !status) {
      throw new Error("Both 'id' and 'status' are required.");
    }
  const response = await generalInformation.updateDeliveryStatus({ id, status });
    return OK(res, response);
  } catch (error: any) {
    if (error.message) return BADREQUEST(res, error.message);
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const getDashboardDataController = async (req: Request, res: Response) => {
  try {
    const data = await getDashboardDataService();
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
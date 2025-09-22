// import { NextFunction, Request, Response } from "express";
// import  { JwtPayload } from "jsonwebtoken";
// import { configDotenv } from "dotenv";
// import { decode } from "next-auth/jwt";
// import {  UNAUTHORIZED } from "src/utils/response";
// import path from "path";
// import { AdminModel } from "src/models/admin/admin-schema";

// configDotenv();
// declare global {
//   namespace Express {
//     interface Request {
//       user?: string | JwtPayload;
//     }
//   }
// }


// export const checkAdminAuth = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const token = req.headers.authorization?.split(" ")[1];
//     if (!token) {
//       return UNAUTHORIZED(res, "invalidToken");
//     }

//     const decoded = await decode({
//       secret: process.env.AUTH_SECRET as string,
//       token,
//       salt: process.env.JWT_SALT as string,
//     });

//     const adminData = await AdminModel.findById((decoded as any).id).lean();

//     if (!decoded)
//       return UNAUTHORIZED(res, "invalidToken");

//     if (adminData?.isBlocked) {
//       return UNAUTHORIZED(res, "adminBlocked");
//     }

//     req.user = {
//       ...adminData,
//     };

//     next();
//   } catch (error) {
//     return UNAUTHORIZED(res, "invalidToken");
//   }
// };

import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { UNAUTHORIZED } from "src/utils/response";
import { UserModel } from "src/models/user/user-schema";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const checkAuth =
  (roles: ("USER" | "ADMIN")[] = []) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) return UNAUTHORIZED(res, "invalidToken");

      const decoded = jwt.verify(
        token,
        process.env.AUTH_SECRET as string
      ) as JwtPayload;

      if (!decoded || !decoded.id) return UNAUTHORIZED(res, "invalidToken");

      const user = await UserModel.findById(decoded.id).lean();
      if (!user) return UNAUTHORIZED(res, "userNotFound");
      if (user.isBlocked) return UNAUTHORIZED(res, "userBlocked");

      // Check roles
      if (roles.length && !roles.includes(user.role)) {
        return UNAUTHORIZED(res, "forbidden");
      }

      req.user = user;
      next();
    } catch (err) {
      return UNAUTHORIZED(res, "invalidToken");
    }
  };

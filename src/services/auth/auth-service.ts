import { configDotenv } from "dotenv";
import { OtpModel } from "src/models/system/otp-schema";
import { IUser, UserModel } from "src/models/user/user-schema";
import {
  generateAndSendOtp,
  generateToken,
  hashPassword,
  verifyPassword,
} from "src/utils/helper";
import jwt from "jsonwebtoken";

configDotenv();

export const authServices = {

  async login(payload: any) {
    const checkExist = await UserModel.findOne({
      email: payload.email,
      authType: "EMAIL",
      isBlocked: false,
      isDeleted: false,
    }).lean();

    const checkEmailVerified = await UserModel.findOne({
      email: payload.email,
      isBlocked: false,
      isDeleted: false,
      isVerifiedEmail: true,
    });

    if (!checkExist) {
      throw new Error("userNotFound");
    }

    if (!checkEmailVerified) {
      throw new Error("Email not verified.");
    }

    const passwordStatus = await verifyPassword(
      payload.password,
      checkExist?.password || ""
    );
    if (!passwordStatus) {
      throw new Error("invalidPassword");
    }
    delete checkExist.password;
    return checkExist;
  },

  async forgetPassword(payload: any) {
    const checkExist = await UserModel.findOne({
          email: payload.email,
          isVerifiedEmail: true,
          authType: "EMAIL",
        });
    if (!checkExist) {
      throw new Error("userNotFound");
    }
    await generateAndSendOtp(
      payload.email,
      "FORGOT_PASSWORD",
      "EMAIL",
       "USER"
    );
    return {};
  },

  async verifyForgetPasswordOTP(payload: any) {
    const checkOtp = await OtpModel.findOne({
      $or: [{ email: payload.method }, { phone: payload.method }],
      code: payload.otp,
      userType: payload.userType,
    });
    if (!checkOtp) {
      throw new Error("invalidOtp");
    }
    const tokenPayload = checkOtp.toObject();
    const token = jwt.sign(tokenPayload, process.env.AUTH_SECRET as string, {
      expiresIn: "5m",
    });

    return { token };
  },

  async resetPassword(payload: any) {
    const data = jwt.verify(
      payload.token,
      process.env.AUTH_SECRET as string
    ) as any;
    if (!data.email && !data.phone) {
      throw new Error("Missing Required Fields");
    }
    const checkOtp = await OtpModel.findOne({
      $or: [{ email: data?.email }, { phone: data?.phone }],
      code: data.code,
      purpose: "FORGOT_PASSWORD",
      userType: "USER",
    });
    if (!checkOtp) {
      throw new Error("Error");
    }
    const password = await hashPassword(payload.password);

      await UserModel.updateOne({ email: data.email }, { $set: { password } });

    return {};
  },

  async registerUser(payload: any) {
    const checkExist = await UserModel.findOne({
      email: payload.email,
      isDeleted: false,
    });
    if (checkExist) {
      throw new Error("emaiExist");
    }

    payload.password = await hashPassword(payload.password);
    const userData = await UserModel.create(payload);
    const user = userData.toObject();
    delete user.password;

    if (payload.authType === "EMAIL") {
      await generateAndSendOtp(payload.email, "SIGNUP", "EMAIL", "USER");
    }
    return user;
  },

  async verifyOtp(payload: any) {
    const checkExist = await OtpModel.findOne({
      $or: [{ email: payload.method }, { phone: payload.method }],
      code: payload.code,
      userType: payload.userType,
    });
    if (!checkExist) {
      throw new Error("invalidOtp");
    }
    const verificationMode = checkExist.email ? "email" : "phone";
    const verificationKey = checkExist.email
      ? "isVerifiedEmail"
      : "isVerifiedPhone";

    const userData = await UserModel.findOneAndUpdate(
      { [verificationMode]: payload.method },
      { $set: { [verificationKey]: true } },
      { new: true }
    );
    if (!userData) {
      throw new Error("userNotFound");
    }

    const token = await generateToken(userData);
    const user = userData.toObject();
    delete user.password;

    return { ...user, token };
  },

  async resendOtp(payload: any) {
    if (payload.userType == "USER") {
      const checkExist = await UserModel.findOne({
        $or: [{ email: payload.value }, { phone: payload.value }],
        isVerifiedEmail: false,
        isVerifiedPhone: false,
      });

      if (!checkExist) {
        throw new Error("registerAgain");
      }
    }

    await generateAndSendOtp(
      payload.value,
      payload.purpose,
      "EMAIL",
      payload.userType
    );
    return {};
  },
};

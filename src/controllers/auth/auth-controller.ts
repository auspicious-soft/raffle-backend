import { Request, Response } from "express";
import { authServices } from "src/services/auth/auth-service";
import { generateToken } from "src/utils/helper";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED,
} from "src/utils/response";

//
export const Login = async (req:Request, res:Response) =>{
 try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new Error("Email and Password is Required.");
    }

    const response = await authServices.login({
      email,
      password,
      authType: "EMAIL",
    });
        const token = await generateToken(response);

    return OK(res, {...response, token} );
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
}

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, userName, confirmPassword } = req.body;
    if (!email || !password || !userName || !confirmPassword) {
      throw new Error("requriedFieldsUser");
    }
    if (password !== confirmPassword) {
      throw new Error("noPasswordMatch");
    }
    const response = await authServices.registerUser({
      email,
      password,
      userName,
      authType:"EMAIL",
    });
    return CREATED(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { code, method } = req.body;
    if (!method) {
      throw new Error("Email Required");
    }
    const response = await authServices.verifyOtp({
      code,
      method,
      userType: "USER",
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { value } = req.body;
    if (!value) {
      throw new Error("Method required is required");
    }
    const response = await authServices.resendOtp({
      purpose:"RESEND",
      value,
      userType: "USER",
    });
    return OK(res, response || {}, "otpResent");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const ForgetPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new Error("Email Requried");
    }
    const response = await authServices.forgetPassword({
      email,
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const VerifyResetPasswordOtp = async (
  req: Request,
  res: Response
) => {
  try {
    const { otp, method } = req.body;
    if (!otp) {
      throw new Error("invalidOtp");
    }
    const response = await authServices.verifyForgetPasswordOTP({
      otp,
      method,
      userType: "USER",
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};

export const ResetPassword = async (req:Request, res:Response) => {
 try {
    const { password, token } = req.body;
    if (!password) {
      throw new Error("Pasword is Required");
    }
    if (!token) {
      throw new Error("unauthorized");
    }
    const response = await authServices.resetPassword({
      password,
      token,
    });
    return OK(res, response || {});
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
}


export const checkUserNameAvailability = async (req: Request, res: Response) => {
  try {
    const { userName } = req.body;
    if (!userName) {
      throw new Error("userNameRequired");
    }

    const response = await authServices.checkUserNameAvailability({ userName });
    return OK(res, response);
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message);
    }
    return INTERNAL_SERVER_ERROR(res);
  }
};



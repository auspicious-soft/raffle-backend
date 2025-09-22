import { Response } from 'express';
import { customMessages, messages } from './messages';

type Data = Record<string, any> | null;
const resolveMessage = (keyOrMessage: string): string => {

   if (keyOrMessage.includes("|")) {
    return keyOrMessage
      .split("|")
      .map(k =>
        messages[k as keyof typeof messages] ||
        customMessages[k as keyof typeof customMessages] ||
        k
      )
      .join(". "); // join with dot+space
  }
  if (messages[keyOrMessage as keyof typeof messages]) {
    return messages[keyOrMessage as keyof typeof messages];
  }
  if (customMessages[keyOrMessage as keyof typeof customMessages]) {
    return customMessages[keyOrMessage as keyof typeof customMessages];
  }
  return keyOrMessage;
};

export const OK = (
  res: Response,
  data: Data = null,
  message: string = "success",
  statusCode = 200
) => {
  return res.status(statusCode).json({
    success: true,
    message: resolveMessage(message),
    data,
  });
};

export const CREATED = (
  res: Response,
  data: Data = null,
  message: string = "created"
) => {
  return res.status(201).json({
    success: true,
    message: resolveMessage(message),
    data,
  });
};

export const BADREQUEST = (res: Response, message: string = "badRequest") => {
  console.error("****ERROR-BAD-REQUEST**** :->", resolveMessage(message));
  return res.status(400).json({
    success: false,
    message: resolveMessage(message),
  });
};

export const UNAUTHORIZED = (res: Response, message: string = "unauthorized") => {
  return res.status(401).json({
    success: false,
    message: resolveMessage(message),
  });
};

export const FORBIDDEN = (res: Response, message: string = "forbidden") => {
  return res.status(403).json({
    success: false,
    message: resolveMessage(message),
  });
};

export const NOT_FOUND = (res: Response, message: string = "notFound") => {
  return res.status(404).json({
    success: false,
    message: resolveMessage(message),
  });
};

export const CONFLICT = (res: Response, message: string = "conflict") => {
  return res.status(409).json({
    success: false,
    message: resolveMessage(message),
  });
};

export const INVALID = (res: Response, errors: any, message: string = "validationError") => {
  return res.status(422).json({
    success: false,
    message: resolveMessage(message),
    errors,
  });
};

export const INTERNAL_SERVER_ERROR = (
  res: Response,
  message: string = "error"
) => {
  return res.status(500).json({
    success: false,
    message: resolveMessage(message),
  });
};
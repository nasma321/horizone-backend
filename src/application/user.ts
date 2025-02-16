import { Request, Response, NextFunction } from "express";

import User from "../infrastructure/schemas/User";
import ValidationError from "../domain/errors/validation-error";

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.body;

    if (!user.name || !user.email) {
      throw new ValidationError("Invalid user data");
    }

    await User.create({
      name: user.name,
      email: user.email,
    });

    res.status(201).send();
    return;
  } catch (error) {
    next(error);
  }
};
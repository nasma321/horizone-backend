import { Request, Response } from "express";
import User from "../infrastructure/schemas/User";

export const createUser = async (req: Request, res: Response) => {
  const user = req.body;

  if (!user.name || !user.email) {
    res.status(400).send();
    return;
  }

  await User.create({
    name: user.name,
    email: user.email,
  });

  res.status(201).send();
  return;
};


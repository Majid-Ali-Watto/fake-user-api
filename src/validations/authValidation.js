import Joi from "joi";
import { createUserSchema } from "./userValidation.js";

const password = Joi.string().min(6).max(100);

// Same profile rules as creating a user, but only the identity fields are required.
export const registerSchema = createUserSchema
  .fork(["phone", "age", "gender", "country", "city"], (field) => field.optional())
  .keys({ password: password.required() });

export const loginSchema = Joi.object({
  email: Joi.string().email(),
  username: Joi.string(),
  password: Joi.string().required(),
}).or("email", "username");

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

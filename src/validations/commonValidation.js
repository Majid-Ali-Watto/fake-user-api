import Joi from "joi";
const userId = Joi.string().uuid({ version: "uuidv4" });
export const uuidFlexibleSchema = Joi.object({
  userId: userId.required(),
});
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  userId, // optional: GET /?userId=<id> returns that single user
});

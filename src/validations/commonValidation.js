import Joi from "joi";
export const uuidFlexibleSchema = Joi.object({
  userId: Joi.string().uuid({ version: "uuidv4" }).required(),
});
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

// validations/userValidation.js
import Joi from "joi";

export const createUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  phone: Joi.string()
    .pattern(/^[0-9+\-() ]{7,20}$/)
    .required(),
  age: Joi.number().integer().min(1).max(120).required(),
  gender: Joi.string().valid("male", "female", "other").required(),
  country: Joi.string().min(2).max(50).required(),
  city: Joi.string().min(1).max(50).required(),
});

export const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  email: Joi.string().email(),
  username: Joi.string().alphanum().min(3).max(30),
  phone: Joi.string().pattern(/^[0-9+\-() ]{7,20}$/),
  age: Joi.number().integer().min(1).max(120),
  gender: Joi.string().valid("male", "female", "other"),
  country: Joi.string().min(2).max(50),
  city: Joi.string().min(1).max(50),
}).min(1); // at least one field required

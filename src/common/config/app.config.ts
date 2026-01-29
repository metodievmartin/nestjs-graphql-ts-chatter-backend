import Joi from 'joi';

export const envVarValidationSchema = Joi.object({
  PORT: Joi.number().default(8080),
  MONGODB_URI: Joi.string().required(),
  DB_NAME: Joi.string().required(),
});
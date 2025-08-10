// middlewares/validate.js
export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true, // remove extra fields
    });

    if (error) {
      return res.status(400).json({
        status: "FAILED",
        errors: error.details.map((err) => err.message),
      });
    }

    // ✅ Put validated & default-filled data back into req
    req[source] = value;

    next();
  };

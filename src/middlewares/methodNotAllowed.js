// Answers any method not handled earlier on a known path with 405 + Allow.
export const methodNotAllowed = (allow) => (req, res) => {
  res
    .set("Allow", allow)
    .status(405)
    .json({
      status: "FAILED",
      data: { error: `Method ${req.method} not allowed on ${req.originalUrl.split("?")[0]}. Allowed: ${allow}` },
    });
};

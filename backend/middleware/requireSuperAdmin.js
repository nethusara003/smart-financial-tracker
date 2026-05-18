export default function requireSuperAdmin(req, res, next) {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({
      message: "Access denied. Super admin only."
    });
  }
  next();
}

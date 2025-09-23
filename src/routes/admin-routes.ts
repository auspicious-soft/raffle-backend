import { Router } from "express";
import { getAdminData, updateAdminData } from "src/controllers/admin/settings-controller";

// Code
const router = Router();
router.route("/admin-data").get(getAdminData).patch(updateAdminData);


export { router };

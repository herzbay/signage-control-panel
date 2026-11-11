import express = require("express");
import deviceController = require("../controllers/device.controller");
import authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware.authenticateAdmin);

router.get("/", deviceController.getDevices);
router.get("/:id", deviceController.getDeviceById);
router.post("/", deviceController.createDevice);
router.put("/:id", deviceController.updateDevice);
router.delete("/:id", deviceController.deleteDevice);

export = router;
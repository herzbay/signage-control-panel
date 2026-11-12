import express = require("express");
import deviceController = require("../controllers/device.controller");
import deviceContentController = require("../controllers/device-content.controller");
import authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

// Device Client - endpoint publik khusus tampilan perangkat
router.get("/:id/display", deviceContentController.getDeviceDisplay);

// Semua endpoint berikutnya memerlukan autentikasi admin
router.use(authMiddleware.authenticateAdmin);

// Device CRUD
router.get("/", deviceController.getDevices);
router.get("/:id", deviceController.getDeviceById);
router.post("/", deviceController.createDevice);
router.put("/:id", deviceController.updateDevice);
router.delete("/:id", deviceController.deleteDevice);

// Device Content Management
router.get("/:id/contents", deviceContentController.getDeviceContents);
router.post("/:id/contents", deviceContentController.assignContent);
router.put("/:id/contents/:contentId", deviceContentController.updateAssignment);
router.delete("/:id/contents/:contentId", deviceContentController.removeAssignment);

export = router;

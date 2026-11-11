import express = require("express");
import contentController = require("../controllers/content.controller");
import uploadMiddleware = require("../middlewares/upload.middleware");

const router = express.Router();

// Upload must be registered before the dynamic ID routes
router.post(
  "/upload",
  uploadMiddleware.upload.single("file"),
  contentController.uploadContent
);

router.get("/", contentController.getContents);
router.get("/:id/url", contentController.getContentUrl);
router.get("/:id", contentController.getContentById);

router.post("/", contentController.createContent);
router.put("/:id", contentController.updateContent);
router.delete("/:id", contentController.deleteContent);

export = router;

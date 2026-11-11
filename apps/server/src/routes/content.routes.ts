import express = require("express");
import contentController = require("../controllers/content.controller");
import uploadMiddleware = require("../middlewares/upload.middleware");
import authMiddleware = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(authMiddleware.authenticateAdmin);

// Upload content
router.post(
  "/upload",
  uploadMiddleware.upload.single("file"),
  contentController.uploadContent
);

// Retrieve content
router.get("/", contentController.getContents);
router.get("/:id/url", contentController.getContentUrl);
router.get("/:id", contentController.getContentById);

// CRUD content
router.post("/", contentController.createContent);
router.put("/:id", contentController.updateContent);
router.delete("/:id", contentController.deleteContent);

export = router;
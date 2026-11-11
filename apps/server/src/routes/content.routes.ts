import express = require("express");
import contentController = require("../controllers/content.controller");

const router = express.Router();

router.get("/", contentController.getContents);
router.get("/:id", contentController.getContentById);
router.post("/", contentController.createContent);
router.put("/:id", contentController.updateContent);
router.delete("/:id", contentController.deleteContent);

export = router;

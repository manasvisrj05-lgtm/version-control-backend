const express = require("express");

const { createCommit } = require("../controllers/commitController");

const commitRouter = express.Router();

commitRouter.post("/commit/create", createCommit);

module.exports = commitRouter;
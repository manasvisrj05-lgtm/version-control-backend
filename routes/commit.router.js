const express = require("express");

const {
  createCommit,
  getCommitsForRepository
} = require("../controllers/commitController");

const commitRouter = express.Router();

commitRouter.post("/commit/create", createCommit);

commitRouter.get(
  "/commit/repository/:repositoryId",
  getCommitsForRepository
);

module.exports = commitRouter;
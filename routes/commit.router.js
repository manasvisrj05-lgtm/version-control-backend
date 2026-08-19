const express = require("express");

const {
  createCommit,
  getCommitsForRepository,
  getCommitById
} = require("../controllers/commitController");

const commitRouter = express.Router();

commitRouter.post("/commit/create", createCommit);

commitRouter.get(
  "/commit/repository/:repositoryId",
  getCommitsForRepository
);

commitRouter.get(
  "/commit/:commitId",
  getCommitById
);

module.exports = commitRouter;
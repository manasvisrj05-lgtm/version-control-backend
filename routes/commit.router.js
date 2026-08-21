const express = require("express");

const {
  createCommit,
  getCommitsForRepository,
  getCommitById,
  getCommitFiles,
  getCommitFile
} = require("../controllers/commitController");

const commitRouter = express.Router();

// --------------------------------------------------
// CREATE COMMIT
// --------------------------------------------------

commitRouter.post(
  "/commit/create",
  createCommit
);

// --------------------------------------------------
// GET COMMITS FOR REPOSITORY
// --------------------------------------------------

commitRouter.get(
  "/commit/repository/:repositoryId",
  getCommitsForRepository
);

// --------------------------------------------------
// GET FILES FROM SPECIFIC COMMIT
// --------------------------------------------------

commitRouter.get(
  "/commit/:commitId/files",
  getCommitFiles
);

// --------------------------------------------------
// GET FILE FROM SPECIFIC COMMIT
// --------------------------------------------------

commitRouter.get(
  "/commit/:commitId/file",
  getCommitFile
);

// --------------------------------------------------
// GET COMMIT BY ID
// --------------------------------------------------

commitRouter.get(
  "/commit/:commitId",
  getCommitById
);

module.exports = commitRouter;
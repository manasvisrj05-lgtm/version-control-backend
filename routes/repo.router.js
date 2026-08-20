const express = require("express");
const repoController = require("../controllers/repoController");

const repoRouter = express.Router();

repoRouter.post("/repo/create", repoController.createRepository);
repoRouter.get("/repo/all", repoController.getAllRepositories);
repoRouter.get("/repo/starred/:userId",repoController.getStarredRepositories);
repoRouter.get("/repo/:id/files",repoController.getRepositoryFiles);
repoRouter.get("/repo/:id/file", repoController.getRepositoryFile);
repoRouter.get("/repo/:id", repoController.fetchRepositoryById);
repoRouter.get("/repo/name/:name", repoController.fetchRepositoryByName);
repoRouter.get("/repo/user/:userID", repoController.fetchRepositoriesForCurrentUser);
repoRouter.put("/repo/update/:id", repoController.updateRepositoryById);
repoRouter.delete("/repo/delete/:id", repoController.deleteRepositoryById);
repoRouter.patch("/repo/toggle/:id", repoController.toggleVisibilityById);
repoRouter.post("/repo/star", repoController.toggleStarRepository);

console.log("REPO ROUTER LOADED");
module.exports = repoRouter;
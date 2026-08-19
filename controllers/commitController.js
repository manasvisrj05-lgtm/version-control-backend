const mongoose = require("mongoose");
const Commit = require("../models/commitModel");
const Repository = require("../models/repoModel");

async function createCommit(req, res) {
  const { repositoryId, commitId, message, author } = req.body;

  try {
    // Check repository ID
    if (!mongoose.Types.ObjectId.isValid(repositoryId)) {
      return res.status(400).json({
        error: "Invalid Repository ID!"
      });
    }

    // Check author ID
    if (!mongoose.Types.ObjectId.isValid(author)) {
      return res.status(400).json({
        error: "Invalid Author ID!"
      });
    }

    // Check repository exists
    const repository = await Repository.findById(repositoryId);

    if (!repository) {
      return res.status(404).json({
        error: "Repository not found!"
      });
    }

    // Create commit
    const newCommit = new Commit({
      commitId,
      repository: repositoryId,
      message,
      author
    });

    const savedCommit = await newCommit.save();

    // Add commit to repository
    repository.commits.push(savedCommit._id);

    await repository.save();

    res.status(201).json({
      message: "Commit created successfully!",
      commit: savedCommit
    });

  } catch (err) {
    console.error("Error creating commit:", err);

    res.status(500).json({
      error: "Server error"
    });
  }
}

module.exports = {
  createCommit
};
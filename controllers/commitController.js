const Commit = require("../models/commitModel");
const Repository = require("../models/repoModel");

async function createCommit(req, res) {
  const {
    repositoryId,
    commitId,
    message,
    author
  } = req.body;

  try {
    if (!repositoryId || !commitId || !message || !author) {
      return res.status(400).json({
        error: "repositoryId, commitId, message and author are required"
      });
    }

    // 1. Check repository
    const repository = await Repository.findById(repositoryId);

    if (!repository) {
      return res.status(404).json({
        error: "Repository not found"
      });
    }

    // 2. Create commit
    const commit = new Commit({
      commitId,
      repository: repositoryId,
      message,
      author
    });

    // 3. Save commit
    await commit.save();

    // 4. Add commit to repository
    repository.commits.push(commit._id);

    // 5. Save repository
    await repository.save();

    return res.status(201).json({
      message: "Commit created successfully!",
      commit
    });

  } catch (err) {
    console.error("Error creating commit:", err);

    return res.status(500).json({
      error: "Server error"
    });
  }
}

module.exports = {
  createCommit
};
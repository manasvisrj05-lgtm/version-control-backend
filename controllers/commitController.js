const Commit = require("../models/commitModel");

async function createCommit(req, res) {
  const {
    commitId,
    repository,
    message,
    author
  } = req.body;

  try {
    const commit = new Commit({
      commitId,
      repository,
      message,
      author
    });

    const result = await commit.save();

    res.status(201).json({
      message: "Commit created successfully!",
      commit: result
    });

  } catch (err) {
    console.error("Error creating commit:", err);

    res.status(500).json({
      error: "Server error"
    });
  }
}


async function getCommitsForRepository(req, res) {
  const { repositoryId } = req.params;

  try {
    const commits = await Commit.find({
        repository: repositoryId
    })
    .populate("author", "username email")
    .sort({ date: -1 });

    res.status(200).json({
      commits
    });

  } catch (err) {
    console.error("Error fetching commits:", err);

    res.status(500).json({
      error: "Server error"
    });
  }
}


module.exports = {
  createCommit,
  getCommitsForRepository
};
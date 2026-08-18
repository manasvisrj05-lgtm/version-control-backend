const mongoose = require("mongoose");
const Repository = require("../models/repoModel");
const User = require("../models/userModel");
const Issue = require("../models/issueModel");

async function createRepository(req, res) {
  const { owner, name, issues, content, description, visibility } = req.body;
  try {
    if (!name) {
      return res.status(400).json({
        error: "Repository name is required!"
      });
    }
    if (!mongoose.Types.ObjectId.isValid(owner)) {
      return res.status(400).json({
        error: "Invalid User ID!"
      });
    }
    const newRepository = new Repository({
      name,
      description,
      visibility,
      owner,
      content,
      issues,
    });
    const result = await newRepository.save();
    await User.findByIdAndUpdate(
      owner,
      {
        $push: {
          repositories: result._id
        }
      }
    );
    res.status(201).json({
      message: "Repository created!",
      repositoryID: result._id,
    });
  } catch (err) {
    console.error("Error during repository creation:", err);

    res.status(500).json({
      error: "Server error"
    });
  }
}

async function getAllRepositories(req, res) {
  try {
    const repositories = await Repository.find({visibility: true})
      .populate("owner")
      .populate("issues");

    res.json(repositories);
  } catch (err) {
    console.error("Error during fetching repositories : ", err.message);
    res.status(500).send("Server error");
  }
}

async function fetchRepositoryById(req, res) {
  const { id } = req.params;
  try {
    const repository = await Repository.findById(id)
      .populate("owner")
      .populate("issues");
    if (!repository) {
      return res.status(404).json({
        error: "Repository not found!",
      });
    }
    res.status(200).json(repository);
  } catch (err) {
    console.error(
      "Error during fetching repository:",
      err.message
    );
    res.status(500).json({
      error: "Server error",
    });
  }
}
async function fetchRepositoryByName(req, res) {
  const { name } = req.params;
  try {
    const repository = await Repository.find({ name })
      .populate("owner")
      .populate("issues");

    res.json(repository);
  } catch (err) {
    console.error("Error during fetching repository : ", err.message);
    res.status(500).send("Server error");
  }
}

async function fetchRepositoriesForCurrentUser(req, res) {
  const { userID } = req.params;
  try {
    const repositories = await Repository.find({ owner: userID });

    console.log("Repositories:", repositories);

    res.status(200).json({
      message: "Repositories fetched successfully!",
      repositories: repositories,
    });
  } catch (err) {
    console.error(
      "Error during fetching user repositories:",
      err.message
    );
    res.status(500).json({
      error: "Server error",
    });
  }
}

async function updateRepositoryById(req, res) {
  const { id } = req.params;
  const { content, description } = req.body;
  try {
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found!" });
    }
    repository.content.push(content);
    repository.description = description;
    const updatedRepository = await repository.save();
    res.json({
      message: "Repository updated successfully!",
      repository: updatedRepository,
    });
  } catch (err) {
    console.error("Error during updating repository : ", err.message);
    res.status(500).send("Server error");
  }
}

async function toggleVisibilityById(req, res) {
  const { id } = req.params;
  try {
    const repository = await Repository.findById(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found!" });
    }
    repository.visibility = !repository.visibility;
    const updatedRepository = await repository.save();
    res.json({
      message: "Repository visibility toggled successfully!",
      repository: updatedRepository,
    });
  } catch (err) {
    console.error("Error during toggling visibility : ", err.message);
    res.status(500).send("Server error");
  }
}

async function deleteRepositoryById(req, res) {
  const { id } = req.params;
  try {
    const repository = await Repository.findByIdAndDelete(id);
    if (!repository) {
      return res.status(404).json({ error: "Repository not found!" });
    }

    res.json({ message: "Repository deleted successfully!" });
  } catch (err) {
    console.error("Error during deleting repository : ", err.message);
    res.status(500).send("Server error");
  }
}

async function toggleStarRepository(req, res) {
  const { userId, repoId } = req.body;
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        error: "Invalid User ID!"
      });
    }
    if (!mongoose.Types.ObjectId.isValid(repoId)) {
      return res.status(400).json({
        error: "Invalid Repository ID!"
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found!"
      });
    }
    const alreadyStarred = user.starRepos.some(
      (id) => id.toString() === repoId.toString()
    );
    if (alreadyStarred) {
      user.starRepos = user.starRepos.filter(
        id => id.toString() !== repoId
      );
      await user.save();
      return res.status(200).json({
        message: "Repository unstarred!",
        starred: false
      });
    }
    user.starRepos.push(repoId);
    await user.save();
    res.status(200).json({
      message: "Repository starred!",
      starred: true
    });
  } catch (err) {
    console.error("Error toggling star:", err);
    res.status(500).json({
      error: "Server error"
    });
  }
}

async function getStarredRepositories(req, res) {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
    .populate("starRepos");
    if (!user) {
      return res.status(404).json({
        error: "User not found!",
      });
    }
    res.status(200).json({
      starRepos: user.starRepos,
    });
  } catch (err) {
    console.error("Error fetching starred repositories:", err);
    res.status(500).json({
      error: "Server error",
    });
  }
}
module.exports = {
  createRepository,
  getAllRepositories,
  fetchRepositoryById,
  fetchRepositoryByName,
  fetchRepositoriesForCurrentUser,
  updateRepositoryById,
  toggleVisibilityById,
  deleteRepositoryById,
  toggleStarRepository,
  getStarredRepositories
};
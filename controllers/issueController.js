const Issue = require("../models/issueModel");
const Repository = require("../models/repoModel");

async function createIssue(req, res) {
  const { title, description } = req.body;
  const { id } = req.params;
  try {
    if (!title || !description) {
      return res.status(400).json({
        error: "Title and description are required.",
      });
    }
    const repository = await Repository.findById(id);

    if (!repository) {
      return res.status(404).json({
        error: "Repository not found.",
      });
    }

    if (repository.visibility !== true) {
      return res.status(403).json({
        error: "Issues cannot be created for private repositories.",
      });
    }

    const issue = new Issue({
      title: title.trim(),
      description: description.trim(),
      repository: repository._id,
    });
    await issue.save();
    repository.issues.push(issue._id);
    await repository.save();
    res.status(201).json({
      message: "Issue created successfully!",
      issue,
    });

  } catch (err) {
    console.error(
      "Error during issue creation:",
      err.message
    );
    res.status(500).json({
      error: "Server error",
    });
  }
}

async function updateIssueById(req, res) {
  const { id } = req.params;
  const { title, description, status } = req.body;
  try {
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        error: "Issue not found!"
      });
    }
    if (title !== undefined) {
      issue.title = title;
    }
    if (description !== undefined) {
      issue.description = description;
    }
    if (status !== undefined) {
      issue.status = status;
    }
    await issue.save();
    res.status(200).json({
      message: "Issue updated",
      issue
    });
  } catch (err) {
    console.error(
      "Error during issue updation:",
      err.message
    );
    res.status(500).json({
      error: "Server error"
    });
  }
}

async function deleteIssueById(req, res) {
  const { id } = req.params;
  try {
    const issue = await Issue.findByIdAndDelete(id);
    if (!issue) {
      return res.status(404).json({
        error: "Issue not found!"
      });
    }
    res.status(200).json({
      message: "Issue deleted"
    });
  } catch (err) {
    console.error(
      "Error during issue deletion:",
      err.message
    );
    res.status(500).json({
      error: "Server error"
    });
  }
}

async function getAllIssues(req, res) {
  const { id } = req.params;
  try {
    const issues = await Issue.find({
      repository: id
    }).sort({
      createdAt: -1
    });
    res.status(200).json(issues);
  } catch (err) {
    console.error(
      "Error during issue fetching:",
      err.message
    );
    res.status(500).json({
      error: "Server error"
    });
  }
}

async function getIssueById(req, res) {
  const { id } = req.params;
  try {
    const issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({
        error: "Issue not found!"
      });
    }
    res.status(200).json(issue);
  } catch (err) {
    console.error(
      "Error during issue fetching:",
      err.message
    );
    res.status(500).json({
      error: "Server error"
    });
  }
}

module.exports = {
  createIssue,
  updateIssueById,
  deleteIssueById,
  getAllIssues,
  getIssueById
};
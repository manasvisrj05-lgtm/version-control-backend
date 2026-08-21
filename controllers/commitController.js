const Commit = require("../models/commitModel");

const { s3, S3_BUCKET } = require("../config/aws-config");

// --------------------------------------------------
// CREATE COMMIT
// --------------------------------------------------

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
    console.error(
      "Error creating commit:",
      err
    );

    res.status(500).json({
      error: "Server error"
    });
  }
}

// --------------------------------------------------
// GET COMMITS FOR REPOSITORY
// --------------------------------------------------

async function getCommitsForRepository(req, res) {
  const {
    repositoryId
  } = req.params;

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
    console.error(
      "Error fetching commits:",
      err
    );

    res.status(500).json({
      error: "Server error"
    });
  }
}

// --------------------------------------------------
// GET COMMIT BY ID
// --------------------------------------------------

async function getCommitById(req, res) {
  const {
    commitId
  } = req.params;

  try {
    const commit = await Commit.findOne({
      commitId
    });

    if (!commit) {
      return res.status(404).json({
        exists: false
      });
    }

    res.status(200).json({
      exists: true,
      commit
    });

  } catch (err) {
    console.error(
      "Error checking commit:",
      err
    );

    res.status(500).json({
      error: "Server error"
    });
  }
}

// --------------------------------------------------
// CLEAN S3 PATH
// --------------------------------------------------

function cleanPath(requestedPath) {
  if (!requestedPath) {
    return "";
  }

  const cleanedPath = requestedPath
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");

  const parts = cleanedPath.split("/");

  if (parts.includes("..")) {
    throw new Error("Invalid file path");
  }

  return cleanedPath;
}

// --------------------------------------------------
// GET FILES FROM A SPECIFIC COMMIT
// --------------------------------------------------

async function getCommitFiles(req, res) {
  const {
    commitId
  } = req.params;

  const requestedPath =
    req.query.path || "";

  try {

    // -----------------------------------------
    // 1. FIND COMMIT
    // -----------------------------------------

    const commit = await Commit.findOne({
      commitId
    });

    if (!commit) {
      return res.status(404).json({
        error: "Commit not found"
      });
    }

    // -----------------------------------------
    // 2. CLEAN PATH
    // -----------------------------------------

    const cleanRequestedPath =
      cleanPath(requestedPath);

    // -----------------------------------------
    // 3. CREATE S3 PREFIX
    // -----------------------------------------

    let prefix =
      `commits/${commitId}/`;

    if (cleanRequestedPath) {
      prefix +=
        `${cleanRequestedPath}/`;
    }

    // -----------------------------------------
    // 4. GET OBJECTS FROM S3
    // -----------------------------------------

    const result =
      await s3.listObjectsV2({
        Bucket: S3_BUCKET,
        Prefix: prefix,
        Delimiter: "/"
      }).promise();

    const files = [];

    // -----------------------------------------
    // 5. FOLDERS
    // -----------------------------------------

    if (result.CommonPrefixes) {

      for (const folder of result.CommonPrefixes) {

        const folderPath =
          folder.Prefix;

        const relativeName =
          folderPath
            .replace(prefix, "")
            .replace(/\/$/, "");

        if (!relativeName) {
          continue;
        }

        files.push({
          name: relativeName,
          type: "folder"
        });
      }
    }

    // -----------------------------------------
    // 6. FILES
    // -----------------------------------------

    if (result.Contents) {

      for (const file of result.Contents) {

        const filePath =
          file.Key;

        if (filePath === prefix) {
          continue;
        }

        const relativeName =
          filePath.replace(
            prefix,
            ""
          );

        if (!relativeName) {
          continue;
        }

        files.push({
          name: relativeName,
          type: "file",
          size: file.Size
        });
      }
    }

    // -----------------------------------------
    // 7. SORT
    // -----------------------------------------

    files.sort((a, b) => {

      if (a.type === b.type) {
        return a.name.localeCompare(
          b.name
        );
      }

      return a.type === "folder"
        ? -1
        : 1;
    });

    // -----------------------------------------
    // 8. RESPONSE
    // -----------------------------------------

    res.status(200).json({

      commitId:
        commit.commitId,

      repository:
        commit.repository,

      message:
        commit.message,

      date:
        commit.date,

      path:
        cleanRequestedPath,

      files
    });

  } catch (err) {

    console.error(
      "Error fetching commit files:",
      err
    );

    if (
      err.message ===
      "Invalid file path"
    ) {
      return res.status(400).json({
        error: err.message
      });
    }

    res.status(500).json({
      error: "Server error"
    });
  }
}

// --------------------------------------------------
// GET A FILE FROM A SPECIFIC COMMIT
// --------------------------------------------------

async function getCommitFile(req, res) {

  const {
    commitId
  } = req.params;

  const {
    path: filePath
  } = req.query;

  try {

    // -----------------------------------------
    // 1. CHECK FILE PATH
    // -----------------------------------------

    if (!filePath) {
      return res.status(400).json({
        error: "File path is required"
      });
    }

    const cleanFilePath =
      cleanPath(filePath);

    // -----------------------------------------
    // 2. FIND COMMIT
    // -----------------------------------------

    const commit =
      await Commit.findOne({
        commitId
      });

    if (!commit) {
      return res.status(404).json({
        error: "Commit not found"
      });
    }

    // -----------------------------------------
    // 3. CREATE S3 KEY
    // -----------------------------------------

    const key =
      `commits/${commitId}/${cleanFilePath}`;

    // -----------------------------------------
    // 4. GET FILE FROM S3
    // -----------------------------------------

    const data =
      await s3.getObject({
        Bucket: S3_BUCKET,
        Key: key
      }).promise();

    const content =
      data.Body.toString("utf-8");

    // -----------------------------------------
    // 5. RESPONSE
    // -----------------------------------------

    res.status(200).json({

      commitId:
        commit.commitId,

      name:
        cleanFilePath
          .split("/")
          .pop(),

      path:
        cleanFilePath,

      content
    });

  } catch (err) {

    console.error(
      "Error fetching commit file:",
      err
    );

    if (
      err.message ===
      "Invalid file path"
    ) {
      return res.status(400).json({
        error: err.message
      });
    }

    if (
      err.code ===
      "NoSuchKey"
    ) {
      return res.status(404).json({
        error:
          "File not found in this commit"
      });
    }

    res.status(500).json({
      error: "Server error"
    });
  }
}

// --------------------------------------------------
// EXPORT
// --------------------------------------------------

module.exports = {
  createCommit,
  getCommitsForRepository,
  getCommitById,
  getCommitFiles,
  getCommitFile
};
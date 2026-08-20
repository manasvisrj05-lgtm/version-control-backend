const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

const { s3, S3_BUCKET } = require("../config/aws-config");

async function uploadDirectory(localDir, s3Prefix, commitPath) {
  const entries = await fs.readdir(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);

    // Don't upload commits.json
    if (localPath === commitPath) {
      continue;
    }

    const s3Key = `${s3Prefix}/${entry.name}`;

    if (entry.isDirectory()) {
      // Recursively upload folders
      await uploadDirectory(localPath, s3Key, commitPath);
    } else if (entry.isFile()) {
      // Upload file
      const fileContent = await fs.readFile(localPath);

      const params = {
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: fileContent,
      };

      await s3.upload(params).promise();

      console.log(`Uploaded: ${s3Key}`);
    }
  }
}

async function pushRepo() {
  const repoPath = path.resolve(process.cwd(), ".mygit");
  const commitsPath = path.join(repoPath, "commits");
  const configPath = path.join(repoPath, "config.json");

  try {
    // ------------------------------------------------
    // READ CLI CONFIGURATION
    // ------------------------------------------------

    const configData = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configData);

    const { backendUrl, repositoryId, userId } = config;

    if (!backendUrl) {
      throw new Error("Backend URL is missing from .mygit/config.json");
    }

    if (!repositoryId) {
      throw new Error("Repository ID is missing from .mygit/config.json");
    }

    if (!userId) {
      throw new Error("User ID is missing from .mygit/config.json");
    }

    // ------------------------------------------------
    // GET ALL LOCAL COMMITS
    // ------------------------------------------------

    const commitDirs = await fs.readdir(commitsPath);

    for (const commitDir of commitDirs) {
      const commitPath = path.join(commitsPath, commitDir);

      // Make sure this is a directory
      const stats = await fs.stat(commitPath);

      if (!stats.isDirectory()) {
        continue;
      }

      // ------------------------------------------------
      // READ COMMIT INFORMATION
      // ------------------------------------------------

      const commitInfoPath = path.join(
        commitPath,
        "commits.json"
      );

      const commitInfoData = await fs.readFile(
        commitInfoPath,
        "utf-8"
      );

      const commitInfo = JSON.parse(commitInfoData);

      // ------------------------------------------------
      // PART 1: CHECK IF COMMIT ALREADY EXISTS
      // ------------------------------------------------

      try {
        const existingCommit = await axios.get(
          `${backendUrl}/commit/${commitInfo.commitId}`
        );

        if (existingCommit.data.exists) {
          console.log(
            `Commit ${commitInfo.commitId} already exists. Skipping.`
          );

          continue;
        }
      } catch (err) {
        // 404 means commit doesn't exist
        if (err.response && err.response.status === 404) {
          // Continue with upload
        } else {
          throw err;
        }
      }

      // ------------------------------------------------
      // PART 2: RECURSIVELY PUSH FILES TO S3
      // ------------------------------------------------

      console.log(
        `Uploading files for commit ${commitInfo.commitId}...`
      );

      await uploadDirectory(
        commitPath,
        `commits/${commitDir}`,
        commitInfoPath
      );

      console.log(
        `Commit ${commitDir} files uploaded to S3.`
      );

      // ------------------------------------------------
      // PART 3: SEND COMMIT INFORMATION TO BACKEND
      // ------------------------------------------------

      const response = await axios.post(
        `${backendUrl}/commit/create`,
        {
          repository: repositoryId,
          commitId: commitInfo.commitId,
          message: commitInfo.message,
          author: userId,
        }
      );

      console.log(
        `Commit ${commitDir} sent to website backend.`
      );

      console.log("Backend response:", response.data);
    }

    console.log("All commits pushed successfully!");
  } catch (err) {
    console.error("Error pushing:", err.message);

    if (err.response) {
      console.error(
        "Backend response:",
        err.response.data
      );
    }
  }
}

module.exports = { pushRepo };
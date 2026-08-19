const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

const { s3, S3_BUCKET } = require("../config/aws-config");

async function pushRepo() {
  const repoPath = path.resolve(process.cwd(), ".mygit");
  const commitsPath = path.join(repoPath, "commits");
  const configPath = path.join(repoPath, "config.json");

  try {
    // Read CLI configuration
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

    // Get all local commits
    const commitDirs = await fs.readdir(commitsPath);

    for (const commitDir of commitDirs) {
      const commitPath = path.join(commitsPath, commitDir);

      // Make sure this is a directory
      const stats = await fs.stat(commitPath);

      if (!stats.isDirectory()) {
        continue;
      }

      // Read commit information
      const commitInfoPath = path.join(commitPath, "commits.json");

      const commitInfoData = await fs.readFile(
        commitInfoPath,
        "utf-8"
      );

      const commitInfo = JSON.parse(commitInfoData);

      // ------------------------------------------------
      // PART 1: PUSH FILES TO S3
      // ------------------------------------------------

      const files = await fs.readdir(commitPath);

      for (const file of files) {
        const filePath = path.join(commitPath, file);
        const fileContent = await fs.readFile(filePath);

        const params = {
          Bucket: S3_BUCKET,
          Key: `commits/${commitDir}/${file}`,
          Body: fileContent,
        };

        await s3.upload(params).promise();
      }

      console.log(`Commit ${commitDir} uploaded to S3.`);

      // ------------------------------------------------
      // PART 2: SEND COMMIT INFORMATION TO BACKEND
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
      console.error("Backend response:", err.response.data);
    }
  }
}

module.exports = { pushRepo };
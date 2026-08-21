const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

async function initRepo(repositoryName) {
    const repoPath = path.resolve(process.cwd(), ".mygit");
    const commitPath = path.join(repoPath, "commits");
    const configPath = path.join(repoPath, "config.json");

    try {
        if (!repositoryName) {
            throw new Error(
                "Repository name is required.\n" +
                "Example: node index.js init smart-canteen-management"
            );
        }

        const backendUrl = process.env.BACKEND_URL;

        if (!backendUrl) {
            throw new Error(
                "BACKEND_URL is missing from environment variables."
            );
        }

        // Find repository by name
        const response = await axios.get(
            `${backendUrl}/repo/name/${encodeURIComponent(repositoryName)}`
        );

        const repositories = response.data;

        if (!repositories || repositories.length === 0) {
            throw new Error(
                `Repository "${repositoryName}" not found.`
            );
        }

        const repository = repositories[0];

        // Create .mygit
        await fs.mkdir(repoPath, { recursive: true });
        await fs.mkdir(commitPath, { recursive: true });

        // Save repository information
        await fs.writeFile(
            configPath,
            JSON.stringify(
                {
                    bucket: process.env.S3_BUCKET,
                    backendUrl: backendUrl,
                    repositoryId: repository._id,
                    repositoryName: repository.name,
                    userId: repository.owner._id
                },
                null,
                2
            )
        );

        console.log("Repository initialised successfully!");
        console.log(`Repository: ${repository.name}`);
        console.log(`Repository ID: ${repository._id}`);
        console.log(`Owner: ${repository.owner.username}`);

    } catch (err) {
        console.error(
            "Error initialising the repository:",
            err.response?.data || err.message
        );
    }
}

module.exports = { initRepo };
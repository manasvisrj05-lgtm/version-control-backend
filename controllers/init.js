const fs = require("fs").promises;
const path = require("path");

async function initRepo() {
    const repoPath = path.resolve(process.cwd(), ".mygit");
    const commitPath = path.join(repoPath, "commits");
    const configPath = path.join(repoPath, "config.json");

    try {
        await fs.mkdir(repoPath, { recursive: true });
        await fs.mkdir(commitPath, { recursive: true });
        await fs.writeFile(
            configPath,
            JSON.stringify({
                bucket: process.env.S3_BUCKET
            })
        );
         console.log("Repository initialised");
    } catch (err) {
        console.error("Error initialising the repository", err);
    }
}

module.exports = { initRepo };
const fs = require("fs").promises;
const path = require("path");

async function remoteRepo(repositoryId) {
    const repoPath = path.resolve(process.cwd(), ".mygit");
    const configPath = path.join(repoPath, "config.json");

    try {
        const configData = await fs.readFile(configPath, "utf-8");
        const config = JSON.parse(configData);

        config.repositoryId = repositoryId;

        await fs.writeFile(
            configPath,
            JSON.stringify(config, null, 2)
        );

        console.log(`Remote repository set to ${repositoryId}`);
    } catch (err) {
        console.error("Unable to set remote repository:", err);
    }
}

module.exports = { remoteRepo };
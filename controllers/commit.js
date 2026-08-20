const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");

async function commitRepo(message) {
    const repoPath = path.resolve(process.cwd(), ".mygit");
    const stagedPath = path.join(repoPath, "staging");
    const commitPath = path.join(repoPath, "commits");

    try {
        const commitId = uuidv4();
        const commitDir = path.join(commitPath, commitId);

        await fs.mkdir(commitDir, { recursive: true });

        // Copy the entire staging directory
        // while preserving folder structure
        await fs.cp(stagedPath, commitDir, {
            recursive: true
        });

        // Write commit metadata
        await fs.writeFile(
            path.join(commitDir, "commits.json"),
            JSON.stringify({
                commitId,
                message,
                date: new Date().toISOString()
            })
        );

        console.log(
            `Commit ${commitId} created with message ${message}`
        );

    } catch (err) {
        console.error(
            "Error in committing the file",
            err
        );
    }
}

module.exports = { commitRepo };
const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");

async function commitRepo(message) {

    const repoPath = path.resolve(process.cwd(), ".mygit");
    const stagedPath = path.join(repoPath, "staging");
    const commitPath = path.join(repoPath, "commits");

    try {

        // -----------------------------------------
        // CHECK STAGING
        // -----------------------------------------

        try {
            await fs.access(stagedPath);
        } catch {
            throw new Error(
                "Nothing is staged. Run 'node index.js add <file>' first."
            );
        }

        const stagedFiles = await fs.readdir(stagedPath);

        if (stagedFiles.length === 0) {
            throw new Error(
                "Nothing is staged. Run 'node index.js add <file>' first."
            );
        }

        // -----------------------------------------
        // CREATE COMMIT
        // -----------------------------------------

        const commitId = uuidv4();
        const commitDir = path.join(
            commitPath,
            commitId
        );

        await fs.mkdir(
            commitDir,
            { recursive: true }
        );

        // -----------------------------------------
        // COPY ONLY CURRENT STAGED CONTENT
        // -----------------------------------------

        for (const item of stagedFiles) {

            const source = path.join(
                stagedPath,
                item
            );

            const destination = path.join(
                commitDir,
                item
            );

            await fs.cp(
                source,
                destination,
                {
                    recursive: true
                }
            );
        }

        // -----------------------------------------
        // COMMIT METADATA
        // -----------------------------------------

        await fs.writeFile(
            path.join(commitDir, "commits.json"),
            JSON.stringify(
                {
                    commitId,
                    message,
                    date: new Date().toISOString()
                },
                null,
                2
            )
        );

        console.log(
            `Commit ${commitId} created with message "${message}"`
        );

        // -----------------------------------------
        // CLEAR STAGING AFTER COMMIT
        // -----------------------------------------

        await fs.rm(
            stagedPath,
            {
                recursive: true,
                force: true
            }
        );

        await fs.mkdir(
            stagedPath,
            { recursive: true }
        );

        console.log("Staging area cleared.");

    } catch (err) {

        console.error(
            "Error in committing the file:",
            err.message
        );
    }
}

module.exports = { commitRepo };
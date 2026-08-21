const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");

async function copyDirectoryContents(sourceDir, destinationDir) {

    const entries = await fs.readdir(
        sourceDir,
        { withFileTypes: true }
    );

    for (const entry of entries) {

        // Don't copy deletion metadata
        if (entry.name === "deletions.json") {
            continue;
        }

        const source = path.join(
            sourceDir,
            entry.name
        );

        const destination = path.join(
            destinationDir,
            entry.name
        );

        await fs.cp(
            source,
            destination,
            {
                recursive: true
            }
        );
    }
}


async function commitRepo(message) {

    const repoPath = path.resolve(process.cwd(), ".mygit");

    const stagedPath = path.join(
        repoPath,
        "staging"
    );

    const deletionPath = path.join(
        stagedPath,
        "deletions.json"
    );

    const commitsPath = path.join(
        repoPath,
        "commits"
    );

    try {

        // -----------------------------------------
        // 1. CHECK STAGING
        // -----------------------------------------

        try {

            await fs.access(stagedPath);

        } catch {

            throw new Error(
                "Nothing is staged. Run 'node index.js add <file>' first."
            );

        }


        const stagedFiles = await fs.readdir(
            stagedPath
        );


        if (stagedFiles.length === 0) {

            throw new Error(
                "Nothing is staged. Run 'node index.js add <file>' first."
            );

        }


        // -----------------------------------------
        // 2. FIND PREVIOUS COMMIT
        // -----------------------------------------

        await fs.mkdir(
            commitsPath,
            { recursive: true }
        );


        const existingCommits = await fs.readdir(
            commitsPath,
            { withFileTypes: true }
        );


        const commitDirectories = existingCommits
            .filter(entry => entry.isDirectory());


        let previousCommit = null;


        if (commitDirectories.length > 0) {

            // Sort commits by creation time
            const commitsWithTime = [];


            for (const commit of commitDirectories) {

                const commitFolder = path.join(
                    commitsPath,
                    commit.name
                );


                const stats = await fs.stat(
                    commitFolder
                );


                commitsWithTime.push({
                    name: commit.name,
                    time: stats.birthtimeMs
                });

            }


            commitsWithTime.sort(
                (a, b) => b.time - a.time
            );


            previousCommit =
                commitsWithTime[0].name;

        }


        // -----------------------------------------
        // 3. CREATE NEW COMMIT
        // -----------------------------------------

        const commitId = uuidv4();


        const commitDir = path.join(
            commitsPath,
            commitId
        );


        await fs.mkdir(
            commitDir,
            { recursive: true }
        );


        // -----------------------------------------
        // 4. COPY PREVIOUS COMMIT
        // -----------------------------------------

        if (previousCommit) {

            const previousCommitDir =
                path.join(
                    commitsPath,
                    previousCommit
                );


            const previousEntries =
                await fs.readdir(
                    previousCommitDir,
                    {
                        withFileTypes: true
                    }
                );


            for (const entry of previousEntries) {

                // Don't copy commit metadata
                if (entry.name === "commits.json") {
                    continue;
                }


                const source =
                    path.join(
                        previousCommitDir,
                        entry.name
                    );


                const destination =
                    path.join(
                        commitDir,
                        entry.name
                    );


                await fs.cp(
                    source,
                    destination,
                    {
                        recursive: true
                    }
                );

            }


            console.log(
                "Previous repository state copied."
            );

        }


        // -----------------------------------------
        // 5. APPLY STAGED DELETIONS
        // -----------------------------------------

        let deletions = [];


        try {

            const deletionData =
                await fs.readFile(
                    deletionPath,
                    "utf8"
                );


            deletions = JSON.parse(
                deletionData
            );

        } catch {

            deletions = [];

        }


        for (
            const deletedFile
            of deletions
        ) {

            const deletedPath =
                path.join(
                    commitDir,
                    deletedFile
                );


            await fs.rm(
                deletedPath,
                {
                    recursive: true,
                    force: true
                }
            );


            console.log(
                `Deleted from commit: ${deletedFile}`
            );

        }


        // -----------------------------------------
        // 6. APPLY NEW STAGED FILES
        // -----------------------------------------

        await copyDirectoryContents(
            stagedPath,
            commitDir
        );


        console.log(
            "New staged files added to commit."
        );


        // -----------------------------------------
        // 7. WRITE COMMIT METADATA
        // -----------------------------------------

        await fs.writeFile(

            path.join(
                commitDir,
                "commits.json"
            ),

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
        // 8. CLEAR STAGING
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
            {
                recursive: true
            }
        );


        console.log(
            "Staging area cleared."
        );


    } catch (err) {

        console.error(
            "Error in committing the file:",
            err.message
        );

    }

}


module.exports = {
    commitRepo
};
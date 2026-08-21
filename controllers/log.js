const fs = require("fs").promises;
const path = require("path");


// --------------------------------------------------
// FIND ALL COMMITS
// --------------------------------------------------

async function getCommits(commitsPath) {

    try {

        const entries = await fs.readdir(
            commitsPath,
            {
                withFileTypes: true
            }
        );


        const commitDirectories =
            entries.filter(
                entry => entry.isDirectory()
            );


        const commits = [];


        for (
            const commit
            of commitDirectories
        ) {

            const commitPath =
                path.join(
                    commitsPath,
                    commit.name
                );


            const metadataPath =
                path.join(
                    commitPath,
                    "commits.json"
                );


            try {

                const data =
                    await fs.readFile(
                        metadataPath,
                        "utf8"
                    );


                const metadata =
                    JSON.parse(data);


                commits.push({
                    commitId:
                        metadata.commitId,

                    message:
                        metadata.message,

                    date:
                        metadata.date
                });


            } catch {

                // Ignore folders without
                // valid commit metadata

            }
        }


        // Newest commit first
        commits.sort(
            (a, b) =>
                new Date(b.date) -
                new Date(a.date)
        );


        return commits;

    } catch {

        return [];
    }
}


// --------------------------------------------------
// LOG
// --------------------------------------------------

async function logRepo() {

    const repoPath =
        path.resolve(
            process.cwd(),
            ".mygit"
        );


    const commitsPath =
        path.join(
            repoPath,
            "commits"
        );


    try {

        // -----------------------------------------
        // CHECK REPOSITORY
        // -----------------------------------------

        try {

            await fs.access(
                repoPath
            );

        } catch {

            console.log(
                "Not a repository. Run init first."
            );

            return;
        }


        // -----------------------------------------
        // GET COMMITS
        // -----------------------------------------

        const commits =
            await getCommits(
                commitsPath
            );


        if (
            commits.length === 0
        ) {

            console.log(
                "No commits yet."
            );

            return;
        }


        // -----------------------------------------
        // DISPLAY COMMITS
        // -----------------------------------------

        for (
            const commit
            of commits
        ) {

            console.log("");

            console.log(
                `commit ${commit.commitId}`
            );


            console.log(
                `Date:   ${new Date(commit.date).toLocaleString()}`
            );


            console.log("");


            console.log(
                `    ${commit.message}`
            );


            console.log("");
        }


    } catch (err) {

        console.error(
            "Error showing commit history:",
            err.message
        );

    }
}


module.exports = {
    logRepo
};
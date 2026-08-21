const fs = require("fs").promises;
const path = require("path");

const ignored = new Set([
    "controllers",
    "models",
    "routes",
    "frontend",
    "config",

    "node_modules",
    ".git",
    ".mygit",

    ".env",
    "index.js",
    "package.json",
    "commits.json",
    "package-lock.json",
    ".gitignore"
]);


// --------------------------------------------------
// GET ALL FILES
// --------------------------------------------------

async function getFiles(dir, baseDir) {

    const files = [];

    let entries;

    try {

        entries = await fs.readdir(
            dir,
            { withFileTypes: true }
        );

    } catch {

        return files;
    }


    for (const entry of entries) {

        const fullPath =
            path.join(
                dir,
                entry.name
            );


        const relativePath =
            path.relative(
                baseDir,
                fullPath
            );


        const parts =
            relativePath.split(
                path.sep
            );


        if (
            parts.some(part =>
                ignored.has(part)
            )
        ) {
            continue;
        }


        if (entry.isDirectory()) {

            const childFiles =
                await getFiles(
                    fullPath,
                    baseDir
                );

            files.push(
                ...childFiles
            );

        } else {

            files.push(
                relativePath
            );
        }
    }


    return files;
}


// --------------------------------------------------
// FILE EXISTS
// --------------------------------------------------

async function fileExists(filePath) {

    try {

        await fs.access(
            filePath
        );

        return true;

    } catch {

        return false;
    }
}


// --------------------------------------------------
// COMPARE FILES
// --------------------------------------------------

async function filesAreSame(
    file1,
    file2
) {

    try {

        const [
            buffer1,
            buffer2
        ] = await Promise.all([

            fs.readFile(
                file1
            ),

            fs.readFile(
                file2
            )

        ]);


        return buffer1.equals(
            buffer2
        );

    } catch {

        return false;
    }
}


// --------------------------------------------------
// FIND LATEST COMMIT
// --------------------------------------------------

async function getLatestCommit(
    commitsPath
) {

    try {

        const entries =
            await fs.readdir(
                commitsPath,
                {
                    withFileTypes: true
                }
            );


        const commitDirectories =
            entries.filter(
                entry =>
                    entry.isDirectory()
            );


        if (
            commitDirectories.length === 0
        ) {

            return null;
        }


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


            const stats =
                await fs.stat(
                    commitPath
                );


            commits.push({

                name:
                    commit.name,

                time:
                    stats.birthtimeMs

            });
        }


        commits.sort(
            (a, b) =>
                b.time - a.time
        );


        return commits[0].name;

    } catch {

        return null;
    }
}


// --------------------------------------------------
// READ STAGED DELETIONS
// --------------------------------------------------

async function getStagedDeletions(
    deletionPath
) {

    try {

        const data =
            await fs.readFile(
                deletionPath,
                "utf8"
            );


        return JSON.parse(
            data
        );

    } catch {

        return [];
    }
}


// --------------------------------------------------
// STATUS
// --------------------------------------------------

async function statusRepo() {

    const rootPath =
        process.cwd();


    const repoPath =
        path.join(
            rootPath,
            ".mygit"
        );


    const stagingPath =
        path.join(
            repoPath,
            "staging"
        );


    const commitsPath =
        path.join(
            repoPath,
            "commits"
        );


    // --------------------------------------------------
    // CHECK REPOSITORY
    // --------------------------------------------------

    if (
        !(await fileExists(repoPath))
    ) {

        console.log(
            "Not a repository. Run init first."
        );

        return;
    }


    // --------------------------------------------------
    // FIND LATEST COMMIT
    // --------------------------------------------------

    const latestCommit =
        await getLatestCommit(
            commitsPath
        );


    const latestCommitPath =
        latestCommit

            ? path.join(
                commitsPath,
                latestCommit
            )

            : null;


    // --------------------------------------------------
    // GET FILES
    // --------------------------------------------------

    const workingFiles =
        await getFiles(
            rootPath,
            rootPath
        );


    const stagedFiles =
        await getFiles(
            stagingPath,
            stagingPath
        );


    const committedFiles =
        latestCommitPath

            ? await getFiles(
                latestCommitPath,
                latestCommitPath
            )

            : [];


    // --------------------------------------------------
    // GET STAGED DELETIONS
    // --------------------------------------------------

    const deletionPath =
        path.join(
            stagingPath,
            "deletions.json"
        );


    const stagedDeletions =
        await getStagedDeletions(
            deletionPath
        );


    // --------------------------------------------------
    // SETS
    // --------------------------------------------------

    const workingSet =
        new Set(
            workingFiles
        );


    const stagedSet =
        new Set(
            stagedFiles
        );


    const committedSet =
        new Set(
            committedFiles
        );


    const stagedDeletionSet =
        new Set(
            stagedDeletions
        );


    const stagedChanges = [];

    const modifiedFiles = [];

    const deletedFiles = [];

    const untrackedFiles = [];


    // --------------------------------------------------
    // 1. STAGED FILES
    // --------------------------------------------------

    for (
        const file
        of stagedFiles
    ) {

        // Ignore deletion metadata
        if (
            file === "deletions.json"
        ) {

            continue;
        }


        // New file
        if (
            !committedSet.has(file)
        ) {

            stagedChanges.push(
                file
            );

            continue;
        }


        // Modified file
        const stagedPath =
            path.join(
                stagingPath,
                file
            );


        const committedPath =
            path.join(
                latestCommitPath,
                file
            );


        const same =
            await filesAreSame(
                stagedPath,
                committedPath
            );


        if (!same) {

            stagedChanges.push(
                file
            );
        }
    }


    // --------------------------------------------------
    // 2. STAGED DELETIONS
    // --------------------------------------------------

    for (
        const file
        of stagedDeletions
    ) {

        stagedChanges.push(
            `deleted: ${file}`
        );
    }


    // --------------------------------------------------
    // 3. MODIFIED / DELETED
    // --------------------------------------------------

    for (
        const file
        of committedFiles
    ) {

        const workingPath =
            path.join(
                rootPath,
                file
            );


        // -----------------------------------------
        // FILE DELETED
        // -----------------------------------------

        if (
            !workingSet.has(file)
        ) {

            // IMPORTANT:
            // If deletion is already staged,
            // don't show it again as unstaged.
            if (
                !stagedDeletionSet.has(file)
            ) {

                deletedFiles.push(
                    file
                );
            }

            continue;
        }


        // -----------------------------------------
        // FILE IS STAGED
        // -----------------------------------------

        if (
            stagedSet.has(file)
        ) {

            continue;
        }


        // -----------------------------------------
        // CHECK MODIFICATION
        // -----------------------------------------

        const committedPath =
            path.join(
                latestCommitPath,
                file
            );


        const same =
            await filesAreSame(
                workingPath,
                committedPath
            );


        if (!same) {

            modifiedFiles.push(
                file
            );
        }
    }


    // --------------------------------------------------
    // 4. UNTRACKED
    // --------------------------------------------------

    for (
        const file
        of workingFiles
    ) {

        if (

            !committedSet.has(file) &&

            !stagedSet.has(file)

        ) {

            untrackedFiles.push(
                file
            );
        }
    }


    // --------------------------------------------------
    // OUTPUT
    // --------------------------------------------------

    console.log("");

    console.log(
        `On repository: ${path.basename(rootPath)}`
    );

    console.log("");


    // --------------------------------------------------
    // CHANGES TO BE COMMITTED
    // --------------------------------------------------

    if (
        stagedChanges.length > 0
    ) {

        console.log(
            "Changes to be committed:"
        );


        for (
            const file
            of stagedChanges
        ) {

            console.log(
                `  ${file.replace(/\\/g, "/")}`
            );
        }


        console.log("");
    }


    // --------------------------------------------------
    // MODIFIED
    // --------------------------------------------------

    if (
        modifiedFiles.length > 0
    ) {

        console.log(
            "Changes not staged for commit:"
        );


        for (
            const file
            of modifiedFiles
        ) {

            console.log(
                `  modified: ${file.replace(/\\/g, "/")}`
            );
        }


        console.log("");
    }


    // --------------------------------------------------
    // DELETED
    // --------------------------------------------------

    if (
        deletedFiles.length > 0
    ) {

        console.log(
            "Deleted:"
        );


        for (
            const file
            of deletedFiles
        ) {

            console.log(
                `  deleted: ${file.replace(/\\/g, "/")}`
            );
        }


        console.log("");
    }


    // --------------------------------------------------
    // UNTRACKED
    // --------------------------------------------------

    if (
        untrackedFiles.length > 0
    ) {

        console.log(
            "Untracked files:"
        );


        for (
            const file
            of untrackedFiles
        ) {

            console.log(
                `  ${file.replace(/\\/g, "/")}`
            );
        }


        console.log("");
    }


    // --------------------------------------------------
    // CLEAN
    // --------------------------------------------------

    if (

        stagedChanges.length === 0 &&

        modifiedFiles.length === 0 &&

        deletedFiles.length === 0 &&

        untrackedFiles.length === 0

    ) {

        console.log(
            "Nothing to commit, working tree clean."
        );

        console.log("");
    }
}


module.exports = {
    statusRepo
};
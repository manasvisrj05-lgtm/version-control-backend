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
    "commits.json",
    "package.json",
    "package-lock.json",
    ".gitignore"
]);


// --------------------------------------------------
// GET ALL FILES FROM A DIRECTORY
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

        const fullPath = path.join(
            dir,
            entry.name
        );

        const relativePath = path.relative(
            baseDir,
            fullPath
        );

        const parts = relativePath.split(path.sep);

        if (
            parts.some(part => ignored.has(part))
        ) {
            continue;
        }

        if (entry.isDirectory()) {

            const childFiles = await getFiles(
                fullPath,
                baseDir
            );

            files.push(...childFiles);

        } else {

            files.push(relativePath);
        }
    }

    return files;
}


// --------------------------------------------------
// FILE EXISTS
// --------------------------------------------------

async function fileExists(filePath) {

    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}


// --------------------------------------------------
// FIND LATEST COMMIT
// --------------------------------------------------

async function getLatestCommit(commitsPath) {

    try {

        const entries = await fs.readdir(
            commitsPath,
            { withFileTypes: true }
        );

        const commitDirectories =
            entries.filter(
                entry => entry.isDirectory()
            );

        if (commitDirectories.length === 0) {
            return null;
        }

        const commits = [];

        for (const commit of commitDirectories) {

            const commitPath = path.join(
                commitsPath,
                commit.name
            );

            const stats = await fs.stat(
                commitPath
            );

            commits.push({
                name: commit.name,
                time: stats.birthtimeMs
            });
        }

        commits.sort(
            (a, b) => b.time - a.time
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

        const data = await fs.readFile(
            deletionPath,
            "utf8"
        );

        return JSON.parse(data);

    } catch {

        return [];
    }
}


// --------------------------------------------------
// SAVE STAGED DELETIONS
// --------------------------------------------------

async function saveStagedDeletions(
    deletionPath,
    deletions
) {

    if (deletions.length === 0) {

        await fs.rm(
            deletionPath,
            {
                force: true
            }
        );

        return;
    }

    await fs.writeFile(
        deletionPath,
        JSON.stringify(
            deletions,
            null,
            2
        )
    );
}


// --------------------------------------------------
// ADD REPOSITORY
// --------------------------------------------------

async function addRepo(filePath) {

    const repoPath =
        path.resolve(
            process.cwd(),
            ".mygit"
        );

    const stagingPath =
        path.join(
            repoPath,
            "staging"
        );

    const deletionPath =
        path.join(
            stagingPath,
            "deletions.json"
        );

    const commitsPath =
        path.join(
            repoPath,
            "commits"
        );


    try {

        await fs.mkdir(
            stagingPath,
            {
                recursive: true
            }
        );


        // -----------------------------------------
        // NEVER ALLOW .mygit
        // -----------------------------------------

        const sourcePath =
            path.resolve(
                process.cwd(),
                filePath
            );


        if (
            sourcePath === repoPath ||
            sourcePath.startsWith(
                repoPath + path.sep
            )
        ) {

            throw new Error(
                "You cannot add files from inside .mygit"
            );
        }


        const relativePath =
            path.relative(
                process.cwd(),
                sourcePath
            );


        // -----------------------------------------
        // CHECK IGNORED
        // -----------------------------------------

        const parts =
            relativePath.split(path.sep);


        if (
            parts.some(part =>
                ignored.has(part)
            )
        ) {

            console.log(
                `Skipping: ${relativePath}`
            );

            return;
        }


        // -----------------------------------------
        // CHECK WHETHER FILE EXISTS
        // -----------------------------------------

        const exists =
            await fileExists(
                sourcePath
            );


        // ==================================================
        // FILE / FOLDER DOES NOT EXIST
        // ==================================================

        if (!exists) {

            const latestCommit =
                await getLatestCommit(
                    commitsPath
                );


            if (!latestCommit) {

                throw new Error(
                    `Path does not exist: ${relativePath}`
                );
            }


            const latestCommitPath =
                path.join(
                    commitsPath,
                    latestCommit
                );


            const committedFiles =
                await getFiles(
                    latestCommitPath,
                    latestCommitPath
                );


            if (
                !committedFiles.includes(
                    relativePath
                )
            ) {

                throw new Error(
                    `Path does not exist: ${relativePath}`
                );
            }


            let deletions =
                await getStagedDeletions(
                    deletionPath
                );


            if (
                !deletions.includes(
                    relativePath
                )
            ) {

                deletions.push(
                    relativePath
                );
            }


            await saveStagedDeletions(
                deletionPath,
                deletions
            );


            // If there was an old staged copy,
            // remove it because deletion wins.
            const stagedFilePath =
                path.join(
                    stagingPath,
                    relativePath
                );


            await fs.rm(
                stagedFilePath,
                {
                    recursive: true,
                    force: true
                }
            );


            console.log(
                `File ${relativePath} staged for deletion`
            );

            return;
        }


        const stats =
            await fs.stat(
                sourcePath
            );


        // ==================================================
        // DIRECTORY
        // ==================================================

        if (stats.isDirectory()) {

            const entries =
                await fs.readdir(
                    sourcePath,
                    {
                        withFileTypes: true
                    }
                );


            for (
                const entry
                of entries
            ) {

                const childSource =
                    path.join(
                        sourcePath,
                        entry.name
                    );


                const childRelative =
                    path.relative(
                        process.cwd(),
                        childSource
                    );


                await addRepo(
                    childRelative
                );
            }


            // -----------------------------------------
            // IF ADD . THEN DETECT DELETED FILES
            // -----------------------------------------

            if (
                relativePath === ""
            ) {

                const latestCommit =
                    await getLatestCommit(
                        commitsPath
                    );


                if (latestCommit) {

                    const latestCommitPath =
                        path.join(
                            commitsPath,
                            latestCommit
                        );


                    const committedFiles =
                        await getFiles(
                            latestCommitPath,
                            latestCommitPath
                        );


                    const workingFiles =
                        await getFiles(
                            process.cwd(),
                            process.cwd()
                        );


                    let deletions =
                        await getStagedDeletions(
                            deletionPath
                        );


                    for (
                        const committedFile
                        of committedFiles
                    ) {

                        if (
                            !workingFiles.includes(
                                committedFile
                            )
                        ) {

                            if (
                                !deletions.includes(
                                    committedFile
                                )
                            ) {

                                deletions.push(
                                    committedFile
                                );

                                console.log(
                                    `File ${committedFile} staged for deletion`
                                );
                            }
                        }
                    }


                    await saveStagedDeletions(
                        deletionPath,
                        deletions
                    );
                }
            }


            console.log(
                `Folder ${relativePath || "."} staged`
            );

            return;
        }


        // ==================================================
        // FILE
        // ==================================================

        const destinationPath =
            path.join(
                stagingPath,
                relativePath
            );


        await fs.mkdir(
            path.dirname(
                destinationPath
            ),
            {
                recursive: true
            }
        );


        await fs.copyFile(
            sourcePath,
            destinationPath
        );


        // If this file was previously staged
        // for deletion, cancel that deletion.
        let deletions =
            await getStagedDeletions(
                deletionPath
            );


        deletions =
            deletions.filter(
                file =>
                    file !== relativePath
            );


        await saveStagedDeletions(
            deletionPath,
            deletions
        );


        console.log(
            `File ${relativePath} staged`
        );

    } catch (err) {

        console.error(
            "Error in staging:",
            err.message
        );
    }
}


module.exports = {
    addRepo
};
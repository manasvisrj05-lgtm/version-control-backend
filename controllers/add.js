const fs = require("fs").promises;
const path = require("path");

async function addRepo(filePath) {
    const repoPath = path.resolve(process.cwd(), ".mygit");
    const stagingPath = path.join(repoPath, "staging");

    try {
        await fs.mkdir(stagingPath, { recursive: true });

        const sourcePath = path.resolve(
            process.cwd(),
            filePath
        );

        // Prevent adding .mygit
        if (
            sourcePath === repoPath ||
            sourcePath.startsWith(repoPath + path.sep)
        ) {
            throw new Error(
                "You cannot add files from inside .mygit"
            );
        }

        const relativePath = path.relative(
            process.cwd(),
            sourcePath
        );

        const destinationPath = path.join(
            stagingPath,
            relativePath
        );

        const stats = await fs.stat(sourcePath);

        // -----------------------------------------
        // DIRECTORY
        // -----------------------------------------

        if (stats.isDirectory()) {

            const ignoredFolders = [
                ".mygit",
                "node_modules",
                ".git"
            ];

            const entries = await fs.readdir(
                sourcePath,
                { withFileTypes: true }
            );

            for (const entry of entries) {

                if (
                    entry.isDirectory() &&
                    ignoredFolders.includes(entry.name)
                ) {
                    console.log(
                        `Skipping: ${entry.name}`
                    );
                    continue;
                }

                const childSource = path.join(
                    sourcePath,
                    entry.name
                );

                const childRelative = path.relative(
                    process.cwd(),
                    childSource
                );

                await addRepo(childRelative);
            }

            console.log(
                `Folder ${relativePath || "."} was staged`
            );
        }

        // -----------------------------------------
        // FILE
        // -----------------------------------------

        else {

            await fs.mkdir(
                path.dirname(destinationPath),
                {
                    recursive: true
                }
            );

            await fs.copyFile(
                sourcePath,
                destinationPath
            );

            console.log(
                `File ${relativePath} was staged`
            );
        }

    } catch (err) {

        console.error(
            "Error in staging:",
            err.message
        );
    }
}

module.exports = { addRepo };
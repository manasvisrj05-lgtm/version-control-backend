const fs = require("fs").promises;
const path = require("path");

async function addRepo(filePath) {
    const repoPath = path.resolve(process.cwd(), ".mygit");
    const stagingPath = path.join(repoPath, "staging");

    try {
        await fs.mkdir(stagingPath, { recursive: true });

        // Convert supplied path to absolute path
        const sourcePath = path.resolve(process.cwd(), filePath);

        // Prevent adding .mygit
        if (
            sourcePath === repoPath ||
            sourcePath.startsWith(repoPath + path.sep)
        ) {
            throw new Error("You cannot add files from inside .mygit");
        }

        // Check that source exists
        const stats = await fs.stat(sourcePath);

        // -----------------------------------------
        // IMPORTANT:
        // If user runs "add ." then clear staging
        // and stage everything again.
        // -----------------------------------------

        if (filePath === ".") {
            // Remove old staging contents
            await fs.rm(stagingPath, {
                recursive: true,
                force: true
            });

            await fs.mkdir(stagingPath, { recursive: true });

            // Get everything from project root
            const items = await fs.readdir(process.cwd());

            for (const item of items) {
                if (item === ".mygit") {
                    continue;
                }

                const source = path.join(process.cwd(), item);
                const destination = path.join(stagingPath, item);

                await fs.cp(source, destination, {
                    recursive: true
                });
            }

            console.log("All files and folders were staged.");
            return;
        }

        // -----------------------------------------
        // Preserve path relative to project root
        // -----------------------------------------

        const relativePath = path.relative(
            process.cwd(),
            sourcePath
        );

        const destinationPath = path.join(
            stagingPath,
            relativePath
        );

        // -----------------------------------------
        // FILE
        // -----------------------------------------

        if (stats.isFile()) {

            await fs.mkdir(
                path.dirname(destinationPath),
                { recursive: true }
            );

            await fs.copyFile(
                sourcePath,
                destinationPath
            );

            console.log(`File ${relativePath} was staged.`);
        }

        // -----------------------------------------
        // FOLDER
        // -----------------------------------------

        else if (stats.isDirectory()) {

            await fs.cp(
                sourcePath,
                destinationPath,
                {
                    recursive: true
                }
            );

            console.log(`Folder ${relativePath} was staged.`);
        }

    } catch (err) {
        console.error("Error in staging:", err);
    }
}

module.exports = { addRepo };
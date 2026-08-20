const fs = require("fs").promises;
const path = require("path");

async function addRepo(filePath) {
    const repoPath = path.resolve(process.cwd(), ".mygit");
    const stagingPath = path.join(repoPath, "staging");

    try {
        await fs.mkdir(stagingPath, { recursive: true });

        // Convert the supplied path into an absolute path
        const sourcePath = path.resolve(process.cwd(), filePath);

        // Prevent accidentally adding .mygit itself
        if (
            sourcePath === repoPath ||
            sourcePath.startsWith(repoPath + path.sep)
        ) {
            throw new Error("You cannot add files from inside .mygit");
        }

        // Preserve the path relative to the project root
        const relativePath = path.relative(
            process.cwd(),
            sourcePath
        );

        const destinationPath = path.join(
            stagingPath,
            relativePath
        );

        const stats = await fs.stat(sourcePath);

        // If it's a directory, copy the entire directory
        if (stats.isDirectory()) {
            await fs.cp(sourcePath, destinationPath, {
                recursive: true
            });

            console.log(`Folder ${relativePath} was staged`);
        }

        // If it's a file, copy the file
        else {
            await fs.mkdir(
                path.dirname(destinationPath),
                { recursive: true }
            );

            await fs.copyFile(
                sourcePath,
                destinationPath
            );

            console.log(`File ${relativePath} was staged`);
        }

    } catch (err) {
        console.error("Error in staging:", err);
    }
}

module.exports = { addRepo };
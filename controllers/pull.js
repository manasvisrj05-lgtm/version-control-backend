const fs = require("fs").promises;
const path = require("path");
const axios = require("axios");

const { s3, S3_BUCKET } = require("../config/aws-config");

async function downloadDirectory(
    prefix,
    localDir
) {
    const result = await s3
        .listObjectsV2({
            Bucket: S3_BUCKET,
            Prefix: prefix
        })
        .promise();

    if (!result.Contents) {
        return;
    }

    for (const object of result.Contents) {

        const key = object.Key;

        // Remove S3 prefix
        const relativePath = key
            .replace(prefix, "");

        if (!relativePath) {
            continue;
        }

        const localPath = path.join(
            localDir,
            relativePath
        );

        await fs.mkdir(
            path.dirname(localPath),
            {
                recursive: true
            }
        );

        const data = await s3
            .getObject({
                Bucket: S3_BUCKET,
                Key: key
            })
            .promise();

        await fs.writeFile(
            localPath,
            data.Body
        );

        console.log(
            `Downloaded: ${relativePath}`
        );
    }
}


async function pullRepo() {

    const repoPath = path.resolve(
        process.cwd(),
        ".mygit"
    );

    const commitsPath = path.join(
        repoPath,
        "commits"
    );

    const configPath = path.join(
        repoPath,
        "config.json"
    );

    try {

        // -----------------------------------------
        // 1. READ CONFIG
        // -----------------------------------------

        const configData = await fs.readFile(
            configPath,
            "utf-8"
        );

        const config = JSON.parse(
            configData
        );

        const {
            backendUrl,
            repositoryId
        } = config;


        if (!backendUrl) {
            throw new Error(
                "Backend URL missing from .mygit/config.json"
            );
        }

        if (!repositoryId) {
            throw new Error(
                "Repository ID missing from .mygit/config.json"
            );
        }


        // -----------------------------------------
        // 2. GET COMMITS FROM BACKEND
        // -----------------------------------------

        const response = await axios.get(
            `${backendUrl}/commit/repository/${repositoryId}`
        );

        const commits =
            response.data.commits || [];


        if (commits.length === 0) {

            console.log(
                "No commits found for this repository."
            );

            return;
        }


        // Backend already sorts newest first
        const latestCommit = commits[0];

        console.log(
            `Latest commit: ${latestCommit.commitId}`
        );


        // -----------------------------------------
        // 3. CLEAR OLD LOCAL COMMITS
        // -----------------------------------------

        await fs.rm(
            commitsPath,
            {
                recursive: true,
                force: true
            }
        );

        await fs.mkdir(
            commitsPath,
            {
                recursive: true
            }
        );


        // -----------------------------------------
        // 4. DOWNLOAD LATEST COMMIT
        // -----------------------------------------

        const latestCommitPath =
            path.join(
                commitsPath,
                latestCommit.commitId
            );

        await fs.mkdir(
            latestCommitPath,
            {
                recursive: true
            }
        );


        await downloadDirectory(
            `commits/${latestCommit.commitId}/`,
            latestCommitPath
        );


        // -----------------------------------------
        // 5. RESTORE WORKING DIRECTORY
        // -----------------------------------------

        const entries = await fs.readdir(
            latestCommitPath,
            {
                withFileTypes: true
            }
        );


        for (const entry of entries) {

            if (entry.name === "commits.json") {
                continue;
            }

            const sourcePath =
                path.join(
                    latestCommitPath,
                    entry.name
                );

            const destinationPath =
                path.join(
                    process.cwd(),
                    entry.name
                );

            await fs.cp(
                sourcePath,
                destinationPath,
                {
                    recursive: true,
                    force: true
                }
            );

            console.log(
                `Restored: ${entry.name}`
            );
        }


        // -----------------------------------------
        // 6. SAVE COMMIT METADATA
        // -----------------------------------------

        await fs.writeFile(
            path.join(
                latestCommitPath,
                "commits.json"
            ),
            JSON.stringify(
                {
                    commitId:
                        latestCommit.commitId,

                    message:
                        latestCommit.message,

                    date:
                        latestCommit.date
                },
                null,
                2
            )
        );


        console.log(
            "Repository pulled successfully!"
        );

    } catch (err) {

        console.error(
            "Unable to pull:",
            err.response?.data ||
            err.message
        );
    }
}


module.exports = {
    pullRepo
};
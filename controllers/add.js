const fs = require("fs").promises;
const path = require("path");

async function addRepo(filePath){
    const repoPath = path.resolve(process.cwd(),".mygit");
    const stagingPath = path.join(repoPath,"staging");
    try{
        await fs.mkdir(stagingPath,{recursive:true});
        const fileName = path.basename(filePath);
        await fs.copyFile(filePath,path.join(stagingPath,fileName));
        console.log(`File ${fileName} was staged`);
    }catch(err){
        console.error("Error in staging the file",err);
    }
};

module.exports = {addRepo};
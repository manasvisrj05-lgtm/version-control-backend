const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const {Server} = require("socket.io");
const mainRouter = require("./routes/main.router");

const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");

const { initRepo } = require("./controllers/init");
const { addRepo } = require("./controllers/add");
const {commitRepo} = require("./controllers/commit");
const {pushRepo} = require("./controllers/push");
const {pullRepo} = require("./controllers/pull");
const {revertRepo} = require("./controllers/revert");
const { Socket } = require("dgram");

dotenv.config();

yargs(hideBin(process.argv))
  .command("start", "Starts a new server", {}, startServer)
  .command("init", "Initialise a new repository", {}, initRepo)
  .command(
    "add <file>",
    "To stage a repository",
    (yargs) => {
      yargs.positional("file",{
        describe:"File to add to staging area",
        type:"string"
      });
    },
    (argv)=>{
      addRepo(argv.file);
    }
  )
  .command("commit <message>","Commit the staged files",
    (yargs)=>{
        yargs.positional("message",{
            describe:"Commit message",
            type:"string",
        });
    },
    (argv)=>{
      commitRepo(argv.message);
    }
  )
  .command("push","Push commits to S3",{},pushRepo)
  .command("pull","Pull commits from S3",{},pullRepo)
  .command("revert <commitID>","Revert to a specific commit",
    (yargs)=>{
        yargs.positional("commitID",{
            describe:"Revert to a specific commit",
            type:"string"
        });
    },
    (argv)=>{
      revertRepo(argv.commitID);
    }
  )
  .demandCommand(1, "You need to enter atleast one command")
  .help().argv;


function startServer(){
  const app = express();
  const port = process.env.PORT || 3000 ;

  app.use(bodyParser.json());
  app.use(express.json());
  
  const mongoUrl = process.env.MONGODB_URL;

  mongoose.connect(mongoUrl)
    .then(()=>{
      console.log("Connection successfull");
    })
    .catch((err)=>{
      console.error("Unable to connect to the DB",err);
    })

  app.use(cors({origin:"*"}));

  app.use((req, res, next) => {
    console.log("REQUEST:", req.method, req.originalUrl);
    next();
  });

  app.use(mainRouter);

  let user = "test";

  const httpServer = http.createServer(app);
  const io = new Server(httpServer,{
    cors:{
      origin:"*",
      methods:["GET","POST"]
    }
  });

  io.on("connection", (socket) => {
    socket.on("joinRoom",(userID)=>{
      user = userID;
      console.log("======");
      console.log(user);
      console.log("======");
      socket.join(userID);
    })
  });

  const db = mongoose.connection;
  db.once("open",async()=>{
    console.log("CRUD operations called");
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server is listening to port ${port}`);
  });
}
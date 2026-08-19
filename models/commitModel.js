const mongoose = require("mongoose");
const { Schema } = mongoose;

const CommitSchema = new Schema(
  {
    commitId: {
      type: String,
      required: true,
      unique: true,
    },

    repository: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Commit = mongoose.model("Commit", CommitSchema);

module.exports = Commit;
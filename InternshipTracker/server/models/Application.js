// The shape of one internship application in MongoDB.
// Mongoose checks every document against this schema before saving it,
// so bad data is rejected by the server even if the browser is bypassed.
const mongoose = require("mongoose");

const STATUSES = ["Applied", "Interview", "Offer", "Rejected"];

const applicationSchema = new mongoose.Schema(
    {
        company: {
            type: String,
            required: [true, "Company is required"],
            trim: true,
            maxlength: [100, "Company must be 100 characters or fewer"],
        },
        role: {
            type: String,
            required: [true, "Role is required"],
            trim: true,
            maxlength: [150, "Role must be 150 characters or fewer"],
        },
        status: {
            type: String,
            enum: { values: STATUSES, message: "Status must be Applied, Interview, Offer or Rejected" },
            default: "Applied",
        },
        dateApplied: {
            type: String, // stored as "YYYY-MM-DD", the same format the date input uses
            match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"],
        },
        link: {
            type: String,
            trim: true,
            maxlength: [300, "Link must be 300 characters or fewer"],
            match: [/^(https?:\/\/.+)?$/, "Link must start with http:// or https://"],
        },
    },
    {
        timestamps: true, // adds createdAt and updatedAt automatically
        toJSON: {
            // Send "id" to the browser instead of MongoDB's "_id" and "__v"
            transform(doc, ret) {
                ret.id = ret._id.toString();
                delete ret._id;
                delete ret.__v;
                return ret;
            },
        },
    }
);

module.exports = mongoose.model("Application", applicationSchema);
module.exports.STATUSES = STATUSES;

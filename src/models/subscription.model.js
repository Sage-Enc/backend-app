import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    subscriber:{
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    channel:{
        type: Schema.Types.ObjectId, //Subscriber Sucscribing To These 
        ref: "User"
    }
},
{
    timestamps: true
})

const Subscription = mongoose.model("Subscription", subscriptionSchema);

export default Subscription;
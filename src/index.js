import { app } from "./app.js";
import connectDB from "./db/index.js";
import dotenv from 'dotenv';
dotenv.config({
    path: '.env'
})

connectDB().then(() => {
    app.listen(process.env.PORT || 5000, () => {
        console.log(`⚙️  Server is running on http://localhost:${process.env.PORT||5000}`);
    })
}).catch(
    (err) => {
        console.log('MONGODB connection failed ' , err);
    }
)









/*
; (async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on('error', (error) => {
            throw error;
        })

        app.listen(`${process.env.PORT}`, () => {
            console.log('App listening on port : ',`${process.env.PORT}`)
        })
    } catch (error) {
        console.log("ERR : ",error)
    }


})()
*/
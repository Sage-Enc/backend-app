// require('dotenv').config({path: '/.env'});


import dotenv from 'dotenv';
import connectDB from './db/dbconnect.js';

connectDB();

dotenv.config({
    path: './env'
})

/*
// First Approach for Connectivity

import express from 'express';
const app = express();
(async ()=>{
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

        app.on('error', (err)=>{
            throw err;
        })

        app.listen(process.env.PORT, ()=>{
            console.log('Your App is Listening on PORT:',process.env.PORT);
        })
    }catch(err){
        throw err;
    }
})();
*/
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.bu1vbif.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // Database collections
        const userCollection = client.db('bloodDonationDB').collection('users');
        const donationRequestCollection = client.db('bloodDonationDB').collection('donationRequests');

        // -------------------[Users info]----------------------
        // Create user data to the db
        app.post('/users', async(req, res) => {
            const userInfo = req.body;
            console.log(userInfo)
            const result = await userCollection.insertOne(userInfo);
            res.send(result);
        });

        // -------------------[Donation request data]------------------------
        // Read the donation requests data from the db
        app.get('/donation-requests', async (req, res) => {
            const result = await donationRequestCollection.find().toArray();
            res.send(result);
        });

        // // Read the recent donation requests data from the db
        app.get('/recent-requests', async(req, res) => {
            const recentData = await donationRequestCollection.find().sort({selectedDate: -1}).limit(3).toArray();
            res.send(recentData);
        });

        // Create the donation request data to the db
        app.post('/donation-requests', async (req, res) => {
            const data = req.body;
            const result = await donationRequestCollection.insertOne(data);
            res.send(result);
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// Get the data to the server
app.get('/', (req, res) => {
    res.send('Blood donation server is running --->');
});

// Listen the server
app.listen(port, () => {
    console.log(`Blood donation server is running on port ${port}`);
});
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const stirpe = require('stripe')(process.env.SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://blood-donator-unity.web.app'
    ],
    credentials: true,
    optionsSuccessStatus: 200
}));
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
        const blogCollection = client.db('bloodDonationDB').collection('blogs');
        const fundCollection = client.db('bloodDonationDB').collection('funds');

        // --------------------[JWT api]-------------------------
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.TOKEN_SECRET_KEY, { expiresIn: '7d' });
            res.send(token);
        });

        // ----------------[Authorization middleware]----------------
        // // Verify the token
        // const verifyToken = (req, res, next) => {
        //     if (!req.headers.authorization) {
        //         return res.status(401).send({ message: 'unathorized access' });
        //     }
        //     const token = req.headers.authorization.split(' ')[1];
        //     // console.log('token', token)
        //     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        //         if (error) {
        //             return res.status(401).send({ message: 'unathorized access' });
        //         }
        //         req.decoded = decoded;
        //         next();
        //     });
        // };

        // Verify the Admin
        // const verifyAdmin = async (req, res, next) => {
        //     const email = req.decoded.email;
        //     const query = { email: email };
        //     const user = await userCollection.findOne(query);
        //     const isAdmin = user?.role === 'admin';
        //     if (!isAdmin) {
        //         res.status(403).send({ message: 'forbidden access' });
        //     }
        //     next();
        // };

        // -------------------[Users info]----------------------
        // Read users data from the db
        app.get('/users', async (req, res) => {
            const { status } = req.query;
            console.log(status)
            let filter = {};
            if (status) {
                filter = { status };
            }
            const result = await userCollection.find(filter).toArray();
            res.send(result);
        });

        // Create user data to the db
        app.post('/users', async (req, res) => {
            const userInfo = req.body;
            // console.log(userInfo)
            const result = await userCollection.insertOne(userInfo);
            res.send(result);
        });

        // Read specific user by email
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email };
            const result = await userCollection.findOne(filter);
            res.send(result);
        });

        // Update user's info
        app.put('/users/:id', async (req, res) => {
            const id = req.params.id;
            const info = req.body;
            console.log({ id, info })
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: { ...info }
            };
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // Update user's status
        app.patch('/users-update-status/:email', async (req, res) => {
            const email = req.params.email;
            const status = req.body;
            const filter = { email };
            console.log(filter);
            const updatedDoc = {
                $set: { ...status }
            };
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // Update user's role
        app.patch('/users-update-role/:email', async (req, res) => {
            const email = req.params.email;
            const role = req.body;
            const filter = { email };
            console.log(filter);
            const updatedDoc = {
                $set: { ...role }
            };
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // -------------------[Donation request data]------------------------
        // Read all the donation requests data from the db
        app.get('/donation-requests', async (req, res) => {
            const { status } = req.query;
            console.log(status)
            let filter = {};
            if (status) {
                filter = { donation_status: status };
            }
            const result = await donationRequestCollection.find(filter).toArray();
            res.send(result);
        });

        // Read the donation requests data based on the email from the db
        app.get('/donation-requests/:email', async (req, res) => {
            const email = req.params.email;
            const { status } = req.query;
            console.log(status)
            if (email) {
                const filter = { requester_email: email }
                const result = await donationRequestCollection.find(filter).toArray();
                // If status then filter data based on the status
                if (status) {
                    const filteredData = result.filter(data => data.donation_status === status);
                    console.log(filteredData)
                    res.send(filteredData);

                } else {
                    res.send(result);
                }
            }
        });

        // Read the recent donation requests data from the db
        app.get('/recent-requests/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { requester_email: email }
            // console.log('User email filter', filter);
            const recentData = await donationRequestCollection.find(filter).sort({ selectedDate: -1 }).limit(3).toArray();
            res.send(recentData);
        });

        // Read the pending donation requests data
        app.get('/pending-requests', async (req, res) => {
            const query = { donation_status: 'pending' };
            const result = await donationRequestCollection.find(query).toArray();
            res.send(result);
        });

        // Read a single pending donation request data
        app.get('/pending-requests/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await donationRequestCollection.findOne(filter);
            res.send(result)
        });

        // Read a single data to update data
        app.get('/donation-requests-field/:id', async (req, res) => {
            const id = req.params.id;
            // console.log('update id:', id);
            const query = { _id: new ObjectId(id) };
            const result = await donationRequestCollection.findOne(query);
            res.send(result);
        });

        // Create the donation request data to the db
        app.post('/donation-requests', async (req, res) => {
            const data = req.body;
            const result = await donationRequestCollection.insertOne(data);
            res.send(result);
        });

        // Update the donation request to the db
        app.patch('/donation-requests/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    ...data
                }
            };
            const result = await donationRequestCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // Update a single field of donation request
        app.patch('/donation-requests-status/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: { ...data }
            };
            const result = await donationRequestCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // Update pending requests from the details page
        app.put('/pending-requests/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            console.log({ id, data });
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updated_doc = {
                $set: { ...data }
            };
            const result = await donationRequestCollection.updateOne(filter, updated_doc, options);
            res.send(result);
        });

        // Delete a donation request data from the db
        app.delete('/donation-requests/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await donationRequestCollection.deleteOne(filter);
            res.send(result);
        });

        // ---------------------[Blogs Data]---------------------
        // Read the blogs from the db
        app.get('/blogs', async (req, res) => {
            const { status } = req.query;
            console.log(status);
            let filter = {};
            if (status) {
                console.log('block-scope', status)
                filter = { status }
            }
            const result = await blogCollection.find(filter).toArray();
            res.send(result);
        });

        // Read the specific blog from the db
        app.get('/blogs/:id', async(req, res) => {
            const id = req.params.id;
            // console.log('Edit id:', id);
            const query = { _id: new ObjectId(id) };
            const result = await blogCollection.findOne(query);
            res.send(result);
        });

        // Read the published blogs
        app.get('/published-blogs', async (req, res) => {
            const query = { status: 'published' };
            const result = await blogCollection.find(query).toArray();
            res.send(result);
        });

        // Read a single published blog data
        app.get('/published-blogs/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await blogCollection.findOne(filter);
            res.send(result);
        });

        // Create a blog to the db
        app.post('/blogs', async (req, res) => {
            const blog = req.body;
            // console.log(blog);
            const result = await blogCollection.insertOne(blog);
            res.send(result)
        });

        // Publish blog
        app.patch('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const data = req.body;
            console.log(data)
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: { ...data }
            };
            const result = await blogCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // Update blog
        app.put('/blogs/edit-blog/:id', async(req, res) => {
            const id = req.params.id;
            console.log('edit blog id:', id);
            const data = req.body;
            console.log(data);

            const filter = { _id: new ObjectId(id) };
            const updated_doc ={
                $set: { ...data }
            };
            const result = await blogCollection.updateOne(filter, updated_doc);
            res.send(result);
        });

        // Delete a blog from the db
        app.delete('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            console.log('deleted id:', id);
            const result = await blogCollection.deleteOne(filter);
            res.send(result);
        });

        // ------------------[Data For Search Page]-------------------
        app.get('/search-value', async (req, res) => {
            const { blood_group, district, upazila } = req.query;
            console.log(blood_group, district, upazila);

            let query = {};
            if (blood_group) query.blood_group = blood_group;
            if (district) query.district = district;
            if (upazila) query.upazila = upazila;

            const result = await donationRequestCollection.find(query).toArray();
            res.send(result);
        });

        // ------------------[Fund Donation]------------------
        app.post('/create-fund-intent', async (req, res) => {
            const { value } = req.body;
            console.log('amunt', value);
            if (value === '') {
                return console.log('empty:', value)
            }
            const amount = parseInt(value * 100);

            const paymentIntent = await stirpe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });

        // ------------------[Create the fund data collection]--------------------
        app.post('/donation-fund', async (req, res) => {
            const { fund } = req.body;
            console.log(fund);
            const result = await fundCollection.insertOne(fund);
            res.send(result);
        });

        // Read the donation data 
        app.get('/donation-fund', async (req, res) => {
            const result = await fundCollection.find().toArray();
            res.send(result);
        });

        // ----------------[Admin Statistics]-----------------
        app.get('/admin-statistics', async (req, res) => {
            const query = { role: 'donor' };
            const total_user = await userCollection.countDocuments(query);
            /* here the count of total fund */
            const result = await fundCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        totalDonation: {
                            $sum: {
                                $toDouble: '$donation_amount'
                            }
                        }
                    }
                }
            ]).toArray();
            const total_donation = result.length > 0 ? result[0].totalDonation : 0;

            const total_blood_donation_request = await donationRequestCollection.estimatedDocumentCount();

            res.send({
                total_user,
                total_donation,
                total_blood_donation_request
            })
        });

        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
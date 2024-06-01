require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());


// Get the data to the server
app.get('/', (req, res) => {
    res.send('Blood donation server is running --->');
});

// Listen the server
app.listen(port, () => {
    console.log(`Blood donation server is running on port ${port}`);
});
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
//Middleware
app.use(cors())
app.use(express.json())
const verifyJWT = (req, res, next) => {
    console.log('object 11');
    const authorization = req.headers.authorization;

    if (!authorization) {
        console.log('object 15');
        return res.status(401).send({ error: true, message: 'Unauthorized access from 15 line' })
    }
    console.log('object 18');
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,
        (err, decode) => {
            if (err) {
                return res.status(401).send({ error: true, message: 'Unauthorized access from 22 line' })
            }
            console.log('user check 24', decode);
            req.decode = decode;
            next()
        })
}

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.znibnea.mongodb.net/?retryWrites=true&w=majority`;

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
        await client.connect();
        const menuCollection = client.db('bistro-DB').collection('menu');
        const reviewsCollection = client.db('bistro-DB').collection('reviews');
        const cartCollection = client.db('bistro-DB').collection('cart');
        const usersCollection = client.db('bistro-DB').collection('users');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            // here token creates
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1m' });
            // console.log(token);
            res.send({ token })
        })
        //verify admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decode.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'Forbidden access' })
            }
            next()
        }

        app.get('/', async (req, res) => {
            res.send('Server is running')
        })
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result)
        })
        app.get('/reviews', async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result)
        })
        app.get('/users', verifyJWT, async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const query = { email: user.email }
            const userExist = await usersCollection.findOne(query)
            console.log(userExist);
            if (userExist) {
                res.send({ message: 'User already exits' })
            } else {
                const result = await usersCollection.insertOne(user);
                res.send(result)
            }
        })
        app.get('/users/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            if (req.decode.email !== email) {
                res.send({ admin: false })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            const result = { admin: user?.role == 'admin' }
            res.send(result)
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log('get id', id);
            const filter = { _id: new ObjectId(id) }
            const updateDoc = { $set: { role: 'admin' } }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })
        app.post('/carts', async (req, res) => {
            const item = req.body;
            console.log(' linke94', item);
            const result = await cartCollection.insertOne(item);
            res.send(result)
        })
        app.get('/carts', verifyJWT, async (req, res) => {
            const email = req.query.email;
            console.log('email 100', email);
            if (!email) {
                console.log('object 102');
                return res.send([])
            }
            //req.decode.email comes from verifyJWT
            const decodedEmail = req.decode.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'Forbidden access' })
            }
            const query = { email: email }
            const result = await cartCollection.find(query).toArray()
            // console.log(result);
            res.send(result);
        })
        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id;
            const result = await cartCollection.deleteOne({ _id: new ObjectId(id) })
            res.send(result)
        })
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server is running on ${port} port`);
})
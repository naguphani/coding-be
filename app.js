//require env variable
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const { authenticateUser } = require('./auth_config/auth');
const logger = require('./logger');

// create own app
const app = express();


//middle ware
app.use(express.json());
app.use(cors());
app.use(express.static(__dirname + "/public"));

//body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


const { resolve } = require('path');
const server = require('http').createServer(app);
//set up socket.io
const socketio = require('socket.io');
const io = socketio(server);
require('./socket.io')(io);

//mongoose connect and set plugins
mongoose.connect('mongodb://localhost:27017/SurveyBuddy' || process.env.DB_URL,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        useCreateIndex: true,
        useFindAndModify: false
    })
    .then(() => {
        console.log('Connected to Mongo Database successfully');
        logger.info('Connected to Mongo Database successfully');
    })

    .catch(err => console.log(err));

//Passport middleware
app.use(passport.initialize());
app.use(passport.session());

//routes
app.use('/', require('./routes/project'));
app.use('/', require('./routes/users'));
app.get('/', authenticateUser, (req, res) => {
    res.status(200).send({ message: "Welcome at Survey Buddy", user: req.user });
});

// define port for app
const port = process.env.PORT || 5000;

//config listen
server.listen(port, () => {
    console.log(`server is running at port: ${port}`);
    logger.info(`server is running at port: ${port}`);
});

require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// create connection to mongodb
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// create schemas for both exercise and user
let User = mongoose.model('User', new mongoose.Schema({
  username: { type: String, unique: true, required: true }
}));

let Exercise = mongoose.model('Exercise', new mongoose.Schema({
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true },
  userId: { type: String, required: true }
}));

// GET & POST request handlers.
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// POST request handler for creating new user.
app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  if (username === '') {
    return res.json({ error: 'username is required' });
  }

  try {
    const existingUser = await User.findOne({ username: username });
    if (!existingUser) {
      let newUser = new User({ username: username });
      const savedUser = await newUser.save();
      return res.json({ username: username, _id: savedUser._id });
    } else {
      return res.json({ error: "username already exists" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET request handler for all users.
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST request handler for creating exercises. Date optional.
app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const data = req.body;

  try {
    const userObj = await User.findById(userId);
    if (userObj) {

      let exercise = new Exercise({
        username: userObj.username,
        userId: userObj._id,
        description: data.description,
        duration: data.duration,
        date: data.date ? new Date(data.date) : new Date()
      });

      const savedExercise = await exercise.save();

      return res.json({
        _id: userObj._id,
        username: userObj.username,
        description: savedExercise.description,
        duration: savedExercise.duration,
        date: new Date(savedExercise.date).toDateString()
      });

    } else {
      return res.json({ error: "User does not exists" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET request handler for retrieving a full exercise log of any user.
// Filte by from, to and limit parameters. Optional.
app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const userObj = await User.findById(userId);
    if (userObj) {

      let dateObj = {};
      let filter = { userId: userId };

      if (from) {
        dateObj['$gte'] = new Date(from);
      }
      if (to) {
        dateObj['$lte'] = new Date(to);
      }
      if (from || to) {
        filter.date = dateObj;
      }

      const exercises = await Exercise.find(filter).limit(limit);

      if (exercises) {
        let arrayLogs = exercises.map((log) => {
          return {
            description: log.description,
            duration: log.duration,
            date: log.date.toDateString()
          }
        });

        return res.json({
          username: userObj.username,
          count: arrayLogs.length,
          _id: userId,
          log: arrayLogs
        });

      } else {
        return res.json({ error: "User does not have any exercises" });
      }

    } else {
      return res.json({ error: "User does not exists" });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});


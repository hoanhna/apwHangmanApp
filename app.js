const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Word = require('./models/word');
const Score = require('./models/score');
const Game = require('./game');

const app = express();

// connect to MongoDB
mongoose.connect('mongodb://127.0.0.1/hangman', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('Connected to MongoDB');
});

// set up body-parser
app.use(bodyParser.urlencoded({ extended: true }));

// set EJS as the view engine
app.set('view engine', 'ejs');

// serve static files from the public directory
app.use(express.static('public'));

// set up routes
app.get('/', function(req, res) {
  res.render('index');
});

app.get('/play', async function(req, res) {
  try {
    const randomWord = await Word.getRandomWord();
    const game = new Game();
    await game.start(randomWord.word);
    const gameState = {
      word: game.getHiddenWord(),
      guesses: Array.from(game.guesses),
      guessesRemaining: game.guessesRemaining,
      score: game.score,
      wordId: randomWord._id,
    };
    res.render('play', gameState);
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

app.post('/play', async (req, res) => {
  const word = await Word.getRandomWord();
  const letters = word.word.split('');
  const guesses = [];
  const maxGuesses = 7;
  let remainingGuesses = maxGuesses;
  let gameWon = false;
  let gameLost = false;

  const renderParams = {
    letters,
    guesses,
    remainingGuesses,
    gameWon,
    gameLost
  };

  // Check if the user won the game
  if (!letters.some(letter => !guesses.includes(letter))) {
    // User won the game, prompt for name and save score
    const name = req.body.name;
    const score = new Score({
      name,
      word: word.word,
      guesses: guesses.length,
      maxGuesses
    });

    try {
      await score.save();
    } catch (err) {
      console.error(err);
    }

    renderParams.gameWon = true;
  }

  res.render('play', renderParams);
});

app.post('/submit-guess', async function(req, res) {
  const letter = req.body.letter;
  const wordId = req.body.wordId;
  const username = req.body.username;
  try {
    const word = await Word.findById(wordId);
    const game = new Game();
    game.word = word.word;
    game.guesses = new Set(req.body.guesses);
    game.guessesRemaining = parseInt(req.body.guessesRemaining);
    game.score = parseInt(req.body.score);
    const result = await game.guessLetter(letter);
    const gameState = {
      word: result.hiddenWord,
      guesses: Array.from(result.guesses),
      guessesRemaining: result.guessesRemaining,
      score: result.score,
      wordId: wordId,
    };
    if (result.gameOver) {
      const score = new Score({
        name: req.body.username,
        score: result.score,
        gameover: true,
      });
      const existingScore = await Score.findOne({ name: username, gameover: false });
      if (existingScore) {
        if (result.score > existingScore.score) {
          existingScore.score = result.score;
          await existingScore.save();
          gameState.highScore = true;
        }
      } else {
        await score.save();
        gameState.highScore = true;
      }
      res.render('game-over', gameState);
    } else {
      res.render('play', gameState);
    }
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

app.get('/high-scores', async function(req, res) {
  try {
    const scores = await Score.find({ gameover: true }).sort('-score').limit(10);
    res.render('high-scores', { scores: scores });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

app.get('/how-to-play', function(req, res) {
  res.render('how-to-play');
});

app.get('/submit-word', function(req, res) {
  res.render('submit-word');
});

app.post('/submit-word', async (req, res) => {
  const word = new Word({
    word: req.body.word
  });
  try {
    await word.save();
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Failed to save word' });
  }
});

// start the server
app.listen(3000, function() {
  console.log('Server started on port 3000');
});
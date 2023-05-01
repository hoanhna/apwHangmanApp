const Word = require('./models/word');
const Score = require('./models/score');

class Game {
  constructor() {
    this.word = null;
    this.guesses = new Set();
    this.guessesRemaining = 6;
    this.score = 0;
  }

  // Add getHiddenWord function
  getHiddenWord() {
    let hiddenWord = '';
    if (this.word === null) {
      throw new Error('No word has been selected yet');
    }
    for (let i = 0; i < this.word.length; i++) {
      if (this.guesses.has(this.word[i])) {
        hiddenWord += this.word[i];
      } else {
        hiddenWord += '_';
      }
    }
    return hiddenWord;
  }

  async start(username) {
    // Get a random word from the database
    const randomWord = await Word.getRandomWord();
    this.word = randomWord.word;
    this.hiddenWord = this.getHiddenWord();
  
    // Create a new score object for this game
    const newScore = new Score({
      username,
      score: 0
    });
  
    // Save the new score to the database
    await newScore.save();
  
    // Return the game state
    return {
      wordLength: this.word.length,
      guessesRemaining: this.guessesRemaining,
      guesses: Array.from(this.guesses),
      score: this.score,
    };
  }

  async guessLetter(letter) {
    // Make sure the letter hasn't already been guessed
    if (this.guesses.has(letter)) {
      throw new Error('You have already guessed that letter');
    }

    // Add the letter to the set of guesses
    this.guesses.add(letter);

    // Check if the letter is in the word
    if (this.word.includes(letter)) {
      // Update the score and return the game state
      this.score += 10;
      return {
        correctGuess: true,
        guessesRemaining: this.guessesRemaining,
        guesses: Array.from(this.guesses),
        score: this.score,
        hiddenWord: this.getHiddenWord(),
      };
    } else {
      // Decrement the number of guesses remaining and return the game state
      this.guessesRemaining -= 1;
      if (this.guessesRemaining === 0) {
        // Game over, update the score and return the game state
        await Score.updateOne({ score: this.score }, { $set: { gameover: true } });
        return {
          correctGuess: false,
          gameOver: true,
          word: this.word,
          guessesRemaining: this.guessesRemaining,
          guesses: Array.from(this.guesses),
          score: this.score,
          hiddenWord: this.getHiddenWord(),
        };
      } else {
        return {
          correctGuess: false,
          guessesRemaining: this.guessesRemaining,
          guesses: Array.from(this.guesses),
          score: this.score,
          hiddenWord: this.getHiddenWord(),
        };
      }
    }
  }
}

module.exports = Game;
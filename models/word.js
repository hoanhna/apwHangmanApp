const mongoose = require('mongoose');

const wordSchema = new mongoose.Schema({
  word: { type: String, required: true }
});

wordSchema.statics.getRandomWord = async function() {
  const count = await this.countDocuments();
  const rand = Math.floor(Math.random() * count);
  const randomWord = await this.findOne().skip(rand);
  return randomWord;
};

const Word = mongoose.model('Word', wordSchema);

module.exports = Word;
import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
  sender: String,
  message: String,
  timestamp: Number,
})

export const MessageModel = mongoose.model('Response', messageSchema)

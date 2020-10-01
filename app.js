import express from 'express'
import querystring from 'querystring'
import mongoose from 'mongoose'
// import './messageModel'
import { MessageModel } from './messageModel'

const app = express()

// List of all messages
let messages = []

// Track last active times for each sender
let users = {}

app.use(express.static('./public'))
app.use(express.json())

mongoose.connect('mongodb://localhost:27017/klack', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  //   useFindAndModify: false,
  //   useCreateIndex: true,
})

const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
db.once('open', function () {
  console.log("we're connected")
})

// generic comparison function for case-insensitive alphabetic sorting on the name field
function userSortFn(a, b) {
  var nameA = a.name.toUpperCase() // ignore upper and lowercase
  var nameB = b.name.toUpperCase() // ignore upper and lowercase
  if (nameA < nameB) {
    return -1
  }
  if (nameA > nameB) {
    return 1
  }

  // names must be equal
  return 0
}

//*made async
app.get('/messages', async (request, response) => {
  // get the current time
  const now = Date.now()

  // consider users active if they have connected (GET or POST) in last 15 seconds
  const requireActiveSince = now - 15 * 1000

  //*added
  const messageList = await MessageModel.find((err, msg) => {
    if (err) return console.error(err)
  })

  //*had to add 'let'. Didn't work without it. I believe this was one of the bugs in the previous activity.
  // create a new list of users with a flag indicating whether they have been active recently
  let usersSimple = Object.keys(users).map((x) => ({
    name: x,
    active: users[x] > requireActiveSince,
  }))

  // sort the list of users alphabetically by name
  usersSimple.sort(userSortFn)
  usersSimple.filter((a) => a.name !== request.query.for)

  // update the requesting user's last access time
  users[request.query.for] = now

  //! If I use line 75 it doesn't show other users. Line 76 shows all users and the current one active.
  // send the latest 40 messages and the full user list, annotated with active flags
  //   response.send({ messages: messages.slice(-40), users: usersSimple })
  response.send({ messages: messageList, users: usersSimple })
})

//* made async
app.post('/messages', async (request, response) => {
  // add a timestamp to each incoming message.
  const timestamp = Date.now()
  request.body.timestamp = timestamp

  //*changed
  // append the new message to the message list
  //   messages.push(request.body)
  const message = new MessageModel(request.body)

  message.save((err, msg) => {
    if (err) return console.error(err)
    console.log(msg)
  })

  // update the posting user's last access timestamp (so we know they are active)
  users[request.body.sender] = timestamp

  // Send back the successful response.
  response.status(201)
  response.send(request.body)
})

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Server started on port ${port}...`))

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at: ', promise, 'reason:', reason)
})

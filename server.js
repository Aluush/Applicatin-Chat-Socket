const express = require("express");
const socket = require("socket.io");
const MongoClient = require("mongodb").MongoClient;
const url = "mongodb://chat_admin:chat_password@localhost:27017/chat";

const client = new MongoClient(url, { useUnifiedTopology: true });

client.connect(function (err) {
  if (err) throw err;
  const db = client.db("chat");

  let allCollections = [];

  db.listCollections()
    .toArray()
    .then((collections) => {
      collections.forEach((eachCollectionDetails) => {
        allCollections.push(eachCollectionDetails.name);
      });
      if (!allCollections.includes("chats")) {
        db.createCollection("chats", function (err, res) {
          if (err) throw err;
          console.log("Chats database created!");
        });
      } else {
        console.log("Chats database found.");
      }
    })
    .catch((err) => console.log(err));
});

const app = express();

app.use(express.static("public"));

const server = app.listen(3456, function () {
  console.log("Listening to port 3456.");
});

const io = socket(server);

let usernames = {};
let rooms = ["global", "chess", "video-games"];

io.on("connection", function (socket) {
  console.log("User connected to server.");

  socket.on("createUser", function (username) {
    socket.username = username;
    usernames[username] = username;
    socket.currentRoom = "global";
    socket.join("global");
    socket.emit("updateChat", "INFO", "You have joined global room");
    socket.broadcast
      .to("global")
      .emit("updateChat", "INFO", username + " has joined global room");
    io.sockets.emit("updateUsers", usernames);
    socket.emit("updateRooms", rooms, "global");
  });

  socket.on("sendMessage", function (data) {
    io.sockets.to(socket.currentRoom).emit("updateChat", socket.username, data);

    const collection = client.db("chat").collection("chats");
    collection.insertOne(
      { username: socket.username, message: data },
      function (error, response) {
        if (error) {
          console.log("Error occurred while inserting");
        } else {
          console.log("Inserted record", response.ops[0]);
        }
      }
    );
  });

  socket.on("createRoom", function (room) {
    if (room != null) {
      rooms.push(room);
      io.sockets.emit("updateRooms", rooms, null);
    }
  });

  socket.on("updateRooms", function (room) {
    socket.broadcast
      .to(socket.currentRoom)
      .emit("updateChat", "INFO", socket.username + " left room");
    socket.leave(socket.currentRoom);
    socket.currentRoom = room;
    socket.join(room);
    socket.emit("updateChat", "INFO", "You have joined " + room + " room");
    socket.broadcast
      .to(room)
      .emit("updateChat", "INFO", socket.username + " has joined " + room + " room");
  });

  socket.on("disconnect", function () {
    delete usernames[socket.username];
    io.sockets.emit("updateUsers", usernames);
    socket.broadcast.emit(
      "updateChat",
      "INFO",
      socket.username + " has disconnected"
    );
  });
});

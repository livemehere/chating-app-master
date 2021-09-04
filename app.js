const path = require("path");
const http = require("http");
const moment = require("moment");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");

const app = express();
const server = http.createServer(app);
const PORT = 3000 || process.env.PORT;
const io = socketio(server);

app.use(express.static(path.join(__dirname, "public"))); //이렇게만 설정해도 기본으로 index.html을 '/'로 라우팅한다

const botName = "Chat Bot";
const users = [];

// 연결 이벤트 수신 대기
io.on("connection", (socket) => {
  console.log("New WS connection...");

  socket.on("joinRoom", (username, room) => {
    // 중복닉네임 처리
    if (
      users.find((item, idx) => {
        if (item.username == username) return true;
      }) == undefined
    ) {
      users.push({ username: username, room: room });
    } else {
      username = username + Date.now();
      users.push({ username: username, room: room });
    }

    socket.join(room);
    socket.broadcast
      .to(room)
      .emit("message", formatMessage(botName, `${username} join`)); //자신을 제외한 연결된 모두에게, 모두에게는 "io.emit()"

    socket.on("chatMessage", (username, msg) => {
      // 모든 연결된 soecket에게 해당 msg전달
      io.to(room).emit("message", formatMessage(username, msg));
    });
    // 유저목록
    function filterUsers() {
      let roomUsers = users.filter((user) => user.room == room);
      return roomUsers;
    }

    io.to(room).emit("userslist", filterUsers());

    // 연결 종료 이벤트 수신 대기
    socket.on("disconnect", () => {
      const leftUserIndex = users.findIndex((item, idx) => {
        if (item.username == username) return true;
      });

      users.splice(leftUserIndex, 1);
      socket.to(room).emit("userslist", filterUsers());
      io.to(room).emit(
        "message",
        formatMessage(botName, `${username} has left`)
      );
    });
  });

  //   chat.html 에서 send버튼을 눌렀을때
});

server.listen(PORT, () => console.log(`server running on port ${PORT}`));

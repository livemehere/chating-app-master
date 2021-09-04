# socket.io와 node 서버를 이용한 채팅앱 만들기

## 사용한 모듈

```js
  "dependencies": {
    "express": "^4.17.1",
    "moment": "^2.29.1",
    "socket.io": "^4.2.0"
  }
```

- `moment`는 `Date()`를 표시하기 너무편리했다.
- 이번이 총 4번째 만들어보는 socket.io를 이용한 채팅앱인 만큼, 쓸때마다 이해도가 높아지고 지금은 자유자재로 사용하고 그 원리도 더 잘 파악하게 되었다
- 추가로 `CDN` 은 `qs라이브러리`를 사용하였다. 프론트 단에서 `url query string`구문을 해석하여 값을 가져오는 것을 도와준다. 덕분에 `window.location.search` 의 존재를 알게되었고, 또 window에 활용가능 할 것들이 많을 거라는 배움을 얻었다.

## index.html

```html
<div class="join-container">
  <header class="join-header">
    <h1><i class="fas fa-smile"></i> ChatCord</h1>
  </header>
  <main class="join-main">
    <!-- route to chat.html -->
    <form action="chat.html">
      <div class="form-control">
        <label for="username">Username</label>
        <input
          type="text"
          name="username"
          id="username"
          placeholder="Enter username..."
          required
        />
      </div>
      <div class="form-control">
        <label for="room">Room</label>
        <select name="room" id="room">
          <option value="JavaScript">JavaScript</option>
          <option value="Python">Python</option>
          <option value="PHP">PHP</option>
          <option value="C#">C#</option>
          <option value="Ruby">Ruby</option>
          <option value="Java">Java</option>
        </select>
      </div>
      <button type="submit" class="btn">Join Chat</button>
    </form>
  </main>
</div>
```

## chat.html

```html
<div class="chat-container">
  <header class="chat-header">
    <h1><i class="fas fa-smile"></i>콩's 채팅앱</h1>
    <a href="index.html" class="btn">Leave Room</a>
  </header>
  <main class="chat-main">
    <div class="chat-sidebar">
      <h3><i class="fas fa-comments"></i> Room Name:</h3>
      <h2 id="room-name">JavaScript</h2>
      <h3><i class="fas fa-users"></i> Users</h3>
      <ul id="users"></ul>
    </div>
    <div class="chat-messages">
      <!-- <div class="message">
						<p class="meta">Brad <span>9:12pm</span></p>
						<p class="text">
							Lorem ipsum dolor sit amet consectetur adipisicing elit. Eligendi,
							repudiandae.
						</p>
					</div>
					<div class="message">
						<p class="meta">Mary <span>9:15pm</span></p>
						<p class="text">
							Lorem ipsum dolor sit amet consectetur adipisicing elit. Eligendi,
							repudiandae.
						</p>
					</div> -->
    </div>
  </main>
  <div class="chat-form-container">
    <form id="chat-form">
      <input
        id="msg"
        type="text"
        placeholder="Enter Message"
        required
        autocomplete="off"
      />
      <button class="btn"><i class="fas fa-paper-plane"></i> Send</button>
    </form>
  </div>
</div>

<script src="/socket.io/socket.io.js"></script>
<script
  src="https://cdnjs.cloudflare.com/ajax/libs/qs/6.10.1/qs.min.js"
  integrity="sha512-aTKlYRb1QfU1jlF3k+aS4AqTpnTXci4R79mkdie/bp6Xm51O5O3ESAYhvg6zoicj/PD6VYY0XrYwsWLcvGiKZQ=="
  crossorigin="anonymous"
  referrerpolicy="no-referrer"
></script>
<scrip src="js/main.js"></script>
```

## main.js (included in chat.html)

```js
const socket = io();
const chatForm = document.querySelector("#chat-form");
const chatMessages = document.querySelector(".chat-messages");

const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

document.querySelector("#room-name").innerHTML = room;

socket.emit("joinRoom", username, room);

// 메세지 항시 수신대기 및 div 생성 이벤트
socket.on("message", (message) => {
  createMessage(message); //html화면에 message 띄우기
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on("userslist", (userlist) => {
  document.getElementById("users").innerHTML = `
  ${userlist.map((item) => `<li>${item.username}</li>`).join("")}
  `;
});

// 메세지 전송 이벤트
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = e.target.elements.msg.value;
  socket.emit("chatMessage", username, msg);
  chatForm.reset();
});

// div 생성 함수 정의
function createMessage(message) {
  const div = document.createElement("div");
  div.classList = "message";
  div.innerHTML = `
    <p class="meta">${message.username} <span>${message.time}</span></p>
    <p class="text">${message.text}</p>`;

  document.querySelector(".chat-messages").appendChild(div);
}
```

## app.js

```js
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
```

## 배운점

- 확실히 라이브러리의 의존도를 줄여갈 수록 array, obejct 등을 자유자재로 다루는 능력이 필히 요구됬다. 그런면에서 꾸준히 VanillaJS 와 코딩테스트, 알고리즘 공부의 필요성도 느꼈다. 괜히.. 배열에서 닉네임제거하는데 애좀 먹었다...

- socket.io에서 room 을 사용해본건 처음인데, 이번엔 아주간단하게 join()만 사용하기만 하면 됬었다. 카카오톡처럼 여러개의 채팅방을 참여해두고 route하는 기능은 없었으니까.. 하지만 만약에 그런식으로 구현한다면, socket객체에서 room list를 조작할 수 있는데.. 처음부터 그방법을 공부하다가 머리가아파서 포기했던 기억이있다. 지금에서야 필요하면 바로 사용할 수 있을 것 같다.

- socket을 사용하다보면, 이게 db와 연동해서 realtime database를 구현할 수 있을거라 생각이된다. 원래그렇게 구현하기도하는지..? 우선생각은 해보게됬다.

- 그리고 이번 프로젝트를 하면서 가장 흥미롭고 더알아보고 싶은것은 DOM조작이었다. 물론 프론트엔드를 단순히 html,css,js 만을 사용하는 것은 좋지 않다고 생각한다. React를 사용하다보니, 어떻게 이런것들이 동작하는지 궁금하기도하고, 결국 기초의 부실은 앞으로 나아가는데 장애물이된다.
  리액트가 render하는 원리는 알고있지만, 결국 그것들은 js로 구현해놓은것들인데, 내가 vanillaJS로 구현할 수는 없을까? 라는 도전정신이 자꾸나를 괴롭혔다... 물론 제대로 component를 만들고한것은아니지만 element의 append,delete를 사용하여 동적인 화면을 조작하는 것 보다 innerHTML과 template literal 을활용한다면 또 여기서 socket.io를 함께사용한다면 react를 사용하지않고도, 충분히 SPA서비스를 만들수 있다. 상당히 재미있는 공부거리라 생각한다.

- 그나저나 redis랑 redux... 공부 좀 잘 해야되는데.. 너무어렵다

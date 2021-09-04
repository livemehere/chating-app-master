const socket = io();
const chatForm = document.querySelector("#chat-form");
const chatMessages = document.querySelector(".chat-messages");

const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

document.querySelector("#room-name").innerHTML = room;

socket.emit("joinRoom", username, room);

// 메세지 항시 수신대기 및 div 생성 이벤트##
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


let socket = io.connect("http://localhost:3000");

var message = document.getElementById("message"),
handle = document.getElementById("handle"),
btn = document.getElementById("send"),
output = document.getElementById("output"),
feedback = document.getElementById("feedback");


//Emit events

btn.addEventListener("click", function(){
  console.log("clicked");
  socket.emit("chat", {
    message: message.value,
    handle: handle.value
  })
  
});

message.addEventListener("keydown",function(){
  socket.emit("typing", handle.value);
})

//Listen for events
socket.on("chat", function(data){
  output.innerHTML += "<p><strong>"+data.handle+": </strong>"+data.message+"</p>";
})

socket.on("typing", function(data){
  feedback.innerHTML = "<p><em>"+data+"is typing a message</em></p>";
})
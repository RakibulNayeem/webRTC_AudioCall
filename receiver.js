var name;
var connectedUser;
var conn = new WebSocket('ws://localhost:9090');
var yourConn;
var stream;

conn.onopen = function () {
    console.log("Connected to the signaling server");
};

conn.onmessage = function (msg) {
    console.log("Got message", msg.data);
    var data = JSON.parse(msg.data);

    switch (data.type) {
        case "login":
            handleLogin(data.success);
            break;
        case "offer":
            handleOffer(data.offer, data.name);
            break;
        case "answer":
            handleAnswer(data.answer);
            break;
        case "candidate":
            handleCandidate(data.candidate);
            break;
        case "leave":
            handleLeave();
            break;
        default:
            break;
    }
};

conn.onerror = function (err) {
    console.log("Got error", err);
};

function send(message) {
    if (connectedUser) {
        message.name = connectedUser;
    }

    conn.send(JSON.stringify(message));
}

var loginPage = document.querySelector('#loginPage');
var usernameInput = document.querySelector('#usernameInput');
var loginBtn = document.querySelector('#loginBtn');

var callPage = document.querySelector('#callPage');
var remoteAudio = document.querySelector('#remoteAudio');
var acceptBtn = document.querySelector('#acceptBtn');
var hangUpBtn = document.querySelector('#hangUpBtn');

callPage.style.display = "none";

loginBtn.addEventListener("click", function (event) {
    name = usernameInput.value;

    if (name.length > 0) {
        send({
            type: "login",
            name: name
        });
    }
});

function handleLogin(success) {
    if (success === false) {
        alert("Ooops...try a different username");
    } else {
        loginPage.style.display = "none";
        callPage.style.display = "block";

        var configuration = {
            "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]
        };

        yourConn = new RTCPeerConnection(configuration);

        yourConn.ontrack = function (e) {
            if (remoteAudio && e.streams && e.streams[0]) {
                remoteAudio.srcObject = e.streams[0];
            }
        };
    }
}

function handleOffer(offer, name) {
    connectedUser = name;
    yourConn.setRemoteDescription(new RTCSessionDescription(offer));

    var isCallAccepted = confirm("You have an incoming call from " + name + ". Do you want to accept?");
    
    if (isCallAccepted) {
        yourConn.createAnswer().then(function (answer) {
            console.log("Creating answer from receiver.");
            return yourConn.setLocalDescription(answer);
        }).then(function () {
            send({
                type: "answer",
                answer: yourConn.localDescription
            });
        }).catch(function (error) {
            alert("Error when creating an answer");
        });
    } else {
        send({
            type: "leave"
        });
        handleLeave();
    }
}

function handleAnswer(answer) {
    console.log("handling answer in receiver.");
    yourConn.setRemoteDescription(new RTCSessionDescription(answer));
}

function handleCandidate(candidate) {
    console.log("handling candidate in receiver.");
    yourConn.addIceCandidate(new RTCIceCandidate(candidate));
}

function handleLeave() {
    connectedUser = null;
    remoteAudio.srcObject = null;

    yourConn.close();
    yourConn.onicecandidate = null;
    yourConn.ontrack = null;
}

hangUpBtn.addEventListener("click", function () {
    send({
        type: "leave"
    });

    handleLeave();
});

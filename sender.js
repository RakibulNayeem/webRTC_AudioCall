// sender.js

var name;
var connectedUser;
var conn = new WebSocket('ws://localhost:9090');

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
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn');

var hangUpBtn = document.querySelector('#hangUpBtn');
var remoteAudio = document.querySelector('#remoteAudio');

var yourConn;
var stream;

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

        navigator.mediaDevices.getUserMedia({ video: false, audio: true }).then(function (myStream) {
            stream = myStream;

            var configuration = {
                "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]
            };

            yourConn = new RTCPeerConnection(configuration);

            yourConn.ontrack = function (e) {
                if (remoteAudio && e.streams && e.streams[0]) {
                    remoteAudio.srcObject = e.streams[0];
                }
            };

            stream.getTracks().forEach(track => yourConn.addTrack(track, stream));

            yourConn.onicecandidate = function (event) {
                if (event.candidate) {
                    send({
                        type: "candidate",
                        candidate: event.candidate
                    });
                }
            };
        }).catch(function (error) {
            console.log(error);
        });
    }
}

callBtn.addEventListener("click", function () {
    var callToUsername = callToUsernameInput.value;

    if (callToUsername.length > 0 && yourConn && yourConn.connectionState !== 'closed') {
        connectedUser = callToUsername;

        yourConn.createOffer().then(function (offer) {
            return yourConn.setLocalDescription(offer);
        }).then(function () {
            send({
                type: "offer",
                offer: yourConn.localDescription
            });
        }).catch(function (error) {
            alert("Error when creating an offer");
        });
    }
});

function handleOffer(offer, name) {
    connectedUser = name;
    yourConn.setRemoteDescription(new RTCSessionDescription(offer));

    yourConn.createAnswer().then(function (answer) {
        return yourConn.setLocalDescription(answer);
    }).then(function () {
        send({
            type: "answer",
            answer: yourConn.localDescription
        });
    }).catch(function (error) {
        alert("Error when creating an answer");
    });
}

function handleAnswer(answer) {
    yourConn.setRemoteDescription(new RTCSessionDescription(answer));
}

function handleCandidate(candidate) {
    yourConn.addIceCandidate(new RTCIceCandidate(candidate));
}

hangUpBtn.addEventListener("click", function () {
    send({
        type: "leave"
    });

    handleLeave();
});

function handleLeave() {
    connectedUser = null;
    remoteAudio.srcObject = null;

    yourConn.close();
    yourConn.onicecandidate = null;
    yourConn.ontrack = null;
}

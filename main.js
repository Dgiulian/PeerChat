import "./style.css";
import './libs/agora-rtm-sdk-1.4.4';

let localStream;
let remoteStream;
let peerConnection;

const token = null;
const APP_ID = import.meta.env.VITE_APP_ID;
const uid = Math.floor(Math.random() * 10000) + '';
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const roomId = urlParams.get('room');
if(!roomId) {
  window.location = 'lobby.html'
}

let client;
let channel;


const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    }
  ]
}
let constraints = {
  video:{
      width:{min:640, ideal:1920, max:1920},
      height:{min:480, ideal:1080, max:1080},
  },
  audio:true
}
let init = async () => {
  // Create Agora client
  client = await AgoraRTM.createInstance(APP_ID)

  // Login
  await client.login({ uid, token });
  // Find or create channel by name
  channel = client.createChannel(roomId);
  // Join channel
  channel.join()

  localStream = await navigator.mediaDevices.getUserMedia(constraints);
  document.getElementById("user-1").srcObject = localStream;
  channel.on('MemberJoined', handleUserJoined)
  channel.on('MemberLeft', handleUserLeft)
  client.on('MessageFromPeer', handleMessageFromPeer)
};
async function createPeerConnection(memberId) {
  peerConnection = new RTCPeerConnection();
  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;
  document.getElementById("user-2").style.display = 'block';
  
  document.getElementById("user-1").classList.add('smallFrame');
  

  // Add tracks to local connection
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  })
  // Listen for peer connection tracks
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track, remoteStream)
    })
  }
  // Generate ICE candidates
  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      console.log("New ICE candidate: ", event.candidate)
      client.sendMessageToPeer({ text: JSON.stringify({ type: 'candidate', 'candidate': event.candidate }) }, memberId)
    }
  }
}
async function createOffer(memberId) {
  await createPeerConnection(memberId);
  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  client.sendMessageToPeer({ text: JSON.stringify({ type: 'offer', 'offer': offer }) }, memberId)
}
async function createAnswer(memberId, offer) {
  await createPeerConnection(memberId);
  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer(
  )
  await peerConnection.setLocalDescription(answer)
  client.sendMessageToPeer({ text: JSON.stringify({ type: 'answer', answer }) }, memberId)

}

async function handleUserJoined(memberId) {
  console.log("A new user joined the channel", memberId)
  createOffer(memberId);
}

async function handleMessageFromPeer(msg, memberId) {
  const message = JSON.parse(msg.text)
  console.log(msg.text, message.type, memberId);
  if (message.type === 'offer') {
    console.log('Adding Offer')
    createAnswer(memberId, message.offer)
  }
  if (message.type === 'answer') {
    console.log('Adding Answer')
    await addAnswer(message.answer)
  }
  if (message.type === 'candidate') {
    if (peerConnection) {
      console.log('Adding candidate')
      peerConnection.addIceCandidate(message.candidate)
    }
  }
}

async function addAnswer(answer) {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer)
  }
}
async function handleUserLeft(memberId) {
  document.getElementById('user-2').style.display = 'none';
  document.getElementById("user-1").classList.remove('smallFrame');
  await leaveChannel();
}
async function leaveChannel() {
  await channel.leave()
  await client.logout()
}

async function toggleCamera () {
  const videoTrack = localStream.getTracks().find(track=>track.kind === 'video');
  if(videoTrack.enabled) {
    videoTrack.enabled = false
    document.getElementById('camera-btn').style.backgroundColor = 'rgba(255,80,80,1)'
  } else {
    videoTrack.enabled = true
    document.getElementById('camera-btn').style.backgroundColor = 'rgba(179,102,249,.5)'  
  }
}
async function toggleMic () {
  const audioTrack = localStream.getTracks().find(track=>track.kind === 'audio');
  if(audioTrack.enabled) {
    audioTrack.enabled = false
    document.getElementById('mic-btn').style.backgroundColor = 'rgba(255,80,80,1)'
  } else {
    audioTrack.enabled = true
    document.getElementById('mic-btn').style.backgroundColor = 'rgba(179,102,249,.5)'  
  }
}
window.addEventListener('beforeunload', () => leaveChannel())
document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMic)
init();

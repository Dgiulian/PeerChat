import './style.css'

let localStream;
let remoteStream;

let init = async ()=>{ 
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false
  });
  console.log(localStream);
  document.getElementById('user-1').srcObject = localStream;

}
init();
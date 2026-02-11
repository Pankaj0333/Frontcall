"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function Room() {
  const { roomId } = useParams();
  const localStream = useRef(null);
  const peersRef = useRef({});
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        localStream.current = stream;

        socket.emit("join-room", roomId);

        socket.on("existing-users", (users) => {
          users.forEach(userId => {
            createPeerConnection(userId, true);
          });
        });

        socket.on("user-joined", (userId) => {
          createPeerConnection(userId, false);
        });

        socket.on("offer", async ({ sender, offer }) => {
          const peer = createPeerConnection(sender, false);
          await peer.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          socket.emit("answer", { target: sender, answer });
        });

        socket.on("answer", async ({ sender, answer }) => {
          await peersRef.current[sender]
            .setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on("ice-candidate", async ({ sender, candidate }) => {
          await peersRef.current[sender]
            .addIceCandidate(new RTCIceCandidate(candidate));
        });

        socket.on("user-left", (userId) => {
          if (peersRef.current[userId]) {
            peersRef.current[userId].close();
            delete peersRef.current[userId];
          }
        });
      });

    return () => socket.disconnect();
  }, []);

  const createPeerConnection = (userId, isInitiator) => {
    const peer = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
      ],
    });

    peersRef.current[userId] = peer;

    localStream.current.getTracks().forEach(track => {
      peer.addTrack(track, localStream.current);
    });

    peer.onicecandidate = event => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          target: userId,
          candidate: event.candidate,
        });
      }
    };

    peer.ontrack = event => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.play();
    };

    if (isInitiator) {
      peer.createOffer()
        .then(offer => peer.setLocalDescription(offer))
        .then(() => {
          socket.emit("offer", {
            target: userId,
            offer: peer.localDescription,
          });
        });
    }

    return peer;
  };

  const toggleMute = () => {
    localStream.current.getAudioTracks()[0].enabled = muted;
    setMuted(!muted);
  };

  return (
    <div style={{ textAlign: "center", marginTop: 50 }}>
      <h2>Room: {roomId}</h2>
      <button onClick={toggleMute}>
        {muted ? "Unmute" : "Mute"}
      </button>
    </div>
  );
}
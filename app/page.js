"use client";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const router = useRouter();

  const createMeeting = () => {
    const roomId = uuidv4();
    router.push(`/room/${roomId}`);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>🎤 Voice Meet</h1>
      <button onClick={createMeeting}>Create Meeting</button>
    </div>
  );
}
const API = "https://hotel-management-c-grand-api-server-one.vercel.app";

async function loadRooms() {
  const res = await fetch(`${API}/api/rooms`);
  const rooms = await res.json();

  const container = document.getElementById("rooms");
  container.innerHTML = "";

  rooms.forEach(room => {
    const div = document.createElement("div");
    div.innerHTML = `${room.number} — ${room.status}`;
    container.appendChild(div);
  });
}

loadRooms();
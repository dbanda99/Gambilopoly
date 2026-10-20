import { PeerServer } from "peer";
PeerServer({ host: "127.0.0.1", port: 9000, path: "/" });
console.log("Local multiplayer test signaling ready on 127.0.0.1:9000");

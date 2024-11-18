import { createServer } from "node:http";
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello World!\n");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Started listening on port " + PORT);
});

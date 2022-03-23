const http = require("http");                 // http server core module
const https = require('https');
const fs = require('fs');
const path = require("path");
const express = require("express");           // web framework external module
const portHTTPS =  443

const app = express();
var DIST_DIR = path.join(__dirname, "dist");
app.use(express.static(DIST_DIR));

const httpsServer = require("https").createServer({
     key: fs.readFileSync("/home/ubuntu/key.pem"),
     cert: fs.readFileSync("/home/ubuntu/cert.pem")
},app);

 httpsServer.listen(portHTTPS, () => {
     console.log("listening on https://localhost:" + portHTTPS);
    });

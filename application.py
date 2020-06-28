import os
import requests

from flask import Flask, render_template, request, jsonify, json
from flask_socketio import SocketIO, emit
from flask_jsglue import JSGlue

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)
jsglue = JSGlue(app)

channels = []
content = {}

@app.route("/")
def index():
    return render_template("index.html", channels = channels)

@socketio.on("add channel")
def channel(data):
    name = data["name"]
    channels.append(name)
    content[name] = []
    emit("create channel", channels, broadcast=True)

@socketio.on("send message")
def message(data):
    author = data["author"]
    message = data["message"]
    timestamp = data["timestamp"]
    channel = data["channel"]
    post = {"author": author, "message": message, "timestamp": timestamp}
    content[channel].insert(0, post)
    if len(content[channel]) > 100:
        content[channel] = content[channel][0:99]
    post["channel"] = channel
    emit("publish message", post, broadcast=True)

@app.route("/channel")
def channel():
    channel = request.args.get("type")
    channel_content = json.dumps(content[channel])
    return channel_content

@app.route("/<path>")
def redirect(path):
    return render_template("index.html", channels = channels)

@socketio.on("send file")
def file_upload(data):
    author = data["author"]
    file_name = data["file_name"]
    url = data["url"]
    timestamp = data["timestamp"]
    channel = data["channel"]
    post = {"author": author, "file_name": file_name, "url": url, "timestamp": timestamp}
    content[channel].insert(0, post)
    if len(content[channel]) > 100:
        content[channel] = content[channel][0:99]
    post["channel"] = channel
    emit("publish file", post, broadcast=True)
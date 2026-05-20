from flask import Flask, request, jsonify
from flask_cors import CORS
import ollama
import fitz
import os

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/chat", methods=["POST"])
def chat():

    message = request.form.get("message", "")

    uploaded_file = request.files.get("file")

    content = message
    images = []

    if uploaded_file:

        filepath = os.path.join(
            UPLOAD_FOLDER,
            uploaded_file.filename
        )

        uploaded_file.save(filepath)

        # IMAGE SUPPORT
        if filepath.lower().endswith((
            ".png",
            ".jpg",
            ".jpeg",
            ".webp"
        )):

            images.append(filepath)

        # PDF SUPPORT
        elif filepath.lower().endswith(".pdf"):

            pdf = fitz.open(filepath)

            text = ""

            for page in pdf:
                text += page.get_text()

            content += "\n\nPDF CONTENT:\n" + text

        # TXT SUPPORT
        elif filepath.lower().endswith(".txt"):

            with open(filepath, "r", encoding="utf-8") as f:
                content += "\n\nTEXT FILE:\n" + f.read()

    response = ollama.chat(
        model="gemma3:4b",
        messages=[
            {
                "role": "user",
                "content": content,
                "images": images
            }
        ]
    )

    return jsonify({
        "reply": response["message"]["content"]
    })

app.run(port=5000)

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_index_document_returns_immediate_ack():
    payload = {
        "documentId": "doc123",
        "workspaceId": "ws123",
        "filePath": "/tmp/example.txt",
        "mimeType": "text/plain",
    }
    response = client.post("/index-document", json=payload)
    assert response.status_code == 200
    assert response.json() == {"accepted": True}


def test_query_without_gemini_key_returns_503():
    payload = {"workspaceId": "ws123", "question": "What is JWT?"}
    response = client.post("/query", json=payload)
    assert response.status_code == 503
    assert "GEMINI_API_KEY" in response.json()["detail"]

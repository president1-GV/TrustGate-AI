@echo off
title TrustGate AI — Forensic Microservice (PaddleOCR 3.7.0)
echo ===============================================================================
echo                TRUSTGATE AI — LOCAL FORENSIC MICROSERVICE
echo                PaddleOCR 3.7.0 + Document Forensics + Anti-Spoofing
echo ===============================================================================
cd /d "%~dp0"
if exist ".\.venv\Scripts\python.exe" (
    echo [INFO] Activating virtual environment .venv ...
    .\.venv\Scripts\python.exe -m uvicorn ai.inference.service:app --host 127.0.0.1 --port 8000
) else (
    echo [ERROR] Virtual environment .venv not found. Please verify Python setup.
)
pause

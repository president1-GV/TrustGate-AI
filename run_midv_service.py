"""
TRUSTGATE AI BILLION — MIDV-2020 Python LLM Service Launcher
Dataset: MIDV-2020 (L3i Laboratory, University of La Rochelle — http://l3i-share.univ-lr.fr)
Usage:
    python run_midv_service.py [--port 8000]
"""

import sys
import argparse
from midv_llm_engine.server import start_server, PORT

def main():
    parser = argparse.ArgumentParser(description="TrustGate MIDV-2020 Python LLM Service")
    parser.add_argument("--port", type=int, default=PORT, help="Port to listen on (default: 8000)")
    args = parser.parse_args()

    print("=" * 65)
    print("  TRUSTGATE AI BILLION — MIDV-2020 LLM FORENSIC ENGINE")
    print("  Provider: L3i Laboratory, University of La Rochelle")
    print("  Dataset URL: http://l3i-share.univ-lr.fr")
    print(f"  Service Endpoint: http://localhost:{args.port}")
    print("=" * 65)

    start_server(port=args.port)

if __name__ == "__main__":
    main()

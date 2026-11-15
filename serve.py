import http.server, socketserver, webbrowser, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
with socketserver.TCPServer(("127.0.0.1", 8000), http.server.SimpleHTTPRequestHandler) as s:
    print("Open http://127.0.0.1:8000"); webbrowser.open("http://127.0.0.1:8000"); s.serve_forever()

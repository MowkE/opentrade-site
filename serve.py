#!/usr/bin/env python3
"""Dev server: static files with caching disabled, so edits always land."""
import http.server, functools, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        super().end_headers()
    def log_message(self, *a):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
handler = functools.partial(NoCache, directory='/Users/samahiththellakal/opentrade-site')
http.server.ThreadingHTTPServer(('', port), handler).serve_forever()

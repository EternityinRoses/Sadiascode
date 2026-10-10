import json, urllib.request, urllib.error

for body in ({}, {"seat": "sadia", "image": "x"}):
    req = urllib.request.Request("http://127.0.0.1:8622/api/dev/shot", data=json.dumps(body).encode(),
                                 headers={"content-type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            print(r.status, r.read()[:200])
    except urllib.error.HTTPError as e:
        print(e.code, e.read()[:200])
    except Exception as e:
        print("ERR", e)

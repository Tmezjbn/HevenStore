---
description: Browser rule — isolated Brave only, one instance, one tab
trigger: always_on
---

Browser rule: if you need a browser, use isolated Brave — never Chrome, never the user's running Brave. Launch ONCE and reuse it:

`brave.exe --remote-debugging-port=9222 --user-data-dir="<temp dir>" --incognito`

(brave.exe is usually at `C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe`; `where.exe brave` to find it.)

One instance, one tab, navigate the same tab. Playwright MCP connects via `--cdp-endpoint http://localhost:9222`. Delete the temp dir and close Brave when done.

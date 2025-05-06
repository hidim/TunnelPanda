# Tunnel Panda 🐼

> Cloudflare Tunnel + Basic Auth + Token tabanlı stream proxy  
> **Mobil Uygulama → `https://red.tunnelpanda.com` → Ollama API**

---

## ✨ Özellikler
| Katman | Özellik |
|--------|---------|
| **Cloudflare Tunnel** | Özel alt alan adına (`api.tunnelpanda.com`) yönlendirilen outbound‑only tünel  [oai_citation:0‡Stack Overflow](https://stackoverflow.com/questions/59864497/basic-auth-doesnt-work-in-kubernetes-ingress?utm_source=chatgpt.com) |
| **Zero Trust / Access** | Cloudflare *Service Token* veya e‑posta SSO yerine **Basic Auth** benzeri “static credentials” politikası (Service Auth)  [oai_citation:1‡Cloudflare Docs](https://developers.cloudflare.com/cloudflare-one/identity/service-tokens/?utm_source=chatgpt.com) |
| **Reverse Proxy (Node 18+)** | *Helmet*, *rate‑limit*, *Morgan* loglama; `X‑APP‑TOKEN` & opsiyonel JWT doğrulama; **stream**‑forwarding |
| **Ollama API** | `POST /v1/chat/completions` çağrıları chunked JSON olarak aktarılır |

---

## 📦 Proje Yapısı
```txt
tunnel-panda/
├── cloudflared/
│   └── config.yml
├── src/
│   ├── app.js        # Express reverse‑proxy
│   └── config.js
├── .env.example
├── package.json
└── README.md
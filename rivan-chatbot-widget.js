/**
 * Rivan Chatbot Widget (Firebase RTDB Direct Version)
 */
(function () {
  const scriptTag = document.currentScript;
  const businessId = scriptTag.getAttribute("data-business-id");

  // YOUR FIREBASE RTDB BASE URL
  const firebaseUrl = "https://rivan-chatbot-default-rtdb.firebaseio.com";

  if (!businessId) {
    console.error("Rivan Chatbot: missing data-business-id on <script> tag.");
    return;
  }

  let config = null;
  let isOpen = false;

  // ---------------------------------------------------------------
  // Inject Styles
  // ---------------------------------------------------------------
  const style = document.createElement("style");
  style.textContent = `
    #rivan-chat-bubble {
      position: fixed; bottom: 95px; right: 25px;
      width: 55px; height: 55px; border-radius: 50%;
      background: #25D366 !important;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.3);
      z-index: 999999; transition: transform 0.2s ease;
    }
    #rivan-chat-bubble:hover { transform: scale(1.06); }
    #rivan-chat-bubble svg { width: 28px; height: 28px; fill: #fff; }

    #rivan-chat-window {
      position: fixed; bottom: 42px; right: 115px;
      width: 400px; max-width: 92vw; height: 640px; max-height: 80vh;
      background: #fff; border-radius: 16px; overflow: hidden;
      box-shadow: 0 10px 35px rgba(0,0,0,0.25);
      display: none; flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      z-index: 999999;
    }
    #rivan-chat-window.open { display: flex; }

    #rivan-chat-header {
      background: #25D366 !important; color: #fff;
      padding: 14px 16px; font-weight: 600; font-size: 15px;
      display: flex; justify-content: space-between; align-items: center;
    }
    #rivan-chat-header .close-btn { cursor: pointer; font-size: 18px; opacity: 0.8; }
    #rivan-chat-header .close-btn:hover { opacity: 1; }

    #rivan-chat-messages {
      flex: 1; padding: 14px; overflow-y: auto; background: #f7f7f8;
      display: flex; flex-direction: column;
    }
    .rivan-msg {
      max-width: 88%; padding: 10px 14px; border-radius: 12px;
      margin-bottom: 10px; font-size: 13.5px; line-height: 1.5;
      white-space: pre-wrap; word-wrap: break-word; text-align: left;
    }
    .rivan-msg.bot {
      background: #fff; color: #222; border: 1px solid #e5e5e5;
      align-self: flex-start; margin-right: auto;
    }
    .rivan-msg.user {
      background: var(--rivan-accent, #c9a45c); color: #fff;
      margin-left: auto;
    }
    .rivan-msg a { color: #25D366; font-weight: 600; text-decoration: underline; }

    #rivan-quick-replies {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px; padding: 10px 12px;
      background: #fff; border-top: 1px solid #e5e5e5;
    }
    .rivan-quick-reply {
      background: #f4f6f5; border: 1px solid #e5e5e5;
      color: #222222; border-radius: 10px;
      padding: 8px 6px; font-size: 12px; font-weight: 600; cursor: pointer;
      text-align: center; display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease; box-sizing: border-box;
    }
    .rivan-quick-reply:hover { background: #25D366; color: #fff; border-color: #25D366; }

    #rivan-chat-footer {
      text-align: center; font-size: 10.5px; color: #999;
      padding: 6px 0; background: #fff;
    }
    #rivan-chat-footer a { color: #999; text-decoration: none; }
    #rivan-chat-footer a:hover { text-decoration: underline; }

        /* ---- Mobile responsiveness ---- */
    @media (max-width: 600px) {
      #rivan-chat-bubble {
        bottom: 20px; right: 20px;
        width: 56px; height: 56px;
      }
      #rivan-chat-window {
        bottom: 0; right: 0; left: 0; top: 0;
        width: 100%; max-width: 100%;
        height: 100%; max-height: 100%;
        border-radius: 0;
      }
      #rivan-quick-replies {
        padding: 10px;
      }
      .rivan-quick-reply {
        font-size: 13px;
        padding: 10px 6px;
      }
      .rivan-msg {
        font-size: 14px;
      }
    }
  `;
  document.head.appendChild(style);

  // ---------------------------------------------------------------
  // Build DOM
  // ---------------------------------------------------------------
  const bubble = document.createElement("div");
  bubble.id = "rivan-chat-bubble";
  bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;

  const chatWindow = document.createElement("div");
  chatWindow.id = "rivan-chat-window";
  chatWindow.innerHTML = `
    <div id="rivan-chat-header">
      <span id="rivan-chat-title">Chat with us</span>
      <span class="close-btn">&times;</span>
    </div>
    <div id="rivan-chat-messages"></div>
    <div id="rivan-quick-replies"></div>
    <div id="rivan-chat-footer">Powered by <a href="https://instagram.com/rivan.dev" target="_blank">Rivan</a></div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(chatWindow);

  const messagesEl = chatWindow.querySelector("#rivan-chat-messages");
  const quickRepliesEl = chatWindow.querySelector("#rivan-quick-replies");
  const closeBtn = chatWindow.querySelector(".close-btn");
  const titleEl = chatWindow.querySelector("#rivan-chat-title");

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  function addMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = `rivan-msg ${sender}`;

    let formattedText = text || "";

    // Support bolding via **word**
    formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Parse links
    const urlPattern = /(https?:\/\/[^\s\)]+)/g;
    formattedText = formattedText.replace(
      urlPattern,
      '<a href="$1" target="_blank" rel="noopener noreferrer">Open Link</a>'
    );

    msg.innerHTML = formattedText;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderQuickReplies(quickReplies) {
    quickRepliesEl.innerHTML = "";
    quickReplies.forEach((qr) => {
      const btn = document.createElement("div");
      btn.className = "rivan-quick-reply";
      btn.textContent = qr.label;
      btn.onclick = () => handleUserAction({ key: qr.key, label: qr.label });
      quickRepliesEl.appendChild(btn);
    });
  }

  function handleUserAction({ key, label }) {
    addMessage(label, "user");
    
    // Fetch response directly from Firebase RTDB
    if (config && config.responses && config.responses[key]) {
      addMessage(config.responses[key], "bot");
    } else if (config && config.fallbackText) {
      addMessage(config.fallbackText, "bot");
    } else {
      addMessage("Sorry, I didn't understand that.", "bot");
    }
  }

  async function init() {
    try {
      // Direct fetch from Firebase RTDB (.json extension required by Firebase)
      const res = await fetch(`${firebaseUrl}/${businessId}.json`);
      config = await res.json();

      if (!config) {
        addMessage("Business profile not found.", "bot");
        return;
      }

      document.documentElement.style.setProperty("--rivan-theme", config.themeColor || "#25D366");
      document.documentElement.style.setProperty("--rivan-accent", config.accentColor || "#c9a45c");
      titleEl.textContent = config.businessName || "Chat with us";

      addMessage(config.welcomeMessage, "bot");
      renderQuickReplies(config.quickReplies || []);
    } catch (err) {
      addMessage("Chat is temporarily unavailable. Please try again later.", "bot");
    }
  }

  // ---------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------
  bubble.addEventListener("click", () => {
    isOpen = !isOpen;
    chatWindow.classList.toggle("open", isOpen);
    if (isOpen && !config) init();
  });

  closeBtn.addEventListener("click", () => {
    isOpen = false;
    chatWindow.classList.remove("open");
  });
})();

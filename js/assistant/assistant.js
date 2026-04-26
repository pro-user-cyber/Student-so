(function() {
  'use strict';

  // 🔥 USE HTML'S API_BASE OR FALLBACK - PERFECT SYNC
  const API_BASE = window.API_BASE || (
    window.location.hostname === 'localhost'
      ? 'http://localhost:3000'
      : 'https://student-so.onrender.com'
  );

  console.log('🔗 StudentOS AI - Connected to:', API_BASE);

  // 🔥 GLOBAL FUNCTIONS - EXPOSED PROPERLY
  window.addMessage = null;
  window.scrollChatToBottom = null;

  function init() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const sendButton = chatForm?.querySelector('button[type="submit"]');

    if (!chatForm || !chatInput || !chatMessages) {
      console.error('❌ Missing chat elements');
      return;
    }

    let isSending = false;

    // 🔥 EXPOSE GLOBALLY - THIS WAS THE MISSING PIECE
    window.addMessage = appendMessage;
    window.scrollChatToBottom = () => scrollToBottom(chatMessages);

    // Auto-resize input
    chatInput.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      sendButton.disabled = !this.value.trim() || isSending;
    });

    // Event listeners
    chatForm.addEventListener('submit', sendMessage);
    chatInput.addEventListener('keydown', handleEnter);

    // Initial setup
    chatInput.dispatchEvent(new Event('input'));
    testConnection();

    async function testConnection() {
      try {
        const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
        if (res.ok) {
          updateStatus('🟢 Live', 'GPT-4o-mini ready');
          appendMessage('assistant', '🚀 AI Study Assistant online! Ask about math, science, coding, or paste notes.');
        } else {
          updateStatus('🟡 Warming up', 'Backend waking...');
        }
      } catch {
        updateStatus('🟠 Offline mode', 'Send a message to wake backend');
        appendMessage('assistant', '⚠️ Backend asleep (Render free tier). Chat to wake it!');
      }
    }

    async function sendMessage(e) {
      e.preventDefault();
      
      if (isSending) {
        console.log("🚫 Duplicate blocked");
        return;
      }

      const message = chatInput.value.trim();
      if (!message) return;

      // Add user message
      appendMessage('user', message);
      chatInput.value = '';
      chatInput.style.height = 'auto';
      
      // Lock UI
      sendButton.disabled = true;
      chatInput.disabled = true;
      isSending = true;

      const thinkingId = appendThinking();

      try {
        console.log(`📤 Sending: "${message.slice(0, 50)}..."`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 35000); // Render-safe

        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        removeElement(thinkingId);

        // 🔥 TRUST YOUR BACKEND - ONLY data.reply
        if (data.reply) {
          appendMessage('assistant', data.reply);
          console.log('✅ Response delivered');
        } else {
          throw new Error(`No reply in response: ${JSON.stringify(data)}`);
        }

      } catch (error) {
        console.error('🚨 Chat error:', error);
        removeElement(thinkingId);
        
        let errorMsg;
        if (error.name === 'AbortError') {
          errorMsg = '⏰ Timeout (35s) - Backend waking up?';
        } else if (error.message.includes('Failed to fetch')) {
          errorMsg = '🌐 Network error - Check connection';
        } else {
          errorMsg = error.message;
        }
        
        appendMessage('assistant', `❌ ${errorMsg}`);
      } finally {
        // Unlock UI
        isSending = false;
        sendButton.disabled = !chatInput.value.trim();
        chatInput.disabled = false;
        chatInput.focus();
      }
    }

    function handleEnter(e) {
      if (chatInput.disabled || isSending || e.shiftKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        chatForm.requestSubmit();
      }
    }

    function appendMessage(type, text) {
      const div = createMessageEl(type, text);
      chatMessages.appendChild(div);
      scrollToBottom(chatMessages);
    }

    function appendThinking() {
      const id = `thinking-${Date.now()}`;
      const div = createMessageEl('assistant', '🤔 AI Thinking...');
      div.id = id;
      chatMessages.appendChild(div);
      scrollToBottom(chatMessages);
      return id;
    }

    function createMessageEl(type, text) {
      const div = document.createElement('div');
      div.className = `message ${type}`;
      div.innerHTML = `
        <div class="message-content">
          <span class="message-sender">${type === 'user' ? 'You' : 'AI'}</span>
          <div class="message-text">${escapeHtml(text)}</div>
        </div>
      `;
      return div;
    }

    function removeElement(id) {
      const el = document.getElementById(id);
      el?.remove();
    }

    function scrollToBottom(container) {
      container.scrollTop = container.scrollHeight;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function updateStatus(iconText, subText) {
      const statsEl = document.getElementById('session-stats');
      const statusEl = document.getElementById('connection-status');
      if (statsEl) statsEl.textContent = iconText;
      if (statusEl) statusEl.textContent = subText;
    }
  }

  // Initialize when ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

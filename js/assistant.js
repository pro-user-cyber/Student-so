(function() {
  'use strict';

  // ✅ Wait for DOM + all functions defined BEFORE use
  function init() {
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    if (!chatForm || !chatInput || !chatMessages) {
      console.error('❌ Chat elements missing');
      return;
    }

    let isSending = false;

    // Bind events
    chatForm.addEventListener('submit', sendMessage);
    chatInput.addEventListener('keydown', handleEnter);

    // Test connection
    testConnection();

    function testConnection() {
      fetch('http://localhost:3000/health', { cache: 'no-store' })
        .then(res => res.ok ? console.log('✅ Backend OK') : console.warn('⚠️ Backend issue'))
        .catch(() => console.warn('⚠️ No backend'));
    }

    async function sendMessage(e) {
      e.preventDefault();
      if (isSending) return;

      const message = chatInput.value.trim();
      if (!message) return;

      // User message
      appendMessage('user', message);
      chatInput.value = '';
      chatInput.focus();
      isSending = true;

      const thinkingId = appendThinking();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch('http://localhost:3000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // ✅ Safe JSON with fallback
        const text = await response.text();
        let data;
        
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error('Invalid JSON from server');
        }

        removeElement(thinkingId);

        if (response.ok && data?.reply) {
          appendMessage('assistant', data.reply);
        } else {
          appendMessage('assistant', `❌ ${data?.error || 'Server error'}`);
        }
      } catch (error) {
        console.error('Request failed:', error);
        removeElement(thinkingId);
        
        const errorMsg = error.name === 'AbortError' 
          ? 'Timeout (10s)' 
          : error.message.includes('fetch') 
          ? 'Server offline' 
          : 'Connection error';
          
        appendMessage('assistant', `❌ ${errorMsg}`);
      } finally {
        isSending = false;
      }
    }

    function handleEnter(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        sendMessage(e);
      }
    }

    function appendMessage(type, text) {
      const div = createMessageEl(type, text);
      chatMessages.appendChild(div);
      scrollToBottom();
    }

    function appendThinking() {
      const id = `thinking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const div = createMessageEl('assistant', '🤔 Thinking...');
      div.id = id;
      chatMessages.appendChild(div);
      scrollToBottom();
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

    function scrollToBottom() {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // ✅ Safe DOM ready detection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

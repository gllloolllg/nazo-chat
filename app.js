(function () {
  const config = window.APP_CONFIG;
  const params = new URLSearchParams(window.location.search);
  const roomId = params.get('room') || 'demo-room';
  const deviceId = getOrCreateDeviceId();

  const messageListEl = document.getElementById('messageList');
  const draftAreaEl = document.getElementById('draftArea');
  const sendBtnEl = document.getElementById('sendBtn');
  const tabRowEl = document.getElementById('tabRow');
  const wordGridEl = document.getElementById('wordGrid');
  const memoDialogEl = document.getElementById('memoDialog');
  const memoTargetEl = document.getElementById('memoTarget');
  const memoInputEl = document.getElementById('memoInput');
  const saveMemoBtnEl = document.getElementById('saveMemoBtn');
  const closeMemoBtnEl = document.getElementById('closeMemoBtn');

  const state = {
    activeGenreId: config.genres[0].id,
    draft: [],
    messages: [],
    messageIds: new Set(),
    notes: loadNotes(),
    currentMemoToken: null,
    lastSeenMessageId: 0,
    pollHandle: null,
    assignedSlot: null,
    sending: false,
    isInitialLoading: true
  };

  init();

  function init() {
    renderTabs();
    renderWordGrid();
    renderDraft();
    renderLoading();
    bindEvents();
    fetchMessages();
    state.pollHandle = window.setInterval(fetchMessages, config.pollIntervalMs);
  }

  function bindEvents() {
    sendBtnEl.addEventListener('click', sendDraft);
    saveMemoBtnEl.addEventListener('click', saveMemo);
    closeMemoBtnEl.addEventListener('click', function () {
      memoDialogEl.close();
    });
  }

  function renderLoading() {
    messageListEl.innerHTML = ''
      + '<div class="loading">'
      + '  <div class="spinner"></div>'
      + '</div>';
  }

  function renderTabs() {
    tabRowEl.innerHTML = '';
    config.genres.forEach(function (genre) {
      const button = document.createElement('button');
      button.className = 'tab-button ' + (genre.id === state.activeGenreId ? 'active' : '');
      button.type = 'button';
      button.textContent = genre.label;
      button.addEventListener('click', function () {
        state.activeGenreId = genre.id;
        renderTabs();
        renderWordGrid();
      });
      tabRowEl.appendChild(button);
    });
  }

  function renderWordGrid() {
    wordGridEl.innerHTML = '';
    const genre = config.genres.find(function (item) {
      return item.id === state.activeGenreId;
    });
    if (!genre) return;

    genre.words.forEach(function (word) {
      const button = document.createElement('button');
      button.className = 'word-button';
      button.type = 'button';
      button.textContent = word.label;
      button.addEventListener('click', function () {
        if (state.draft.length >= config.maxDraftTokens) return;
        state.draft.push(word);
        renderDraft();
      });
      wordGridEl.appendChild(button);
    });
  }

  function renderDraft() {
    draftAreaEl.innerHTML = '';

    if (!state.draft.length) {
      const empty = document.createElement('span');
      empty.className = 'empty';
      empty.textContent = '単語を選択';
      draftAreaEl.appendChild(empty);
    } else {
      state.draft.forEach(function (word, index) {
        const chip = document.createElement('span');
        chip.className = 'token-main';
        chip.textContent = word.label;

        const removeButton = document.createElement('button');
        removeButton.className = 'remove-token';
        removeButton.type = 'button';
        removeButton.textContent = '×';
        removeButton.disabled = state.sending;
        removeButton.addEventListener('click', function () {
          if (state.sending) return;
          state.draft.splice(index, 1);
          renderDraft();
        });

        chip.appendChild(removeButton);
        draftAreaEl.appendChild(chip);
      });
    }

    sendBtnEl.disabled = state.sending || !state.draft.length;
  }

  function renderMessages(shouldScroll) {
    messageListEl.innerHTML = '';

    if (!state.messages.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'まだメッセージはありません';
      messageListEl.appendChild(empty);
      return;
    }

    state.messages.forEach(function (message) {
      messageListEl.appendChild(createMessageRow(message));
    });

    if (shouldScroll) {
      scrollToLatestMessage();
    }
  }

  function createMessageRow(message) {
    const isSelf = !!message.isSelf;
    const row = document.createElement('div');
    row.className = 'message-row ' + (isSelf ? 'self' : 'other');
    row.dataset.messageId = String(message.id);

    const bubble = document.createElement('div');
    bubble.className = 'bubble' + (message.pending ? ' pending' : '');

    const tokenWrap = document.createElement('div');
    tokenWrap.className = 'tokens';

    (message.tokens || []).forEach(function (token) {
      const tokenEl = document.createElement(isSelf ? 'span' : 'button');
      tokenEl.className = ('token ' + (isSelf ? '' : 'noteable')).trim();

      if (!isSelf) {
        tokenEl.type = 'button';
        tokenEl.addEventListener('click', function () {
          openMemoDialog(token.surface);
        });
      }

      const ruby = document.createElement('span');
      ruby.className = 'token-ruby';
      ruby.textContent = isSelf ? '' : (state.notes[token.surface] || '');
      if (!ruby.textContent) {
        ruby.style.display = 'none';
      }

      const main = document.createElement('span');
      main.className = 'token-main';
      main.textContent = token.surface;

      tokenEl.appendChild(ruby);
      tokenEl.appendChild(main);
      tokenWrap.appendChild(tokenEl);
    });

    const time = document.createElement('div');
    time.className = 'time ' + (isSelf ? 'time-self' : 'time-other');
    time.textContent = formatTime(message.createdAt);

    bubble.appendChild(tokenWrap);

    if (isSelf) {
      row.appendChild(time);
      row.appendChild(bubble);
    } else {
      row.appendChild(bubble);
      row.appendChild(time);
    }

    return row;
  }

  function scrollToLatestMessage() {
    window.requestAnimationFrame(function () {
      messageListEl.scrollTop = messageListEl.scrollHeight;
    });
  }

  function openMemoDialog(surface) {
    state.currentMemoToken = surface;
    memoTargetEl.textContent = surface;
    memoInputEl.value = state.notes[surface] || '';
    memoDialogEl.showModal();

    setTimeout(function () {
      memoInputEl.focus();
      memoInputEl.setSelectionRange(
        memoInputEl.value.length,
        memoInputEl.value.length
      );
    }, 50);
  }

  function saveMemo() {
    if (!state.currentMemoToken) return;

    const value = memoInputEl.value.trim();

    if (!value) {
      delete state.notes[state.currentMemoToken];
    } else {
      state.notes[state.currentMemoToken] = value;
    }

    persistNotes();
    memoDialogEl.close();
    renderMessages(false);
  }

  async function sendDraft() {
    if (!state.draft.length) return;
    if (state.sending) return;

    state.sending = true;
    renderDraft();

    const draftWords = state.draft.slice();

    const optimisticMessage = {
      id: 'local_' + Date.now(),
      isSelf: true,
      tokens: draftWords.map(function (word) {
        return {
          wordId: word.id,
          surface: word.label
        };
      }),
      createdAt: new Date().toISOString(),
      pending: true
    };

    state.messages.push(optimisticMessage);
    renderMessages(true);

    state.draft = [];
    renderDraft();

    try {
      const response = await jsonpRequest({
        action: 'sendMessage',
        roomId: roomId,
        deviceId: deviceId,
        wordIds: draftWords.map(function (word) { return word.id; }).join(',')
      });

      if (!response || !response.ok) {
        throw new Error(response && response.error ? response.error : 'Send failed');
      }

      state.assignedSlot = response.playerSlot || state.assignedSlot;

      const index = state.messages.findIndex(function (m) {
        return m.id === optimisticMessage.id;
      });

      if (response.message) {
        if (index !== -1) {
          state.messages[index] = response.message;
        } else if (!state.messageIds.has(response.message.id)) {
          state.messages.push(response.message);
        }
        state.messageIds.add(response.message.id);
        state.lastSeenMessageId = Math.max(
          Number(state.lastSeenMessageId || 0),
          Number(response.message.id || 0)
        );
        renderMessages(true);
      } else {
        state.messages = state.messages.filter(function (m) {
          return m.id !== optimisticMessage.id;
        });
        renderMessages(false);
      }
    } catch (err) {
      console.error(err);
      state.messages = state.messages.filter(function (m) {
        return m.id !== optimisticMessage.id;
      });
      renderMessages(false);
      alert('送信に失敗しました');
    } finally {
      state.sending = false;
      renderDraft();
    }
  }

  function fetchMessages() {
    jsonpRequest({
      action: 'getMessages',
      roomId: roomId,
      deviceId: deviceId,
      afterId: String(state.lastSeenMessageId || 0)
    })
      .then(function (response) {
        if (!response || !response.ok) {
          throw new Error(response && response.error ? response.error : 'Unknown error');
        }

        if (response.playerSlot) {
          state.assignedSlot = response.playerSlot;
        }

        let hasNewMessages = false;

        if (Array.isArray(response.messages) && response.messages.length) {
          response.messages.forEach(function (message) {
            if (!state.messageIds.has(message.id)) {
              state.messages.push(message);
              state.messageIds.add(message.id);
              hasNewMessages = true;
            }
            state.lastSeenMessageId = Math.max(
              Number(state.lastSeenMessageId || 0),
              Number(message.id || 0)
            );
          });
        }

        if (hasNewMessages) {
          renderMessages(true);
        } else if (state.isInitialLoading) {
          renderMessages(false);
        }

        state.isInitialLoading = false;
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  function jsonpRequest(queryParams) {
    return new Promise(function (resolve, reject) {
      const callbackName = 'jsonp_callback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
      const url = new URL(config.apiBaseUrl);

      Object.keys(queryParams).forEach(function (key) {
        url.searchParams.set(key, queryParams[key]);
      });
      url.searchParams.set('prefix', callbackName);
      url.searchParams.set('_ts', String(Date.now()));

      const script = document.createElement('script');
      const timeout = window.setTimeout(function () {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, 12000);

      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      window[callbackName] = function (data) {
        cleanup();
        resolve(data);
      };

      script.onerror = function () {
        cleanup();
        reject(new Error('JSONP load failed'));
      };

      script.src = url.toString();
      document.body.appendChild(script);
    });
  }

  function loadNotes() {
    try {
      const raw = localStorage.getItem(notesStorageKey());
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.error(error);
      return {};
    }
  }

  function persistNotes() {
    localStorage.setItem(notesStorageKey(), JSON.stringify(state.notes));
  }

  function notesStorageKey() {
    return 'lingualink_notes_' + roomId + '_' + deviceId;
  }

  function getOrCreateDeviceId() {
    const storageKey = 'lingualink_device_id';
    let current = localStorage.getItem(storageKey);
    if (!current) {
      current = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(storageKey, current);
    }
    return current;
  }

  function formatTime(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }
})();

window.APP_CONFIG = {
  // GAS のウェブアプリ URL を設定
  apiBaseUrl: 'https://script.google.com/macros/s/AKfycbyRtgGPO5CUeUq9jkVcVe_muaIp4Eb5kEHP4rxTEa1TReYItpw5qci_GJ97c_qhPTxd/exec',

  // URL 例: ?room=demo-room&player=A
  pollIntervalMs: 400000,
  maxDraftTokens: 8,

  genres: [
    {
      id: 'basic',
      label: '基本',
      words: [
        { id: 'ok', label: 'OK' },
        { id: 'no', label: 'NO' },
        { id: 'this', label: 'これ' },
        { id: 'that', label: 'それ' },
        { id: 'same', label: '同じ' },
        { id: 'diff', label: '違う' },
        { id: 'di', label: 'じぇじぇじぇ' }
      ]
    },
    {
      id: 'direction',
      label: '方向',
      words: [
        { id: 'up', label: '上' },
        { id: 'down', label: '下' },
        { id: 'left', label: '左' },
        { id: 'right', label: '右' },
        { id: 'go', label: '進む' },
        { id: 'stop', label: '止まる' }
      ]
    },
    {
      id: 'objects',
      label: '対象',
      words: [
        { id: 'human', label: '人' },
        { id: 'animal', label: '動物' },
        { id: 'ship', label: '宇宙船' },
        { id: 'door', label: '扉' },
        { id: 'danger', label: '危険' },
        { id: 'safe', label: '安全' }
      ]
    }
  ]
};

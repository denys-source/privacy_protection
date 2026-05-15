chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action !== 'updateBadge') return;

  const tabId = sender.tab?.id;
  if (!tabId) return;

  const text = msg.count > 0 ? String(msg.count) : '';
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color: '#E53E3E', tabId });
});

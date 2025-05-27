// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 获取当前快捷键设置
  chrome.runtime.sendMessage({ action: 'getShortcut' }, (response) => {
    if (response && response.shortcut) {
      document.getElementById('currentShortcut').textContent = response.shortcut;
      document.getElementById('shortcutDisplay').textContent = response.shortcut;
    }
  });
  
  // 修改快捷键按钮点击事件
  document.getElementById('changeShortcutBtn').addEventListener('click', function() {
    // 打开Chrome扩展管理页面的快捷键设置
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });
});

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 可以在这里处理其他消息
});
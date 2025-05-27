// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === 'trigger-word-context') {
    // 向当前活动标签页发送消息
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'triggerWordContext' });
      }
    });
  }
});

// 扩展安装或启动时的初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('Word Context Helper 扩展已安装');
});

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getShortcut') {
    // 获取当前快捷键设置
    chrome.commands.getAll((commands) => {
      const shortcut = commands.find(cmd => cmd.name === 'trigger-word-context');
      sendResponse({ shortcut: shortcut ? shortcut.shortcut : 'F9' });
    });
    return true; // 异步响应
  }
});
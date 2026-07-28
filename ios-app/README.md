# 极简待办 iOS

这是现有网页应用的 Capacitor iOS 容器。业务代码仍以仓库根目录的
`index.html` 为唯一来源，构建时生成 App 专用资源。

## 本地准备

- Node.js 20+
- macOS 与 Xcode（生成的 iOS 工程只能在 macOS 上编译和签名）
- CocoaPods

## 构建

```bash
npm install
npm run sync:ios
npm run open:ios
```

首次在 Supabase 控制台的 Authentication / URL Configuration 中加入：

```text
jijiandaiban://auth/callback
```

在 Xcode 中选择开发团队和真机后即可运行。通过 TestFlight 分享给朋友时，
需要 Apple Developer Program 会员。


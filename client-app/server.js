const path = require('path');
const express = require('express');
const basicAuth = require('express-basic-auth');

const correctUserName = "rinkane";
const correctPassword = "rinkane";

// サーバをインスタンス化する
const app = express();

// 以下の設定だけで dist/index.html も返せてはいる
app.use(basicAuth({
  challenge: true,
  unauthorizedResponse: () => {
    return "Unauthorized"
  },
  authorizer: (username, password) => {
    const userMatch = basicAuth.safeCompare(username, correctUserName)
    const passMatch = basicAuth.safeCompare(password, correctPassword)

    return userMatch & passMatch
  }
}));
app.use(express.static(`${__dirname}/dist`));

// ルートへのアクセス時は念のため dist/index.html を確実に返すようにしておく
app.get('/', (req, res) => {
  res.sendFile(path.join(`${__dirname}/dist/index.html`));
});

// サーバ起動
const server = app.listen(process.env.PORT || 8080, () => {
  const host = server.address().address;
  const port = server.address().port;
  console.log(`Listening at http://${host}:${port}`);
});

# nginx

## テスト時のデプロイ手順
1. client-appコンテナに入る
2. ng buildで成果物を生成する
3. client-app/dist/client-app 内の成果物を nginx/dist 内に移動する

TODO: ng buildしただけで nginxに成果物がデプロイされるようにしたい…
バインドマウントで色々試してみたけど上手く反映されなかったり、
ng buildが出力先のディレクトリがロックされてて実行できなかったりでイマイチ上手くいかなかった
注意文件目录；
本wallet-monitor目录要和The browser wallet URL of account [address].txt这些文件放在同一级。

  本地模式（直接打开HTML）：
  1. 运行 generate_config.bat或者generate_config.sh 生成 wallet_config.js
  2. 直接在浏览器中打开 wallet_monitor_auto.html
  3. 会自动加载本地配置并直接连接钱包端口

  API模式（服务器模式）：
  1. 运行 npm install  
  2. 运行 npm start 启动服务器
  3. 访问 http://localhost:8099
  4. 使用API接口获取数据，功能更完整

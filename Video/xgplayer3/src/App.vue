<template>
  <div class="app-container">
    <div id="mse"></div>
    <APlayer/>
  </div>
</template>

<script setup lang="ts">
import APlayer from "./a.vue"
import Player from 'xgplayer';
import FlvPlugin from 'xgplayer-flv'
import 'xgplayer/dist/index.min.css';

setTimeout(() => {
  let player = new Player({
    id: 'mse',
    
    // 西瓜播放器的视频
    // url: 'http://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/flv/xgplayer-demo-720p.flv',
    
    // 本地
    // url: '../public/flv/202512241446_aac.flv',

    // go flv-live-server 起的服务
    url:'http://localhost:8080/live.flv',
    // isLive: true,

    height: '200px',
    width: '200px',
    plugins: [FlvPlugin],
  });


}, 3000);





</script>


<style>
html,
#app,
body {
  height: 100vh;
  height: 100vw;
}

.app-container {
  width: 100%;
  height: 100%;
}
</style>
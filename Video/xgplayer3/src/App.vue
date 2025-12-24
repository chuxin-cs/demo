<template>
  <div class="app-container">
    <div id="mse1"></div>
    <div id="mse2"></div>
    <div id="mse3"></div>
    <div id="mse4"></div>
    <div id="mse5"></div>
    <div id="mse6"></div>
    <div id="mse7"></div>
    <div id="mse8"></div>
    <div id="mse9"></div>
    <div id="mse10"></div>
    <div id="mse11"></div>
    <div id="mse12"></div>
    <div id="mse13"></div>
    <div id="mse14"></div>
    <div id="mse15"></div>
    <div id="mse16"></div>
    <!-- <APlayer/> -->
  </div>
</template>

<script setup lang="ts">
// import APlayer from "./a.vue"
import Player from 'xgplayer';
import 'xgplayer/dist/index.min.css';

import FlvPlugin from 'xgplayer-flv'
import HlsPlugin from 'xgplayer-hls'


// flv的格式在10多个宫格中会出现卡顿 我现在测试一下 hls
setTimeout(() => {
  let player = new Player({
    id: 'mse1',
    
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


}, 30000000);


setTimeout(() => {
  play("mse1")
  play("mse2")
  play("mse3")
  play("mse4")
  play("mse5")
  play("mse6")
  play("mse7")
  play("mse8")
  play("mse9")
  play("mse10")
  play("mse11")
  play("mse12")
  play("mse13")
  play("mse14")
  play("mse15")
  play("mse16")
}, 3000);


function play(id){
  new Player({
    id,
    url:'http://127.0.0.1:8888/live/test/index.m3u8',
    height: '200px',
    width: '200px',
    plugins: [FlvPlugin,HlsPlugin],
  });
}




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
.app-container > div{
  display: inline-block;
}
</style>